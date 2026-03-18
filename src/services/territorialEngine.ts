import { isoNow } from '../lib/utils/id';
import { pick, roll } from '../lib/utils/rng';
import type { GlobalGameState, MapNode, MapRoute, Region } from '../types/game';

function factionWarPressure(region: Region, state: GlobalGameState) {
  const eventLoad = state.events.filter((event) => event.region_id === region.id && event.active).reduce((sum, event) => sum + event.severity, 0);
  return region.rival_presence * 0.4 + region.threat_pressure * 0.3 + eventLoad * 8 + (100 - region.stability) * 0.18;
}

function frontStateForPressure(pressure: number): Region['front_state'] {
  if (pressure >= 78) return 'siege';
  if (pressure >= 56) return 'conflict';
  if (pressure >= 38) return 'tense';
  return 'stable';
}

function nodePressure(node: MapNode, state: GlobalGameState) {
  const region = state.regions.find((entry) => entry.id === node.region_id);
  const rivalPresence = region?.rival_presence ?? 0;
  const corridorBonus = node.strategic_role === 'corridor' ? 10 : node.strategic_role === 'frontier_keep' ? 14 : node.strategic_role === 'port_gate' ? 12 : 0;
  const rivalsOnNode = state.rivals.filter((rival) => rival.node_id === node.id).length * 12;
  return rivalPresence * 0.35 + node.political_tension * 0.22 + node.danger * 0.18 + corridorBonus + rivalsOnNode;
}

function shiftedControl(route: MapRoute, contestedRegionIds: Set<string>, state: GlobalGameState) {
  const fromNode = state.map_nodes.find((node) => node.id === route.from);
  const toNode = state.map_nodes.find((node) => node.id === route.to);
  const contested = contestedRegionIds.has(fromNode?.region_id ?? '') || contestedRegionIds.has(toNode?.region_id ?? '');
  if (!contested) return route;

  const pressure = Math.max(0, (route.patrol_pressure ?? 0) + 10);
  return {
    ...route,
    patrol_pressure: Math.min(100, pressure),
    control: pressure >= 75 ? 'hostile' : pressure >= 40 ? 'restricted' : route.control,
    access: pressure >= 78 ? 'smuggler' : pressure >= 55 ? 'permit' : route.access
  };
}

