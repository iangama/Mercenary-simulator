import { isoNow } from '../lib/utils/id';
import { pick, randInt, roll } from '../lib/utils/rng';
import type { GlobalGameState, RivalCompany } from '../types/game';

function doctrineBias(doctrine: RivalCompany['doctrine']) {
  return {
    Professional: { risk: 0.9, hostility: 1.05, reward: 1 },
    Brutal: { risk: 1.25, hostility: 1.2, reward: 1.2 },
    Opportunistic: { risk: 1.05, hostility: 1.1, reward: 1.1 },
    Noble: { risk: 0.85, hostility: 0.85, reward: 0.95 },
    Fanatical: { risk: 1.35, hostility: 1.3, reward: 1.25 },
    Ruthless: { risk: 1.2, hostility: 1.25, reward: 1.18 }
  }[doctrine];
}

function selectRivalObjective(state: GlobalGameState, rival: RivalCompany) {
  const sameNodeAsPlayer = rival.node_id === state.company_node_id;
  if (sameNodeAsPlayer && rival.hostility_to_player > 45) return 'shadow_player' as const;
  if (state.forward_posts.some((post) => post.node_id === rival.node_id) && rival.specialty === 'raiding') return 'raid_post' as const;
  if (rival.specialty === 'escort_hunting') return 'steal_contract' as const;
  if (rival.specialty === 'trade_warfare') return 'raid_post' as const;
  if (rival.specialty === 'siege') return 'capture_node' as const;
  if (rival.specialty === 'frontline') return 'fortify_front' as const;
  return rival.objective ?? 'capture_node';
}

function chooseRivalDestination(state: GlobalGameState, rival: RivalCompany, objective: RivalCompany['objective']) {
  if (objective === 'shadow_player') return state.company_node_id;
  if (objective === 'raid_post') {
    const postNode = state.forward_posts.find((post) => post.guard_rating > 0)?.node_id;
    if (postNode) return postNode;
  }
  if (objective === 'steal_contract') {
    const bestContract = [...state.contracts]
      .filter((contract) => contract.status === 'available')
      .sort((a, b) => b.strategic_value - a.strategic_value)[0];
    if (bestContract?.location_node_id) return bestContract.location_node_id;
  }
  if (objective === 'capture_node' || objective === 'fortify_front') {
    const contestedNode = [...state.map_nodes]
      .filter((node) => node.region_id === rival.region_focus || node.strategic_role === 'corridor' || node.strategic_role === 'frontier_keep')
      .sort((a, b) => a.occupation - b.occupation)[0];
    if (contestedNode) return contestedNode.id;
  }
  return rival.node_id;
}

function chooseNextRoute(state: GlobalGameState, rival: RivalCompany, destinationNodeId: string) {
  const localRoutes = state.map_routes.filter((route) => route.from === rival.node_id || route.to === rival.node_id);
  if (destinationNodeId === rival.node_id) return null;
  const direct = localRoutes.find((route) => route.from === destinationNodeId || route.to === destinationNodeId);
  if (direct && !direct.weather_locked) return direct;
  const viable = localRoutes.filter((route) => !route.weather_locked);
  return pick(viable.length > 0 ? viable : localRoutes);
}

