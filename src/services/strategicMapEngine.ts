import { isoNow, makeId } from '../lib/utils/id';
import { roll } from '../lib/utils/rng';
import type { ActiveTravel, GlobalGameState, JourneyIncidentChoice, MapNode, MapRoute, TravelMode, TravelOrder } from '../types/game';
import { maybeCreateInterception } from './interceptionEngine';
import { runWorldTick } from './worldTickEngine';

const speedByMode: Record<TravelMode, number> = {
  foot: 1,
  horses: 1.7,
  wagon: 0.8,
  river_barge: 1.35,
  coastal_ship: 1.55,
  forced_march: 1.95,
  stealth_column: 0.72,
  guided_route: 1.25
};

const suppliesByMode: Record<TravelMode, number> = {
  foot: 3,
  horses: 5,
  wagon: 6,
  river_barge: 4,
  coastal_ship: 5,
  forced_march: 6,
  stealth_column: 4,
  guided_route: 5
};

const fatigueByMode: Record<TravelMode, number> = {
  foot: 5,
  horses: 3,
  wagon: 2,
  river_barge: 2,
  coastal_ship: 2,
  forced_march: 9,
  stealth_column: 6,
  guided_route: 4
};

function weatherSpeedModifier(state: GlobalGameState, route: MapRoute, mode: TravelMode) {
  if (state.weather === 'storm' && route.terrain === 'coast') return 0.55;
  if (state.weather === 'freeze' && route.terrain === 'river') return 0.5;
  if (state.weather === 'rain' && (route.terrain === 'swamp' || route.terrain === 'road')) return 0.78;
  if (state.weather === 'fog' && mode === 'stealth_column') return 1.08;
  if (state.weather === 'heatwave' && (mode === 'foot' || mode === 'forced_march')) return 0.7;
  return 1;
}

export function estimateRouteInterceptionRisk(state: GlobalGameState, route: MapRoute, mode: TravelMode) {
  const patrolRisk = (route.patrol_pressure ?? 0) / 180;
  const rivalRisk = state.rivals.some((rival) => rival.node_id === route.from || rival.node_id === route.to) ? 0.12 : 0;
  const smugglerRisk = route.access === 'smuggler' ? route.smuggling_risk ?? 0.15 : 0;
  const protectedByPost =
    state.forward_posts.some((post) => post.node_id === route.from || post.node_id === route.to) ? 0.08 : 0;
  return Math.max(
    0.05,
    Math.min(
      0.88,
      route.risk + patrolRisk + rivalRisk + smugglerRisk + (mode === 'forced_march' ? 0.16 : 0) - (mode === 'stealth_column' ? 0.1 : 0) - protectedByPost
    )
  );
}

export function estimateRouteSuppliesCost(route: MapRoute, mode: TravelMode) {
  return suppliesByMode[mode] * Math.max(1, route.distance);
}

export function getMapNode(state: GlobalGameState, nodeId: string) {
  return state.map_nodes.find((node) => node.id === nodeId) ?? null;
}

export function getConnectedRoutes(state: GlobalGameState, nodeId: string) {
  return state.map_routes.filter((route) => (route.from === nodeId || route.to === nodeId) && (!route.hidden || route.discovered));
}

export function getTravelDestination(route: MapRoute, nodeId: string) {
  return route.from === nodeId ? route.to : route.from;
}

export function estimateTravelDays(route: MapRoute, mode: TravelMode) {
  return Math.max(1, Math.ceil(route.distance / speedByMode[mode]));
}

export function estimateTravelDaysForState(state: GlobalGameState, route: MapRoute, mode: TravelMode) {
  return Math.max(1, Math.ceil(route.distance / (speedByMode[mode] * weatherSpeedModifier(state, route, mode))));
}

export function estimateTravelOrderDays(state: GlobalGameState, order: TravelOrder | null) {
  if (!order) return null;
  return order.route_ids.reduce((sum, routeId) => {
    const route = state.map_routes.find((entry) => entry.id === routeId);
    return route ? sum + estimateTravelDaysForState(state, route, order.mode) : sum;
  }, 0);
}

