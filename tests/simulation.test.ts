import { describe, expect, it } from 'vitest';
import { createSeedState } from '../src/seed/seedState';
import { displayContractIntel, generateContracts } from '../src/services/contractGenerator';
import { negotiateContractTerms } from '../src/services/contractNegotiationEngine';
import { buyRegionalPermit, buyTradeGoods, sellTradeGoods } from '../src/services/marketEngine';
import { simulateMission } from '../src/services/combatSimulator';
import { awardNarrativeLoot } from '../src/services/contentEngine';
import { simulateBaseAndPosts } from '../src/services/basePostEngine';
import { resolveInterception } from '../src/services/interceptionEngine';
import { buildPersistedEnvelope, hydratePersistedState } from '../src/services/persistence';
import { simulateRivals } from '../src/services/rivalAiEngine';
import { activateCurrentLandmark, beginLandmarkOperation, depositSuppliesAtPost, establishForwardPost, exploreCurrentNode, fortifyCurrentPost, investInLocalInfrastructure, resolveLandmarkOperation, specializeCurrentPost, withdrawSuppliesFromPost } from '../src/services/strategicOpsEngine';
import { beginTravel, createTravelOrder, resolveJourneyIncident } from '../src/services/strategicMapEngine';
import { computeSynergies } from '../src/services/synergyEngine';
import { simulateTerritory } from '../src/services/territorialEngine';
import { runWorldTick } from '../src/services/worldTickEngine';
import type { DailySummary } from '../src/app/useGameController';
import { buildEnvelope, validateStateEnvelope } from '../server/src/lib/save.mjs';

