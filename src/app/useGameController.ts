import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createSeedState } from '../seed/seedState';
import { simulateMission } from '../services/combatSimulator';
import { negotiateContractTerms } from '../services/contractNegotiationEngine';
import { displayContractIntel } from '../services/contractGenerator';
import { upgradeBase } from '../services/economyEngine';
import { resolveInterception } from '../services/interceptionEngine';
import { getMarketSnapshot } from '../services/marketEngine';
import { loadLocalState, pullRemoteState, pushRemoteState, saveLocalState } from '../services/persistence';
import { buildRecruit, recruitMercenary } from '../services/recruitmentEngine';
import { advanceCampaignDay, beginTravel, beginTravelOrder, createTravelOrder, estimateTravelOrderDays, getConnectedRoutes, getMapNode, getTravelDestination, resolveJourneyIncident } from '../services/strategicMapEngine';
import {
  activateCurrentLandmark,
  beginLandmarkOperation,
  buyCampaignStock,
  buyPackAnimal,
  buyRegionalPermit,
  buyTradeGoods,
  depositSuppliesAtPost,
  establishForwardPost,
  fortifyCurrentPost,
  investInLocalInfrastructure,
  exploreCurrentNode,
  recruitAtCurrentNode,
  resupplyAtCurrentNode,
  scoutCurrentRegion,
  sellTradeGoods,
  setTravelPolicy,
  specializeCurrentPost,
  resolveLandmarkOperation,
  withdrawSuppliesFromPost
} from '../services/strategicOpsEngine';
import type { BaseUpgrade, Contract, GlobalGameState, InterceptionStance, JourneyIncidentChoice, MissionLogEntry, SiteOperationChoice, TravelMode, TravelPolicy } from '../types/game';

export type Screen = 'dashboard' | 'mercenaries' | 'contracts' | 'squad' | 'map' | 'base' | 'rivals' | 'chronicle' | 'memorial';
const ONBOARDING_KEY = 'mercenary-company-onboarding-v1';

export interface DailySummary {
  day: number;
  contractsAvailable: number;
  goldDelta: number;
  suppliesDelta: number;
  rivalRegions: number;
  siegeRegions: number;
  note: string;
}

export interface ActionNotice {
  tone: 'info' | 'success' | 'warn';
  message: string;
}

export interface CampaignGoal {
  id: string;
  label: string;
  done: boolean;
  detail: string;
}

export interface CampaignProgressView {
  phase: 'early' | 'mid' | 'late';
  title: string;
  summary: string;
  growthSignals: string[];
  dragSignals: string[];
  goals: CampaignGoal[];
  momentum: 'poor' | 'stable' | 'strong';
}

const REMOTE_SYNC_ENABLED = Boolean(
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
);

function buildDailySummary(prev: GlobalGameState, next: GlobalGameState): DailySummary {
  const contractsAvailable = next.contracts.filter((contract) => contract.status === 'available').length;
  const rivalRegions = next.regions.filter((region) => region.rival_presence >= 45).length;
  const siegeRegions = next.regions.filter((region) => region.front_state === 'siege').length;
  return {
    day: next.day,
    contractsAvailable,
    goldDelta: next.company.gold - prev.company.gold,
    suppliesDelta: next.company.supplies - prev.company.supplies,
    rivalRegions,
    siegeRegions,
    note:
      siegeRegions > 0 ? 'Sieges are active and reshaping regional access.'
      : rivalRegions > 0 ? 'Rival pressure is climbing across multiple regions.'
      : 'The frontier shifts, but no major rupture breaks today.'
  };
}