function hasRouteAccess(state: GlobalGameState, route: MapRoute, mode: TravelMode) {
  if (route.weather_locked) return false;
  if (route.access === 'legal') return true;
  if (route.access === 'permit') {
    const fromNode = getMapNode(state, route.from);
    const toNode = getMapNode(state, route.to);
    return state.company.permits.includes(fromNode?.region_id ?? '') || state.company.permits.includes(toNode?.region_id ?? '') || mode === 'guided_route';
  }
  return mode === 'stealth_column' || mode === 'guided_route';
}

function createTravelLeg(state: GlobalGameState, routeId: string, mode: TravelMode): ActiveTravel | null {
  const route = state.map_routes.find((entry) => entry.id === routeId);
  if (!route) return null;
  if (!route.travel_modes.includes(mode)) return null;
  if (!hasRouteAccess(state, route, mode)) return null;
  if (route.from !== state.company_node_id && route.to !== state.company_node_id) return null;

  const totalDays = estimateTravelDaysForState(state, route, mode);
  return {
    route_id: route.id,
    from_node_id: state.company_node_id,
    to_node_id: getTravelDestination(route, state.company_node_id),
    mode,
    progress_days: 0,
    total_days: totalDays,
    risk: route.risk,
    supplies_cost: suppliesByMode[mode],
    fatigue_cost: fatigueByMode[mode],
    started_day: state.day
  };
}

export function beginTravel(state: GlobalGameState, routeId: string, mode: TravelMode): GlobalGameState {
  if (state.active_travel) return state;
  const nextTravel = createTravelLeg(state, routeId, mode);
  if (!nextTravel) return state;

  const destination = getMapNode(state, nextTravel.to_node_id);

  return {
    ...state,
    active_travel: nextTravel,
    chronicle: [
      `The company departs ${getMapNode(state, state.company_node_id)?.name ?? 'camp'} for ${destination?.name ?? 'unknown territory'} by ${mode.replace('_', ' ')}.`,
      ...state.chronicle
    ].slice(0, 80)
  };
}