export function simulateRivals(state: GlobalGameState): GlobalGameState {
  const regionPressure = new Map<string, number>();
  const routePressure = new Map<string, number>();
  const contestedContracts = new Set<string>();
  const raidedPosts = new Set<string>();

  const rivals = state.rivals.map((rival) => {
    const bias = doctrineBias(rival.doctrine);
    const objective = selectRivalObjective(state, rival);
    const destinationNodeId = chooseRivalDestination(state, rival, objective);
    const currentNode = state.map_nodes.find((node) => node.id === rival.node_id);
    const route = chooseNextRoute(state, rival, destinationNodeId);
    const nextNodeId = route ? (route.from === rival.node_id ? route.to : route.from) : rival.node_id;
    const nextNode = state.map_nodes.find((node) => node.id === nextNodeId) ?? currentNode;
    const focusRegion = state.regions.find((region) => region.id === nextNode?.region_id) ?? state.regions.find((region) => region.id === rival.region_focus) ?? state.regions[0];

    const options = state.contracts.filter(
      (c) => c.status === 'available' && c.location_node_id === nextNodeId
    );
    const target = options.sort((a, b) => b.strategic_value - a.strategic_value)[0] ?? null;

    let wealth = rival.wealth;
    let reputation = rival.reputation;
    let strength = rival.strength_rating;
    let hostility = rival.hostility_to_player;

    if (target) {
      const missionScore = rival.roster_power * randInt(85, 115) / 100;
      const threshold = target.enemy_power * bias.risk;
      const success = missionScore >= threshold;
      contestedContracts.add(target.id);

      if (success) {
        wealth += Math.round(target.hidden_reward_gold * bias.reward);
        reputation += Math.round(target.reward_reputation * 0.8);
        strength += randInt(1, 4);
        hostility += target.region_id === focusRegion.id ? 2 : 1;
        regionPressure.set(target.region_id, (regionPressure.get(target.region_id) ?? 0) + 10);
      } else {
        wealth -= randInt(40, 120);
        reputation -= randInt(1, 4);
        strength -= randInt(1, 3);
        if (roll(0.35)) hostility += 3;
        regionPressure.set(focusRegion.id, (regionPressure.get(focusRegion.id) ?? 0) + 4);
      }
    }

    if (route) {
      routePressure.set(route.id, (routePressure.get(route.id) ?? 0) + Math.round(rival.hostility_to_player / 12 + rival.roster_power / 40));
    }

    if ((objective === 'raid_post' || rival.specialty === 'raiding') && state.forward_posts.some((post) => post.node_id === nextNodeId) && roll(0.36)) {
      raidedPosts.add(nextNodeId);
      hostility += 4;
    }

    if (objective === 'shadow_player' && nextNodeId === state.company_node_id) {
      hostility += 6;
      regionPressure.set(focusRegion.id, (regionPressure.get(focusRegion.id) ?? 0) + 8);
    }

    return {
      ...rival,
      objective,
      region_focus: focusRegion.id,
      node_id: nextNodeId,
      target_node_id: destinationNodeId,
      grudges:
        nextNodeId === state.company_node_id && rival.hostility_to_player > 50
          ? Array.from(new Set([...rival.grudges, `Player crossed ${nextNode?.name ?? 'their path'} on day ${state.day}`])).slice(-4)
          : rival.grudges,
      wealth: Math.max(0, wealth),
      reputation: Math.max(0, reputation),
      strength_rating: Math.max(40, strength),
      roster_power: Math.max(35, rival.roster_power + randInt(-3, 4)),
      hostility_to_player: Math.max(0, Math.min(100, Math.round(hostility * bias.hostility))),
      updated_at: isoNow()
    };
  });

  const contracts = state.contracts.map((contract) => {
    if (!contestedContracts.has(contract.id)) return contract;
    return {
      ...contract,
      status: roll(0.6) ? ('expired' as const) : contract.status,
      updated_at: isoNow()
    };
  });

  const region_fame = state.region_fame.map((f) => {
    const pressure = rivals.filter((r) => r.region_focus === f.regionId).reduce((n, r) => n + r.reputation / 200, 0) + (regionPressure.get(f.regionId) ?? 0) / 6;
    return { ...f, fame: Math.max(0, f.fame - pressure) };
  });

  const regions = state.regions.map((region) => {
    const pressure = regionPressure.get(region.id) ?? 0;
    if (pressure === 0) return region;
    return {
      ...region,
      rival_presence: Math.min(100, region.rival_presence + pressure),
      threat_pressure: Math.min(100, region.threat_pressure + Math.round(pressure / 2)),
      updated_at: isoNow()
    };
  });

  const map_routes = state.map_routes.map((route) => {
    const pressure = routePressure.get(route.id);
    if (!pressure) return route;
    const nextPatrolPressure = Math.min(100, (route.patrol_pressure ?? 0) + pressure);
    return {
      ...route,
      patrol_pressure: nextPatrolPressure,
      control: nextPatrolPressure >= 70 ? 'hostile' : nextPatrolPressure >= 40 ? 'restricted' : route.control
    };
  });

  const forward_posts = state.forward_posts.map((post) =>
    raidedPosts.has(post.node_id)
      ? { ...post, stash_supplies: Math.max(0, post.stash_supplies - 10), guard_rating: Math.max(0, post.guard_rating - 5) }
      : post
  );

  const rivalryIncident = roll(0.22) ? pick(rivals) : null;
  const chronicle = rivalryIncident
    ? [`Rival incident: ${rivalryIncident.name} pursues objective ${rivalryIncident.objective?.replace('_', ' ') ?? 'unknown'} near ${state.map_nodes.find((node) => node.id === rivalryIncident.node_id)?.name ?? 'contested roads'}.`, ...state.chronicle]
    : state.chronicle;

  return {
    ...state,
    rivals,
    contracts,
    regions,
    map_routes,
    forward_posts,
    region_fame,
    chronicle: chronicle.slice(0, 80)
  };
}