export function simulateTerritory(state: GlobalGameState): GlobalGameState {
  const contestedRegionIds = new Set<string>();
  const contestedNodeIds = new Set<string>();

  const regions = state.regions.map((region) => {
    const pressure = factionWarPressure(region, state);
    const rivalCount = state.rivals.filter((rival) => rival.region_focus === region.id).length;
    if (pressure > 58) contestedRegionIds.add(region.id);

    const pressureDelta = pressure > 58 ? 6 + rivalCount * 2 : pressure > 42 ? 2 : -2;
    const prosperityDelta = pressure > 58 ? -5 : pressure > 42 ? -2 : 1;
    const stabilityDelta = pressure > 58 ? -6 : pressure > 42 ? -3 : 1;
    const rivalPresenceDelta = pressure > 58 ? 5 : pressure > 42 ? 2 : -3;

    let factionControl = region.faction_control;
    if (pressure > 78 && roll(0.22)) {
      const rivalFaction = pick(state.factions.filter((faction) => faction.id !== region.faction_control));
      factionControl = rivalFaction.id;
    }

    return {
      ...region,
      faction_control: factionControl,
      front_state: frontStateForPressure(pressure),
      threat_pressure: Math.max(0, Math.min(100, region.threat_pressure + pressureDelta)),
      prosperity: Math.max(0, Math.min(100, region.prosperity + prosperityDelta)),
      stability: Math.max(0, Math.min(100, region.stability + stabilityDelta)),
      rival_presence: Math.max(0, Math.min(100, region.rival_presence + rivalPresenceDelta)),
      updated_at: isoNow()
    };
  });

  const map_nodes = state.map_nodes.map((node) => {
    const pressure = nodePressure(node, { ...state, regions });
    const region = regions.find((entry) => entry.id === node.region_id);
    const front = region?.front_state ?? 'stable';
    const siegeAdd = front === 'siege' ? 2 : front === 'conflict' ? 1 : -1;
    const nextSiegeDays = Math.max(0, node.siege_days + siegeAdd);
    const occupationShift = pressure > 72 ? -8 : pressure > 55 ? -4 : 2;
    const nextOccupation = Math.max(0, Math.min(100, node.occupation + occupationShift));

    let factionControl = node.faction_control;
    if (nextOccupation <= 20 && roll(0.28)) {
      const rivalFaction = pick(state.factions.filter((faction) => faction.id !== node.faction_control));
      factionControl = rivalFaction.id;
      contestedNodeIds.add(node.id);
    } else if (front !== 'stable') {
      contestedNodeIds.add(node.id);
    }

    return {
      ...node,
      faction_control: factionControl,
      occupation: factionControl !== node.faction_control ? 34 : nextOccupation,
      siege_days: nextSiegeDays,
      updated_at: isoNow()
    };
  });

  const map_routes = state.map_routes.map((route) => {
    const shifted = shiftedControl(route, contestedRegionIds, { ...state, map_nodes });
    const fromNode = map_nodes.find((node) => node.id === route.from);
    const toNode = map_nodes.find((node) => node.id === route.to);
    const contestedNode = contestedNodeIds.has(route.from) || contestedNodeIds.has(route.to);
    const splitControl = fromNode && toNode && fromNode.faction_control !== toNode.faction_control;
    if (!contestedNode && !splitControl) return shifted;

    const pressure = Math.min(100, (shifted.patrol_pressure ?? 0) + (splitControl ? 18 : 10));
    return {
      ...shifted,
      patrol_pressure: pressure,
      control: pressure >= 78 ? 'hostile' : pressure >= 45 ? 'restricted' : shifted.control
    };
  });

  const forward_posts = state.forward_posts
    .map((post) => {
      const node = map_nodes.find((entry) => entry.id === post.node_id);
      const region = regions.find((entry) => entry.id === node?.region_id);
      if (!region || !node) return post;
      if ((region.rival_presence > 70 || node.occupation < 35 || node.siege_days > 2) && roll(0.22)) {
        return { ...post, stash_supplies: Math.max(0, post.stash_supplies - 8), guard_rating: Math.max(0, post.guard_rating - 4) };
      }
      return { ...post, stash_supplies: Math.min(40, post.stash_supplies + 2) };
    })
    .filter((post) => post.guard_rating > 0 || post.stash_supplies > 0);

  const contracts = state.contracts.map((contract) => {
    if (contract.status !== 'available') return contract;
    const region = regions.find((entry) => entry.id === contract.region_id);
    const locationNode = map_nodes.find((node) => node.id === contract.location_node_id);
    const extractionNode = map_nodes.find((node) => node.id === contract.extraction_node_id);
    const underSiege = region?.front_state === 'siege';
    const nodeContested = (locationNode?.occupation ?? 100) < 45 || (locationNode?.siege_days ?? 0) > 0;
    return {
      ...contract,
      strategic_value: Math.min(100, contract.strategic_value + (underSiege ? 12 : region?.front_state === 'conflict' ? 5 : 0) + (nodeContested ? 8 : 0)),
      reward_gold: Math.round(contract.reward_gold * (underSiege ? 1.18 : region?.front_state === 'conflict' ? 1.08 : 1) * (nodeContested ? 1.12 : 1)),
      extraction_node_id: underSiege && !contract.extraction_node_id
        ? map_nodes.find((node) => node.region_id === contract.region_id && node.id !== contract.location_node_id)?.id ?? extractionNode?.id
        : contract.extraction_node_id,
      updated_at: isoNow()
    };
  });

  return {
    ...state,
    regions,
    map_nodes,
    map_routes,
    contracts,
    forward_posts,
    chronicle: [
      `Territorial shift: ${contestedNodeIds.size} nodes and ${Array.from(contestedRegionIds).length || 0} regional fronts are under pressure.`,
      ...state.chronicle
    ].slice(0, 80)
  };
}