export function plotTravelPlan(state: GlobalGameState, targetNodeId: string, mode: TravelMode) {
  if (state.company_node_id === targetNodeId) return [];

  const queue: Array<{ nodeId: string; score: number; routeIds: string[] }> = [{ nodeId: state.company_node_id, score: 0, routeIds: [] }];
  const best = new Map<string, number>([[state.company_node_id, 0]]);

  while (queue.length > 0) {
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift();
    if (!current) break;
    if (current.nodeId === targetNodeId) return current.routeIds;

    for (const route of getConnectedRoutes(state, current.nodeId)) {
      if (!route.travel_modes.includes(mode)) continue;
      if (!hasRouteAccess(state, route, mode)) continue;
      const nextNodeId = getTravelDestination(route, current.nodeId);
      const nextScore = current.score + estimateTravelDaysForState(state, route, mode) + route.risk * 2 + (route.patrol_pressure ?? 0) / 30;
      if (nextScore >= (best.get(nextNodeId) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(nextNodeId, nextScore);
      queue.push({ nodeId: nextNodeId, score: nextScore, routeIds: [...current.routeIds, route.id] });
    }
  }

  return [] as string[];
}

export function createTravelOrder(state: GlobalGameState, targetNodeId: string, mode: TravelMode): TravelOrder | null {
  const routeIds = plotTravelPlan(state, targetNodeId, mode);
  if (routeIds.length === 0) return null;
  return {
    target_node_id: targetNodeId,
    mode,
    route_ids: routeIds
  };
}

export function beginTravelOrder(state: GlobalGameState, targetNodeId: string, mode: TravelMode): GlobalGameState {
  if (state.active_travel) return state;
  const order = createTravelOrder(state, targetNodeId, mode);
  if (!order) return state;

  const [firstLeg, ...remainingLegs] = order.route_ids;
  const next = beginTravel(state, firstLeg, mode);
  return {
    ...next,
    travel_order: {
      ...order,
      route_ids: remainingLegs
    }
  };
}

function applyTravelWear(state: GlobalGameState, travel: ActiveTravel) {
  const livingMercs = state.mercenaries.filter((merc) => merc.alive).length;
  const cargoLoad =
    livingMercs * 6 +
    state.company.supplies +
    state.company.ammunition * 0.4 +
    state.company.medicine * 0.6 +
    state.company.trade_goods * 4;
  const overloaded = cargoLoad > state.company.cargo_capacity + state.company.pack_animals * 18;
  return {
    ...state,
    company: {
      ...state.company,
      supplies: Math.max(0, state.company.supplies - travel.supplies_cost),
      ammunition: Math.max(0, state.company.ammunition - Math.max(0, Math.round(livingMercs / 8))),
      medicine: Math.max(0, state.company.medicine - (overloaded ? 1 : 0)),
      updated_at: isoNow()
    },
    mercenaries: state.mercenaries.map((merc) =>
      merc.alive
        ? {
            ...merc,
            fatigue: Math.min(100, merc.fatigue + travel.fatigue_cost + (overloaded ? 2 : 0)),
            updated_at: isoNow()
          }
        : merc
    )
  };
}

function maybeCreateJourneyIncident(state: GlobalGameState, travel: ActiveTravel, destination: MapNode | null, route: MapRoute | undefined) {
  if (state.active_journey_incident || state.active_interception) return state;
  const incidentRisk =
    (route?.risk ?? 0.2) * 0.45 +
    ((route?.patrol_pressure ?? 0) / 100) * 0.18 +
    (travel.mode === 'forced_march' ? 0.16 : 0) +
    (travel.mode === 'stealth_column' ? 0.08 : 0);
  if (!roll(Math.min(0.42, incidentRisk))) return state;

  const title =
    route?.terrain === 'swamp' ? 'Flooded Crossing'
    : route?.terrain === 'mountain' ? 'Broken Ridge March'
    : route?.terrain === 'coast' ? 'Harbor Delay'
    : route?.terrain === 'river' ? 'River Toll Dispute'
    : 'Roadside Incident';
  const description =
    route?.terrain === 'swamp' ? `The path ahead is half drowned and the baggage animals are already starting to bog down before ${destination?.name ?? 'the next marsh post'}.`
    : route?.terrain === 'mountain' ? `A break in the ridge road forces the column to choose between speed, safety and hard labor before ${destination?.name ?? 'the basin below'}.`
    : route?.terrain === 'coast' ? `Pilots, tide labor and chain crews all want a say in who moves first toward ${destination?.name ?? 'the harbor ahead'}.`
    : route?.terrain === 'river' ? `Boatmen and ferrymen are stalling the crossing, and every hour spent arguing makes the convoy more visible.`
    : `Local conditions on the road are turning a simple march into a decision point before ${destination?.name ?? 'the next node'}.`;

  return {
    ...state,
    active_journey_incident: {
      id: makeId('journey'),
      route_id: travel.route_id,
      title,
      description,
      danger: Math.round((destination?.danger ?? 30) + (route?.patrol_pressure ?? 0) / 2),
      delay_days: route?.terrain === 'mountain' ? 2 : 1,
      choices: ['push_on', 'make_camp', 'detour', 'press_guides'] as JourneyIncidentChoice[]
    }
  };
}

export function resolveJourneyIncident(state: GlobalGameState, choice: JourneyIncidentChoice): GlobalGameState {
  const incident = state.active_journey_incident;
  const travel = state.active_travel;
  if (!incident || !incident.choices.includes(choice) || !travel) return state;

  const next: GlobalGameState = {
    ...state,
    active_journey_incident: null
  };

  switch (choice) {
    case 'push_on':
      return {
        ...next,
        company: {
          ...next.company,
          supplies: Math.max(0, next.company.supplies - 4),
          updated_at: isoNow()
        },
        mercenaries: next.mercenaries.map((mercenary) =>
          mercenary.alive
            ? { ...mercenary, fatigue: Math.min(100, mercenary.fatigue + 5), updated_at: isoNow() }
            : mercenary
        ),
        chronicle: [`Journey incident: the company pushes through ${incident.title.toLowerCase()} and keeps the column moving at the cost of exhaustion.`, ...next.chronicle].slice(0, 80)
      };
    case 'make_camp':
      return {
        ...next,
        active_travel: {
          ...travel,
          total_days: travel.total_days + incident.delay_days
        },
        mercenaries: next.mercenaries.map((mercenary) =>
          mercenary.alive
            ? {
                ...mercenary,
                fatigue: Math.max(0, mercenary.fatigue - 4),
                morale: Math.min(100, mercenary.morale + 2),
                updated_at: isoNow()
              }
            : mercenary
        ),
        chronicle: [`Journey incident: the company makes camp during ${incident.title.toLowerCase()}, losing time but keeping the march in order.`, ...next.chronicle].slice(0, 80)
      };
    case 'detour':
      return {
        ...next,
        active_travel: {
          ...travel,
          total_days: travel.total_days + incident.delay_days + 1
        },
        company: {
          ...next.company,
          supplies: Math.max(0, next.company.supplies - 2),
          updated_at: isoNow()
        },
        chronicle: [`Journey incident: the company detours around ${incident.title.toLowerCase()}, trading time for a cleaner road.`, ...next.chronicle].slice(0, 80)
      };
    case 'press_guides':
    default:
      return {
        ...next,
        company: {
          ...next.company,
          gold: Math.max(0, next.company.gold - Math.max(12, Math.round(incident.danger / 8))),
          updated_at: isoNow()
        },
        chronicle: [`Journey incident: extra coin and harsh words force local guides to clear ${incident.title.toLowerCase()} before the column.`, ...next.chronicle].slice(0, 80)
      };
  }
}

function applyTravelEvent(state: GlobalGameState, travel: ActiveTravel, destination: MapNode | null) {
  const route = state.map_routes.find((entry) => entry.id === travel.route_id);
  state = maybeCreateJourneyIncident(state, travel, destination, route);
  if (state.active_journey_incident) return state;
  const routeLabel = route ? `${route.terrain} road` : 'frontier track';
  const patrolRisk = (route?.patrol_pressure ?? 0) / 180;
  const rivalRisk = state.rivals.some((rival) => rival.node_id === travel.to_node_id || rival.node_id === travel.from_node_id) ? 0.12 : 0;
  const smugglerRisk = route?.access === 'smuggler' ? route.smuggling_risk ?? 0.15 : 0;
  const protectedByPost =
    state.forward_posts.some((post) => post.node_id === travel.from_node_id || post.node_id === travel.to_node_id) ? 0.08 : 0;
  const encounterRisk = Math.min(
    0.88,
    travel.risk + patrolRisk + rivalRisk + smugglerRisk + (travel.mode === 'forced_march' ? 0.16 : 0) - (travel.mode === 'stealth_column' ? 0.1 : 0) - protectedByPost
  );
  if (!roll(encounterRisk * 0.45)) return state;

  const danger = destination?.danger ?? 40;
  const interceptionChance = Math.min(0.65, encounterRisk * 0.7);
  state = maybeCreateInterception(state, travel.route_id, travel.to_node_id, interceptionChance, Math.round(danger + (route?.patrol_pressure ?? 0)));
  if (state.active_interception) return state;
  if (state.company.travel_policy === 'bribe') {
    return {
      ...state,
      company: {
        ...state.company,
        gold: Math.max(0, state.company.gold - Math.max(12, Math.round((route?.patrol_pressure ?? 20) / 2))),
        supplies: Math.max(0, state.company.supplies - 5),
        updated_at: isoNow()
      },
      chronicle: [`Interception on the ${routeLabel}: the company pays guides, ferrymen and the wrong guards to keep moving toward ${destination?.name ?? 'the next node'}.`, ...state.chronicle].slice(0, 80)
    };
  }

  if (state.company.travel_policy === 'fight') {
    return {
      ...state,
      mercenaries: state.mercenaries.map((merc) =>
        merc.alive
          ? {
              ...merc,
              hp: Math.max(1, merc.hp - Math.max(2, Math.round(danger / 14))),
              fatigue: Math.min(100, merc.fatigue + 5),
              updated_at: isoNow()
            }
          : merc
      ),
      company: {
        ...state.company,
        ammunition: Math.max(0, state.company.ammunition - 4),
        updated_at: isoNow()
      },
      chronicle: [`Interception on the ${routeLabel}: a hard skirmish breaks across the march line before the company claws through toward ${destination?.name ?? 'the frontier'}.`, ...state.chronicle].slice(0, 80)
    };
  }

  if (roll(0.33) || state.company.travel_policy === 'evade') {
    return {
      ...state,
      company: {
        ...state.company,
        supplies: Math.max(0, state.company.supplies - Math.max(2, Math.round(danger / 12))),
        updated_at: isoNow()
      },
      active_travel: {
        ...travel,
        total_days: travel.total_days + 1
      },
      chronicle: [`Travel event: raiders spill out along the ${routeLabel} and cut at the baggage train bound for ${destination?.name ?? 'the frontier'}.`, ...state.chronicle].slice(0, 80)
    };
  }

  if (roll(0.5)) {
    return {
      ...state,
      mercenaries: state.mercenaries.map((merc) =>
        merc.alive
          ? {
              ...merc,
              fatigue: Math.min(100, merc.fatigue + 4),
              morale: Math.max(0, merc.morale - 2),
              updated_at: isoNow()
          }
        : merc
      ),
      chronicle: [`Travel event: foul weather turns the ${routeLabel} into a crawling line of mud, smoke and shouted orders on the way to ${destination?.name ?? 'the frontier'}.`, ...state.chronicle].slice(0, 80)
    };
  }

  return {
    ...state,
    company: {
      ...state.company,
      gold: Math.max(0, state.company.gold - Math.max(8, Math.round(danger / 3))),
      updated_at: isoNow()
    },
    chronicle: [`Travel event: local handlers on the ${routeLabel} demand hard coin, spare rope and patience before opening the way to ${destination?.name ?? 'the next post'}.`, ...state.chronicle].slice(0, 80)
  };
}

export function advanceCampaignDay(input: GlobalGameState): GlobalGameState {
  let state = runWorldTick(input);
  if (state.active_journey_incident) return state;
  const travel = state.active_travel;
  if (!travel) {
    const queued = state.travel_order;
    if (!queued || queued.route_ids.length === 0) return state;
    const [nextLeg, ...remainingLegs] = queued.route_ids;
    const resumed = beginTravel(state, nextLeg, queued.mode);
    return {
      ...resumed,
      travel_order: {
        ...queued,
        route_ids: remainingLegs
      }
    };
  }

  const destination = getMapNode(state, travel.to_node_id);
  state = applyTravelWear(state, travel);
  state = applyTravelEvent(state, travel, destination);
  const progressedTravel = state.active_travel ?? travel;

  const progress = progressedTravel.progress_days + 1;
  if (progress < progressedTravel.total_days) {
    return {
      ...state,
      active_travel: {
        ...progressedTravel,
        progress_days: progress
      }
    };
  }

  const region = state.regions.find((entry) => entry.id === destination?.region_id);
  const post = state.forward_posts.find((entry) => entry.node_id === progressedTravel.to_node_id);
  const postResupply = post ? Math.min(10, post.stash_supplies) : 0;
  const resupplied = destination && destination.market >= 60 ? 8 : 0;

  return {
    ...state,
    company_node_id: progressedTravel.to_node_id,
    active_travel: null,
    travel_order:
      state.travel_order && state.travel_order.route_ids.length === 0 && state.travel_order.target_node_id === progressedTravel.to_node_id
        ? null
        : state.travel_order,
    company: {
      ...state.company,
      supplies: Math.min(180, state.company.supplies + resupplied + postResupply),
      permits:
        destination?.type === 'city' || destination?.type === 'fortress'
          ? Array.from(new Set([...state.company.permits, destination.region_id]))
          : state.company.permits,
      updated_at: isoNow()
    },
    forward_posts: state.forward_posts.map((entry) =>
      entry.node_id === progressedTravel.to_node_id ? { ...entry, stash_supplies: Math.max(0, entry.stash_supplies - postResupply) } : entry
    ),
    chronicle: [
      `The company reaches ${destination?.name ?? 'its destination'} in ${region?.name ?? 'unknown territory'}.`,
      ...state.chronicle
    ].slice(0, 80)
  };
}