export function useGameController() {
  const [state, setState] = useState<GlobalGameState>(() => loadLocalState());
  const [screen, setScreen] = useState<Screen>('map');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [squadIds, setSquadIds] = useState<string[]>(() => loadLocalState().mercenaries.slice(0, 4).map((m) => m.id));
  const [lastMissionLog, setLastMissionLog] = useState<MissionLogEntry[]>([]);
  const [lastDailySummary, setLastDailySummary] = useState<DailySummary | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !window.localStorage.getItem(ONBOARDING_KEY));
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const deferredState = useDeferredValue(state);

  useEffect(() => {
    const handle = window.setTimeout(() => saveLocalState(deferredState), 180);
    return () => window.clearTimeout(handle);
  }, [deferredState]);

  const selectedContract = useMemo(
    () => state.contracts.find((c) => c.id === selectedContractId) ?? null,
    [state.contracts, selectedContractId]
  );
  const latestMissionRun = state.mission_runs[0] ?? null;

  const availableContracts = state.contracts.filter((c) => c.status === 'available');
  const currentNode = getMapNode(state, state.company_node_id);
  const marketSnapshot = getMarketSnapshot(state, currentNode);
  const connectedRoutes = getConnectedRoutes(state, state.company_node_id).map((route) => ({
    route,
    destination: getMapNode(state, getTravelDestination(route, state.company_node_id))
  }));

  const squad = state.mercenaries.filter((m) => squadIds.includes(m.id));
  const localContracts = availableContracts.filter((contract) => contract.location_node_id === state.company_node_id);
  const travelContracts = availableContracts.filter((contract) => contract.location_node_id !== state.company_node_id);
  const localPost = state.forward_posts.find((post) => post.node_id === state.company_node_id) ?? null;
  const selectedTravelPlan =
    selectedContract?.location_node_id ? createTravelOrder(state, selectedContract.location_node_id, 'guided_route') : null;
  const selectedTravelEta = estimateTravelOrderDays(state, selectedTravelPlan);
  const contractBriefs = availableContracts.map((contract) => {
    const order = contract.location_node_id ? createTravelOrder(state, contract.location_node_id, 'guided_route') : null;
    const eta = estimateTravelOrderDays(state, order);
    const late = Boolean(contract.travel_deadline_day && eta != null && state.day + eta > contract.travel_deadline_day);
    return { contractId: contract.id, eta, late };
  });
  const alerts = [
    state.active_interception ? 'Route interception is active.' : null,
    state.company.supplies <= 20 ? 'Supplies are running low.' : null,
    state.company.gold <= 80 ? 'Treasury is thin and payroll risk is rising.' : null,
    contractBriefs.some((entry) => entry.late) ? 'One or more contracts are at risk of late arrival.' : null,
    localPost && localPost.integrity <= 55 ? `The post at ${currentNode?.name ?? 'this node'} needs repairs.` : null,
    state.regions.some((region) => region.front_state === 'siege') ? 'A regional siege is active on the map.' : null
  ].filter(Boolean) as string[];
  const priorities = [
    state.active_travel ? 'Finish the current travel order before committing new operations.' : null,
    state.active_interception ? 'Resolve the interception before the route deteriorates further.' : null,
    state.company.supplies <= 20 ? 'Resupply or withdraw stock from a forward post.' : null,
    localContracts[0] ? `Local contract ready: ${localContracts[0].title}` : null,
    travelContracts[0] ? `Remote contract to evaluate: ${travelContracts[0].title}` : null
  ].filter(Boolean) as string[];
  const contextualTips = [
    screen === 'map' ? 'Use the map to decide whether position, permits and weather make a contract worth pursuing.' : null,
    screen === 'contracts' && selectedContract && selectedContract.location_node_id !== state.company_node_id
      ? 'Selected contract is remote. Open the map and deploy before the travel deadline slips.'
      : null,
    screen === 'base' ? 'Base upgrades improve recovery; forward posts project supplies and control into contested areas.' : null,
    state.active_interception ? 'Interceptions are urgent because they cost days, supplies and sometimes the contract window itself.' : null
  ].filter(Boolean) as string[];
  const averageFame = state.region_fame.reduce((sum, fame) => sum + fame.fame, 0) / Math.max(1, state.region_fame.length);
  const unlockedRegions = state.regions.filter((region) => region.unlocked).length;
  const resolvedRuns = state.mission_runs.length;
  const contestedRegions = state.regions.filter((region) => region.front_state === 'conflict' || region.front_state === 'siege').length;
  const highValueContracts = availableContracts.filter((contract) => contract.strategic_value >= 70).length;
  const campaignProgressView: CampaignProgressView = (() => {
    const phase =
      state.company.campaign_progress >= 110 || state.campaign_status === 'ascendant' || state.campaign_status === 'dominating'
        ? 'late'
        : state.company.campaign_progress >= 45 || state.forward_posts.length >= 1 || unlockedRegions >= 3
          ? 'mid'
          : 'early';
    const growthSignals = [
      resolvedRuns > 0 ? `${resolvedRuns} resolved mission${resolvedRuns === 1 ? '' : 's'}` : null,
      state.forward_posts.length > 0 ? `${state.forward_posts.length} forward post${state.forward_posts.length === 1 ? '' : 's'} online` : null,
      averageFame >= 12 ? `regional fame average ${Math.round(averageFame)}` : null,
      unlockedRegions > 2 ? `${unlockedRegions} regions unlocked` : null,
      state.company.base_level >= 2 ? `base level ${state.company.base_level}` : null,
      state.company.campaign_progress >= 45 ? `campaign progress ${state.company.campaign_progress}` : null
    ].filter(Boolean) as string[];
    const dragSignals = [
      state.company.supplies <= 20 ? 'supplies critically low' : null,
      state.company.gold <= 80 ? 'treasury under pressure' : null,
      state.active_travel ? 'company tied up in active travel' : null,
      state.active_interception ? 'route interception unresolved' : null,
      contractBriefs.some((entry) => entry.late) ? 'valuable contract windows are slipping' : null,
      contestedRegions >= 2 ? `${contestedRegions} regions are under heavy pressure` : null
    ].filter(Boolean) as string[];
    const goalsByPhase: Record<CampaignProgressView['phase'], { title: string; summary: string; goals: CampaignGoal[] }> = {
      early: {
        title: 'Early Campaign',
        summary: 'Stabilize the company and prove you can reach, survive and complete nearby work.',
        goals: [
          { id: 'early-mission', label: 'Resolve your first contract', done: resolvedRuns >= 1, detail: resolvedRuns >= 1 ? 'The company has already blooded itself.' : 'Take one contract to start generating true campaign progress.' },
          { id: 'early-site', label: 'Survey and work a landmark', done: state.landmarks.some((landmark) => landmark.activated), detail: state.landmarks.some((landmark) => landmark.activated) ? 'You already converted exploration into a concrete gain.' : 'Explore the current node, then open a site operation for map-driven progress.' },
          { id: 'early-cash', label: 'Reach 1,000 gold or secure safe reserves', done: state.company.gold >= 1000, detail: `Current treasury: ${state.company.gold}g.` },
          { id: 'early-travel', label: 'Complete a successful journey', done: state.chronicle.some((entry) => entry.includes('The company reaches ')), detail: state.chronicle.some((entry) => entry.includes('The company reaches ')) ? 'You have already completed at least one full route.' : 'Travel to another node and finish the route instead of staying local.' }
        ]
      },
      mid: {
        title: 'Mid Campaign',
        summary: 'Project force beyond the starting corridor, protect logistics and stop playing contract-to-contract.',
        goals: [
          { id: 'mid-post', label: 'Establish a forward post', done: state.forward_posts.length >= 1, detail: state.forward_posts.length >= 1 ? 'Your logistics network has started.' : 'A forward post is the first big sign that the company can hold ground.' },
          { id: 'mid-progress', label: 'Reach 45 campaign progress', done: state.company.campaign_progress >= 45, detail: `Current progress: ${state.company.campaign_progress}.` },
          { id: 'mid-region', label: 'Unlock a third region', done: unlockedRegions >= 3, detail: `Unlocked regions: ${unlockedRegions}.` },
          { id: 'mid-pressure', label: 'Take at least one high-value strategic contract', done: state.mission_runs.some((run) => run.reward_gold >= 140), detail: state.mission_runs.some((run) => run.reward_gold >= 140) ? 'You have already converted risk into meaningful growth.' : 'Chasing only easy local contracts will stall the campaign.' }
        ]
      },
      late: {
        title: 'Late Campaign',
        summary: 'Turn survival into dominance by controlling tempo, distance and political pressure better than rivals.',
        goals: [
          { id: 'late-status', label: 'Push campaign status to ascendant', done: state.campaign_status === 'ascendant' || state.campaign_status === 'dominating', detail: `Current status: ${state.campaign_status}.` },
          { id: 'late-progress', label: 'Reach 110 campaign progress', done: state.company.campaign_progress >= 110, detail: `Current progress: ${state.company.campaign_progress}.` },
          { id: 'late-network', label: 'Maintain multiple forward posts', done: state.forward_posts.length >= 2, detail: `Forward posts online: ${state.forward_posts.length}.` },
          { id: 'late-pressure', label: 'Operate despite contested territory', done: contestedRegions >= 1 && resolvedRuns >= 3, detail: contestedRegions >= 1 ? 'The frontier is dangerous enough now; you need to keep winning inside it.' : 'You need more territorial pressure before the late loop is really engaged.' }
        ]
      }
    };
    const phaseBlock = goalsByPhase[phase];
    const momentumScore = growthSignals.length - dragSignals.length;
    return {
      phase,
      title: phaseBlock.title,
      summary: phaseBlock.summary,
      growthSignals,
      dragSignals,
      goals: phaseBlock.goals,
      momentum: momentumScore >= 2 ? 'strong' : momentumScore >= 0 ? 'stable' : 'poor'
    };
  })();

  function toggleSquad(id: string) {
    setSquadIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  }

  function executeMission(contractId?: string) {
    const target = contractId ?? selectedContractId;
    if (!target || squadIds.length === 0) {
      setActionNotice({ tone: 'warn', message: 'Select a contract and a squad before trying to run a mission.' });
      return;
    }
    const contract = state.contracts.find((entry) => entry.id === target);
    if (state.active_travel) {
      setActionNotice({ tone: 'warn', message: 'The company is already traveling. Advance the day until it arrives first.' });
      return;
    }
    if (contract?.location_node_id && contract.location_node_id !== state.company_node_id) {
      setActionNotice({ tone: 'warn', message: 'You are not at the contract location yet. Travel there before deploying.' });
      setScreen('map');
      return;
    }
    const result = simulateMission(state, target, squadIds);
    setState(result.state);
    setLastMissionLog(result.log);
    setLastDailySummary(null);
    setActionNotice({ tone: 'success', message: 'Mission resolved. Open the Chronicle to review the result in detail.' });
    setScreen('chronicle');
  }

  function tickWorld() {
    const prevState = state;
    const nextState = advanceCampaignDay(prevState);
    setState(nextState);
    setLastDailySummary(buildDailySummary(prevState, nextState));
    if (nextState.active_interception) {
      setActionNotice({ tone: 'warn', message: 'The march was interrupted by an interception. Resolve it before trying to advance again.' });
      return;
    }
    if (nextState.active_journey_incident) {
      setActionNotice({ tone: 'warn', message: 'A journey incident stopped the column. Resolve it before trying to advance again.' });
      return;
    }
    if (nextState.active_site_operation) {
      setActionNotice({ tone: 'warn', message: 'A site operation is active. Resolve it before trying to force the campaign forward.' });
      return;
    }
    if (nextState.active_travel) {
      setActionNotice({
        tone: 'info',
        message: `Journey advanced to day ${nextState.active_travel.progress_days}/${nextState.active_travel.total_days}.`
      });
      return;
    }
    setActionNotice({ tone: 'success', message: 'Campaign day advanced. Travel, rival pressure and world state moved forward.' });
  }

  function travelTo(routeId: string, mode: TravelMode) {
    const next = beginTravel(state, routeId, mode);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'Travel could not start from this route. Make sure the company is at the selected node and the route is usable.' });
      return;
    }
    setState(next);
    setActionNotice({
      tone: 'success',
      message: `Journey started toward ${next.map_nodes.find((node) => node.id === next.active_travel?.to_node_id)?.name ?? 'the next node'} by ${mode.replace('_', ' ')}. Now click Advance Campaign Day.`
    });
    setScreen('map');
  }

  function deployToNode(nodeId: string, mode: TravelMode) {
    const next = beginTravelOrder(state, nodeId, mode);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'No valid travel plan could be started for that destination with the selected travel mode.' });
      return;
    }
    setState(next);
    setActionNotice({
      tone: 'success',
      message: `Travel order started toward ${next.map_nodes.find((node) => node.id === nodeId)?.name ?? 'the selected destination'}. Advance the campaign day to move the company.`
    });
    setScreen('map');
  }

  function hireRecruit() {
    const recruit = buildRecruit(state.company.id, 1);
    setState((prev) => recruitMercenary(prev, recruit));
  }

  function hireLocalRecruit() {
    const next = recruitAtCurrentNode(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'This node cannot provide a local recruit right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'A local mercenary joined the company.' });
  }

  function resupplyCompany() {
    const next = resupplyAtCurrentNode(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'You cannot afford supplies here right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Supplies purchased for the campaign.' });
  }

  function scoutRegion() {
    const next = scoutCurrentRegion(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'Scouting could not start here, usually because funds are too low.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Regional scouts dispatched. Contract intel improved.' });
  }

  function exploreNode() {
    const next = exploreCurrentNode(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'Exploration could not start. You need enough supplies and the company must not already be traveling.' });
      return;
    }
    setState(next);
    const newLandmark = next.landmarks.find((landmark, index) => landmark.discovered && !state.landmarks[index]?.discovered && landmark.node_id === next.company_node_id);
    setActionNotice({
      tone: 'success',
      message: newLandmark
        ? `Exploration found ${newLandmark.name}. You can now open its site operation from the atlas.`
        : 'Exploration completed. Routes and local intel were updated.'
    });
  }

  function activateLandmark(landmarkId: string) {
    setState((prev) => activateCurrentLandmark(prev, landmarkId));
  }

  function beginSiteOperation(landmarkId: string) {
    const landmark = state.landmarks.find((entry) => entry.id === landmarkId);
    const next = beginLandmarkOperation(state, landmarkId);
    if (next === state) {
      setActionNotice({
        tone: 'warn',
        message: landmark?.node_id !== state.company_node_id
          ? `Travel to ${state.map_nodes.find((node) => node.id === landmark?.node_id)?.name ?? 'that node'} before opening its site operation.`
          : 'That site cannot be opened yet. Explore first or finish the current interruption.'
      });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'info', message: `Site operation opened: ${landmark?.name ?? 'landmark'}. Choose how to handle it.` });
  }

  function resolveSiteOperation(choice: SiteOperationChoice) {
    const next = resolveLandmarkOperation(state, choice);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'That site operation choice could not be resolved.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Site operation resolved. Check the map, contracts and chronicle for the new result.' });
  }

  function answerJourneyIncident(choice: JourneyIncidentChoice) {
    const next = resolveJourneyIncident(state, choice);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'That journey response did not resolve. Try again from the current incident.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Journey decision applied. Advance the campaign day again to keep the company moving.' });
  }

  function buyStock() {
    const next = buyCampaignStock(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'Campaign stock could not be purchased here right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Medicine and ammunition were added to the campaign stores.' });
  }

  function establishPost() {
    const next = establishForwardPost(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'A forward post cannot be established here right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'A forward post was established at the current node.' });
  }

  function investLocally() {
    const next = investInLocalInfrastructure(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'Local investment could not be made here right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Local infrastructure investment went through.' });
  }

  function fortifyPost() {
    const next = fortifyCurrentPost(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'There is no local post to fortify, or the treasury is too thin.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'The current forward post was fortified.' });
  }

  function specializePost(specialty: 'supply' | 'medical' | 'military') {
    const next = specializeCurrentPost(state, specialty);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'Post specialization could not be changed right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: `The current post now focuses on ${specialty}.` });
  }

  function acquirePackAnimal() {
    const next = buyPackAnimal(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'No pack animal could be acquired here right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'A new pack animal was added to the company train.' });
  }

  function acquirePermit() {
    const next = buyRegionalPermit(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'No regional permit could be acquired from this node right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Regional travel permission was secured.' });
  }

  function loadTradeGoods() {
    const next = buyTradeGoods(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'Trade goods could not be loaded here right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Trade goods were loaded into the caravan.' });
  }

  function unloadTradeGoods() {
    const next = sellTradeGoods(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'There are no trade goods to unload here, or this market cannot absorb them now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Trade goods were sold into the local market.' });
  }

  function changeTravelPolicy(policy: TravelPolicy) {
    setState((prev) => setTravelPolicy(prev, policy));
    setActionNotice({ tone: 'info', message: `Travel policy changed to ${policy}.` });
  }

  function depositAtPost() {
    const next = depositSuppliesAtPost(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'No supplies could be deposited at the current post.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Supplies were deposited into the local forward post.' });
  }

  function withdrawFromPost() {
    const next = withdrawSuppliesFromPost(state);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'No supplies could be withdrawn from the current post.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Supplies were withdrawn from the local forward post.' });
  }

  function answerInterception(stance: InterceptionStance) {
    const next = resolveInterception(state, stance);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'That interception response could not be resolved.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Interception resolved. The route situation has changed.' });
  }

  function applyBaseUpgrade(type: BaseUpgrade['type']) {
    const next = upgradeBase(state, type);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'That base upgrade could not be applied right now.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: `Base upgrade applied: ${type}.` });
  }

  function contractIntel(contract: Contract) {
    return displayContractIntel(contract);
  }

  function negotiateSelectedContract() {
    if (!selectedContractId) {
      setActionNotice({ tone: 'warn', message: 'Select a contract before trying to negotiate it.' });
      return;
    }
    const next = negotiateContractTerms(state, selectedContractId);
    if (next === state) {
      setActionNotice({ tone: 'warn', message: 'That contract cannot be negotiated further.' });
      return;
    }
    setState(next);
    setActionNotice({ tone: 'success', message: 'Hazard pay negotiated. Check the contract terms again.' });
  }

  async function syncRemote() {
    if (!REMOTE_SYNC_ENABLED) {
      setActionNotice({ tone: 'info', message: 'Remote sync is disabled in this demo build. Progress is being saved locally in your browser.' });
      return;
    }
    const remote = await pullRemoteState(state.company.id);
    if (remote) {
      setState(remote);
      setActionNotice({ tone: 'success', message: 'Remote save pulled successfully.' });
      return;
    }
    await pushRemoteState(state);
    setActionNotice({ tone: 'success', message: 'Current campaign state pushed to remote persistence.' });
  }

  function dismissOnboarding() {
    window.localStorage.setItem(ONBOARDING_KEY, 'dismissed');
    setShowOnboarding(false);
  }

  function clearActionNotice() {
    setActionNotice(null);
  }

  function explainAction(message: string, tone: ActionNotice['tone'] = 'warn') {
    setActionNotice({ tone, message });
  }

  function resetCampaign() {
    setState(createSeedState());
    setLastMissionLog([]);
    setLastDailySummary(null);
    setSelectedContractId(null);
    setSquadIds(createSeedState().mercenaries.slice(0, 4).map((m) => m.id));
    window.localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  }

  return {
    state,
    screen,
    setScreen,
    availableContracts,
    localContracts,
    travelContracts,
    selectedContract,
    setSelectedContractId,
    squad,
    squadIds,
    currentNode,
    localPost,
    marketSnapshot,
    connectedRoutes,
    selectedTravelPlan,
    selectedTravelEta,
    contractBriefs,
    latestMissionRun,
    lastDailySummary,
    showOnboarding,
    alerts,
    actionNotice,
    priorities,
    contextualTips,
    campaignProgressView,
    remoteSyncEnabled: REMOTE_SYNC_ENABLED,
    toggleSquad,
    executeMission,
    tickWorld,
    travelTo,
    deployToNode,
    hireRecruit,
    hireLocalRecruit,
    resupplyCompany,
    scoutRegion,
    exploreNode,
    activateLandmark,
    beginSiteOperation,
    resolveSiteOperation,
    answerJourneyIncident,
    buyStock,
    establishPost,
    investLocally,
    fortifyPost,
    specializePost,
    acquirePackAnimal,
    acquirePermit,
    loadTradeGoods,
    unloadTradeGoods,
    changeTravelPolicy,
    depositAtPost,
    withdrawFromPost,
    answerInterception,
    applyBaseUpgrade,
    contractIntel,
    negotiateSelectedContract,
    dismissOnboarding,
    clearActionNotice,
    explainAction,
    lastMissionLog,
    syncRemote,
    resetCampaign
  };
}
