import { isoNow, makeId } from '../lib/utils/id';
import { pick, roll } from '../lib/utils/rng';
import type { ActiveInterception, GlobalGameState, InterceptionStance } from '../types/game';

function buildInterception(state: GlobalGameState, routeId: string, destinationNodeId: string, stakes: number): ActiveInterception {
  const route = state.map_routes.find((entry) => entry.id === routeId);
  const routePatrol = route?.patrol_pressure ?? 25;
  const rivalNearby = state.rivals.some((rival) => rival.node_id === destinationNodeId);
  const type =
    rivalNearby ? 'rival_raiders'
    : route?.access === 'smuggler' ? 'smuggler_ambush'
    : route?.access === 'permit' ? 'border_patrol'
    : 'warband';

  return {
    id: makeId('ix'),
    route_id: routeId,
    destination_node_id: destinationNodeId,
    type,
    enemy_power: Math.max(50, Math.round(routePatrol * 1.6 + stakes * 0.6)),
    stakes,
    delay_days: Math.max(1, Math.round((routePatrol + stakes) / 40)),
    discovered: roll(0.55 + state.company.scouting_level * 0.04)
  };
}

export function maybeCreateInterception(state: GlobalGameState, routeId: string, destinationNodeId: string, chance: number, stakes: number) {
  if (state.active_interception || !roll(chance)) return state;
  const encounter = buildInterception(state, routeId, destinationNodeId, stakes);
  return {
    ...state,
    active_interception: encounter,
    chronicle: [
      `Interception forming on the route: ${encounter.type.replace('_', ' ')} threaten the road to ${state.map_nodes.find((node) => node.id === destinationNodeId)?.name ?? 'the destination'}.`,
      ...state.chronicle
    ].slice(0, 80)
  };
}

export function resolveInterception(state: GlobalGameState, stance: InterceptionStance): GlobalGameState {
  const interception = state.active_interception;
  if (!interception) return state;

  const squadPower = state.mercenaries.filter((merc) => merc.alive).reduce((sum, merc) => sum + merc.level * 8 + merc.attack + merc.defense / 2, 0);
  const stanceModifier = {
    breakthrough: 1.05,
    guard_cargo: 0.95,
    withdraw: 0.82,
    counter_ambush: interception.discovered ? 1.12 : 0.9
  }[stance];
  const score = squadPower * stanceModifier;
  const success = score >= interception.enemy_power;

  let next = state;
  if (stance === 'withdraw') {
    next = {
      ...next,
      travel_order: null,
      active_travel: null,
      company: {
        ...next.company,
        supplies: Math.max(0, next.company.supplies - 4),
        updated_at: isoNow()
      }
    };
  } else if (success) {
    next = {
      ...next,
      company: {
        ...next.company,
        gold: next.company.gold + Math.round(interception.stakes / 2),
        ammunition: Math.max(0, next.company.ammunition - 3),
        updated_at: isoNow()
      },
      mercenaries: next.mercenaries.map((merc) =>
        merc.alive
          ? {
              ...merc,
              fatigue: Math.min(100, merc.fatigue + 3),
              updated_at: isoNow()
            }
          : merc
      )
    };
  } else {
    next = {
      ...next,
      company: {
        ...next.company,
        supplies: Math.max(0, next.company.supplies - 8),
        gold: Math.max(0, next.company.gold - Math.round(interception.stakes / 2)),
        ammunition: Math.max(0, next.company.ammunition - 5),
        updated_at: isoNow()
      },
      active_travel: next.active_travel
        ? { ...next.active_travel, total_days: next.active_travel.total_days + interception.delay_days }
        : next.active_travel,
      mercenaries: next.mercenaries.map((merc) =>
        merc.alive
          ? {
              ...merc,
              hp: Math.max(1, merc.hp - Math.max(1, Math.round(interception.enemy_power / 30))),
              fatigue: Math.min(100, merc.fatigue + 6),
              updated_at: isoNow()
            }
          : merc
      )
    };
  }

  return {
    ...next,
    active_interception: null,
    chronicle: [
      `Interception resolved by ${stance.replace('_', ' ')}: ${success ? 'the company breaks through.' : stance === 'withdraw' ? 'the company abandons the route and withdraws.' : 'the company is bloodied and delayed.'}`,
      ...next.chronicle
    ].slice(0, 80)
  };
}