describe('game simulation', () => {
  it('produces contract intel ranges with uncertainty', () => {
    const state = createSeedState();
    const intel = displayContractIntel(state.contracts[0]);
    expect(intel.estDifficulty).toContain('-');
    expect(['low', 'medium', 'high']).toContain(intel.risk);
  });

  it('activates at least one synergy for starter squad', () => {
    const state = createSeedState();
    const synergy = computeSynergies(state.mercenaries.slice(0, 4));
    expect(synergy.some((s) => s.active)).toBe(true);
  });

  it('resolves a mission and records run log', () => {
    const state = createSeedState();
    const contract = state.contracts[0];
    const squad = state.mercenaries.slice(0, 4).map((m) => m.id);
    const result = simulateMission({ ...state, company_node_id: contract.location_node_id ?? state.company_node_id }, contract.id, squad);
    expect(result.state.mission_runs.length).toBe(1);
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.state.company.campaign_progress).toBeGreaterThanOrEqual(0);
  });

  it('plots multi-leg travel toward remote contract nodes', () => {
    const state = createSeedState();
    const remoteContract = state.contracts.find((contract) => contract.location_node_id === 'node_drowned_market');
    const order = createTravelOrder(state, remoteContract!.location_node_id!, 'guided_route');
    expect(order).not.toBeNull();
    expect(order!.route_ids.length).toBeGreaterThan(0);
  });

  it('moves rivals on the map and increases route or regional pressure', () => {
    const state = createSeedState();
    const next = simulateRivals(state);
    expect(next.rivals.some((rival, index) => rival.node_id !== state.rivals[index].node_id)).toBe(true);
    expect(
      next.map_routes.some((route, index) => (route.patrol_pressure ?? 0) > (state.map_routes[index].patrol_pressure ?? 0)) ||
      next.regions.some((region, index) => region.rival_presence > state.regions[index].rival_presence)
    ).toBe(true);
    expect(next.rivals.every((rival) => Boolean(rival.objective))).toBe(true);
  });

  it('blocks weather-locked routes from travel', () => {
    const state = createSeedState();
    const rainy = {
      ...state,
      weather: 'rain' as const,
      map_routes: state.map_routes.map((route) =>
        route.id === 'route_blackfen_keep_mirecross' ? { ...route, weather_locked: true } : route
      ),
      company_node_id: 'node_blackfen_keep'
    };
    const next = beginTravel(rainy, 'route_blackfen_keep_mirecross', 'foot');
    expect(next.active_travel).toBeNull();
  });

  it('expires contracts that miss geographic deadline', () => {
    const state = createSeedState();
    const next = runWorldTick({
      ...state,
      day: 4,
      contracts: state.contracts.map((contract, index) =>
        index === 0 ? { ...contract, travel_deadline_day: 4, deadline_days: 2 } : contract
      )
    });
    expect(next.contracts.some((contract) => contract.id === state.contracts[0].id)).toBe(false);
  });

  it('supports permit purchase and cargo trading', () => {
    const state = createSeedState();
    const moved = { ...state, company_node_id: 'node_hallowport' };
    const permitted = buyRegionalPermit(moved);
    const loaded = buyTradeGoods(permitted, 3);
    const sold = sellTradeGoods(loaded);
    expect(permitted.company.permits).toContain('reg_hallowport');
    expect(loaded.company.trade_goods).toBe(3);
    expect(sold.company.trade_goods).toBe(0);
  });

  it('resolves active interceptions with tangible consequences', () => {
    const state = createSeedState();
    const intercepted = {
      ...state,
      active_interception: {
        id: 'ix_test',
        route_id: 'route_blackfen_keep_sunscar_gate',
        destination_node_id: 'node_blackfen_keep',
        type: 'border_patrol' as const,
        enemy_power: 140,
        stakes: 60,
        delay_days: 2,
        discovered: true
      }
    };
    const resolved = resolveInterception(intercepted, 'guard_cargo');
    expect(resolved.active_interception).toBeNull();
    expect(resolved.chronicle[0]).toContain('Interception resolved');
  });

  it('pushes regions into front states during territorial simulation', () => {
    const state = createSeedState();
    const next = simulateTerritory(state);
    expect(
      next.regions.some((region, index) => region.front_state !== state.regions[index].front_state || region.faction_control !== state.regions[index].faction_control) ||
      next.map_nodes.some((node, index) => node.occupation !== state.map_nodes[index].occupation || node.faction_control !== state.map_nodes[index].faction_control)
    ).toBe(true);
  });

  it('generates objective-driven contracts', () => {
    const state = createSeedState();
    expect(state.contracts.every((contract) => Boolean(contract.objective_type))).toBe(true);
  });

  it('negotiates contract terms with higher reward and tighter window', () => {
    const state = createSeedState();
    const contract = state.contracts[0];
    const next = negotiateContractTerms(state, contract.id);
    const negotiated = next.contracts.find((entry) => entry.id === contract.id)!;
    expect(negotiated.negotiated).toBe(true);
    expect(negotiated.reward_gold).toBeGreaterThan(contract.reward_gold);
    expect(negotiated.deadline_days).toBeLessThanOrEqual(contract.deadline_days);
  });

  it('supports storing supplies at a forward post', () => {
    const state = createSeedState();
    const posted = establishForwardPost(state);
    const deposited = depositSuppliesAtPost(posted);
    const withdrawn = withdrawSuppliesFromPost(deposited);
    expect(posted.forward_posts).toHaveLength(1);
    expect(deposited.forward_posts[0].stash_supplies).toBeGreaterThan(posted.forward_posts[0].stash_supplies);
    expect(withdrawn.company.supplies).toBeGreaterThanOrEqual(deposited.company.supplies);
  });

  it('supports local economic investment that improves node quality', () => {
    const state = createSeedState();
    const invested = investInLocalInfrastructure(state);
    const beforeNode = state.map_nodes.find((node) => node.id === state.company_node_id)!;
    const afterNode = invested.map_nodes.find((node) => node.id === invested.company_node_id)!;
    expect(invested.company.gold).toBeLessThan(state.company.gold);
    expect(afterNode.logistics).toBeGreaterThanOrEqual(beforeNode.logistics);
    expect(afterNode.market).toBeGreaterThanOrEqual(beforeNode.market);
  });

  it('reveals hidden landmarks when exploring the current node', () => {
    const state = createSeedState();
    const moved = { ...state, company_node_id: 'node_mirecross' };
    const next = exploreCurrentNode(moved);
    expect(next.company.supplies).toBeLessThan(moved.company.supplies);
    expect(next.landmarks.find((landmark) => landmark.node_id === 'node_mirecross')?.discovered).toBe(true);
    expect(next.chronicle[0]).toContain('Landmark found');
  });

  it('working a surveyed landmark unlocks routes and site rewards', () => {
    const state = createSeedState();
    const explored = exploreCurrentNode({ ...state, company_node_id: 'node_mirecross' });
    const activated = activateCurrentLandmark(explored, 'lm_mirecross_shrine');
    expect(activated.landmarks.find((landmark) => landmark.id === 'lm_mirecross_shrine')?.activated).toBe(true);
    expect(activated.map_routes.find((route) => route.id === 'route_mirecross_sunscar_gate_smuggler')?.discovered).toBe(true);
    expect(activated.company.supplies).toBeGreaterThanOrEqual(explored.company.supplies);
    expect(activated.contracts.some((contract) => contract.title.includes('Bridge-Saints Shrine'))).toBe(true);
  });

  it('runs a short site operation with choice-driven payoff', () => {
    const state = createSeedState();
    const explored = exploreCurrentNode({ ...state, company_node_id: 'node_mirecross' });
    const opened = beginLandmarkOperation(explored, 'lm_mirecross_shrine');
    expect(opened.active_site_operation?.landmark_id).toBe('lm_mirecross_shrine');
    const resolved = resolveLandmarkOperation(opened, 'take_blessing');
    expect(resolved.active_site_operation).toBeNull();
    expect(resolved.landmarks.find((landmark) => landmark.id === 'lm_mirecross_shrine')?.activated).toBe(true);
    expect(resolved.mercenaries.some((mercenary, index) => mercenary.morale > opened.mercenaries[index].morale || mercenary.stress < opened.mercenaries[index].stress)).toBe(true);
  });

  it('resolves a journey incident and keeps travel moving', () => {
    const state = createSeedState();
    const traveling = beginTravel({ ...state, company_node_id: 'node_blackfen_keep' }, 'route_blackfen_keep_mirecross', 'foot');
    const withIncident = {
      ...traveling,
      active_journey_incident: {
        id: 'journey_test',
        route_id: 'route_blackfen_keep_mirecross',
        title: 'Flooded Crossing',
        description: 'The marsh path has nearly disappeared under the waterline.',
        danger: 52,
        delay_days: 1,
        choices: ['push_on', 'make_camp', 'detour', 'press_guides'] as const
      }
    };
    const resolved = resolveJourneyIncident(withIncident, 'make_camp');
    expect(resolved.active_journey_incident).toBeNull();
    expect(resolved.active_travel).not.toBeNull();
    expect(resolved.active_travel!.total_days).toBeGreaterThan(withIncident.active_travel!.total_days);
  });

  it('supports fortifying and specializing a forward post', () => {
    const state = createSeedState();
    const posted = establishForwardPost(state);
    const fortified = fortifyCurrentPost(posted);
    const specialized = specializeCurrentPost(fortified, 'military');
    expect(fortified.forward_posts[0].level).toBeGreaterThanOrEqual(posted.forward_posts[0].level);
    expect(fortified.forward_posts[0].guard_rating).toBeGreaterThan(posted.forward_posts[0].guard_rating);
    expect(specialized.forward_posts[0].specialty).toBe('military');
  });

  it('hydrates recruits with personal origin and internal company metrics', () => {
    const state = createSeedState();
    expect(state.mercenaries.every((mercenary) => Boolean(mercenary.origin))).toBe(true);
    expect(state.mercenaries.every((mercenary) => mercenary.loyalty >= 0 && mercenary.stress >= 0)).toBe(true);
  });

  it('advances company dynamics during world tick', () => {
    const state = createSeedState();
    const next = runWorldTick({
      ...state,
      company: { ...state.company, gold: 20, supplies: 10 },
      mercenaries: state.mercenaries.map((mercenary, index) =>
        index === 0 ? { ...mercenary, loyalty: 17, stress: 74, fatigue: 65 } : mercenary
      )
    });
    expect(next.chronicle.some((entry) => /deserts|Camp discipline settles/.test(entry))).toBe(true);
    expect(next.mercenaries.every((mercenary) => mercenary.loyalty >= 0)).toBe(true);
  });

  it('seeds lore and descriptive equipment content', () => {
    const state = createSeedState();
    expect(state.library.length).toBeGreaterThan(0);
    expect(state.stash.every((item) => Boolean(item.description))).toBe(true);
  });

  it('awards narrative loot such as books after suitable operations', () => {
    const state = createSeedState();
    const contract = state.contracts.find((entry) => entry.id === 'ctr_sunscar_recovery_2')!;
    const region = state.regions.find((entry) => entry.id === contract.region_id)!;
    const rewards = awardNarrativeLoot(state, contract, region, 'costly_victory');
    expect(rewards.library.length).toBeGreaterThan(state.library.length);
    expect(rewards.notes.some((note) => note.includes('Recovered archive'))).toBe(true);
  });

  it('damages vulnerable forward posts under siege pressure', () => {
    const state = createSeedState();
    const pressured = simulateBaseAndPosts({
      ...state,
      company_node_id: 'node_emberwatch',
      forward_posts: [
        {
          id: 'post_emberwatch',
          node_id: 'node_emberwatch',
          stash_supplies: 18,
          stash_medicine: 2,
          stash_ammunition: 5,
          guard_rating: 12,
          level: 1,
          integrity: 40,
          specialty: 'supply',
          created_at: new Date().toISOString()
        }
      ]
    });
    expect(pressured.forward_posts[0].integrity).toBeLessThan(40);
  });

  it('builds and validates save envelopes for backend persistence', () => {
    const state = createSeedState();
    const envelope = buildEnvelope(state);
    const validation = validateStateEnvelope(envelope);
    expect(envelope.version).toBeGreaterThan(0);
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.state.company.id).toBe(state.company.id);
    }
  });

  it('can represent a daily summary payload shape for campaign UX', () => {
    const summary: DailySummary = {
      day: 3,
      contractsAvailable: 5,
      goldDelta: -12,
      suppliesDelta: -4,
      rivalRegions: 2,
      siegeRegions: 1,
      note: 'Sieges are active and reshaping regional access.'
    };
    expect(summary.day).toBeGreaterThan(0);
    expect(summary.note.length).toBeGreaterThan(0);
  });

  it('generates event-driven special contracts for active major events', () => {
    const state = createSeedState();
    const next = generateContracts(state, 0);
    expect(next.some((contract) => contract.chain_id === 'event_evt_bandit_blackfen')).toBe(true);
    expect(next.some((contract) => contract.title.includes('Relic Rumor on Sunscar Trade Wind'))).toBe(true);
  });

  it('preserves regional event flavor when seeded events exist', () => {
    const state = createSeedState();
    expect(state.events.some((event) => event.title === 'Harbor Book Tampering')).toBe(true);
    expect(state.events.some((event) => event.title === 'Ashfall Batteries Open')).toBe(true);
  });

  it('supports legacy-style hydration for older saves missing newer fields', () => {
    const state = createSeedState();
    const legacyLike = {
      ...state,
      company: {
        ...state.company,
        permits: ['fac_iron_oath']
      },
      mercenaries: state.mercenaries.map(({ origin, loyalty, ambition, camaraderie, stress, ...mercenary }) => mercenary),
      forward_posts: [
        {
          id: 'post_old',
          node_id: 'node_sunscar_gate',
          stash_supplies: 12,
          guard_rating: 20,
          created_at: new Date().toISOString()
        }
      ]
    };
    const hydrated = hydratePersistedState(legacyLike as never);
    expect(hydrated.company.permits).toContain('reg_sunscar');
    expect(hydrated.mercenaries.every((mercenary) => Boolean(mercenary.origin))).toBe(true);
    expect(hydrated.forward_posts[0].specialty).toBe('supply');
  });

  it('builds persisted envelopes with campaign metadata', () => {
    const state = createSeedState();
    const envelope = buildPersistedEnvelope(state);
    expect(envelope.version).toBeGreaterThan(0);
    expect(envelope.summary.company_name).toBe(state.company.name);
    expect(envelope.summary.location_node_id).toBe(state.company_node_id);
  });

  it('survives a multi-day campaign smoke flow', () => {
    let state = createSeedState();
    const firstContract = state.contracts[0];
    const squad = state.mercenaries.slice(0, 4).map((mercenary) => mercenary.id);
    state = {
      ...state,
      company_node_id: firstContract.location_node_id ?? state.company_node_id
    };
    state = simulateMission(state, firstContract.id, squad).state;
    state = runWorldTick(state);
    state = runWorldTick(state);
    state = simulateRivals(state);
    state = simulateTerritory(state);
    expect(state.day).toBeGreaterThanOrEqual(3);
    expect(state.company.campaign_progress).toBeGreaterThanOrEqual(0);
    expect(state.contracts.length).toBeGreaterThan(0);
    expect(state.chronicle.length).toBeGreaterThan(0);
  });
});
