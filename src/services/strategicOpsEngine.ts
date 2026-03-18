import { isoNow, makeId } from '../lib/utils/id';
import type { Contract, EquipmentItem, GlobalGameState, Landmark, LoreEntry, SiteOperationChoice, TravelPolicy } from '../types/game';
import { buildRecruit, recruitMercenary } from './recruitmentEngine';
import { buyPackAnimal, buyRegionalPermit, buyTradeGoods, sellTradeGoods } from './marketEngine';

function buildLandmarkLore(landmark: Landmark): LoreEntry {
  return {
    id: makeId('lore_site'),
    title: `Survey Notes: ${landmark.name}`,
    category: landmark.kind === 'ruin' ? 'relic_note' : landmark.kind === 'harbor' ? 'ledger' : 'field_report',
    summary: landmark.summary,
    body: `${landmark.name} is now entered into the company atlas. ${landmark.summary} Scouts mark the approaches, the likely watchers, and what sort of work or danger gathers there after dark.`,
    region_id: landmark.region_id,
    rarity: landmark.kind === 'ruin' ? 'rare' : 'common',
    discovered: true,
    acquired_from: landmark.name,
    created_at: isoNow()
  };
}

function buildLandmarkItem(landmark: Landmark): EquipmentItem {
  return {
    id: makeId('eq_site'),
    name: landmark.kind === 'harbor' ? 'Dockmaster Tide Compass' : landmark.kind === 'ruin' ? 'Vault Ash Token' : 'Roadwarden Token',
    slot: 'trinket',
    rarity: landmark.kind === 'ruin' ? 'rare' : 'uncommon',
    description: `Recovered from ${landmark.name}. ${landmark.summary}`,
    provenance: `Claimed during field work around ${landmark.name}.`,
    baseValue: landmark.kind === 'ruin' ? 15 : 11,
    scalingFactor: landmark.kind === 'ruin' ? 0.2 : 0.14,
    attackMod: landmark.kind === 'ruin' ? 2 : 0,
    defenseMod: landmark.kind === 'shrine' ? 2 : 1,
    speedMod: landmark.kind === 'waystation' || landmark.kind === 'harbor' ? 2 : 1,
    moraleMod: landmark.kind === 'shrine' ? 2 : 1,
    maxHpMod: landmark.kind === 'watchtower' ? 4 : 0,
    valueGold: landmark.kind === 'ruin' ? 320 : 180
  };
}

function buildLandmarkContract(state: GlobalGameState, landmark: Landmark): Contract {
  const themeByKind = {
    ruin: 'survival',
    waystation: 'commerce',
    shrine: 'politics',
    watchtower: 'war',
    harbor: 'commerce',
    wilds: 'survival'
  } as const;
  const objectiveByKind = {
    ruin: 'recover',
    waystation: 'escort',
    shrine: 'hold_line',
    watchtower: 'breakthrough',
    harbor: 'escort',
    wilds: 'eliminate'
  } as const;
  return {
    id: makeId('ctr_site'),
    region_id: landmark.region_id,
    location_node_id: landmark.node_id,
    faction_id: state.map_nodes.find((node) => node.id === landmark.node_id)?.faction_control ?? state.regions[0].faction_control,
    theme: themeByKind[landmark.kind],
    patron: `${landmark.name} factor`,
    type: landmark.kind === 'harbor' || landmark.kind === 'waystation' ? 'escort' : landmark.kind === 'watchtower' ? 'patrol' : 'recovery',
    title: landmark.kind === 'ruin' ? `Vault Sweep at ${landmark.name}` : `Opportunity at ${landmark.name}`,
    description: `Fresh field notes from ${landmark.name} have opened a short-notice operation tied to the site.`,
    briefing: `${landmark.summary} Now that the location is charted, local powers are willing to pay for someone to move first.`,
    reward_note: 'Surveyed sites open sharper contracts than rumor alone ever could.',
    difficulty: landmark.kind === 'ruin' ? 4 : 3,
    enemy_power: landmark.kind === 'watchtower' ? 148 : landmark.kind === 'ruin' ? 140 : 126,
    risk_level: landmark.kind === 'ruin' ? 3 : 2,
    reward_gold: landmark.kind === 'ruin' ? 285 : 230,
    reward_reputation: 8,
    deadline_days: 4,
    travel_deadline_day: state.day + 4,
    strategic_value: landmark.kind === 'watchtower' ? 68 : 54,
    objective_type: objectiveByKind[landmark.kind],
    failure_cost: 55,
    status: 'available',
    hidden_difficulty: landmark.kind === 'ruin' ? 5 : 4,
    hidden_reward_gold: landmark.kind === 'ruin' ? 340 : 270,
    hidden_enemy_archetypes: landmark.kind === 'watchtower' ? ['Defender', 'Hunter'] : ['Opportunist', 'Controller'],
    rumor_accuracy: 0.9,
    created_at: isoNow(),
    updated_at: isoNow()
  };
}

function choicesForLandmark(landmark: Landmark): SiteOperationChoice[] {
  switch (landmark.kind) {
    case 'ruin':
      return ['secure_cache', 'deep_survey'];
    case 'shrine':
      return ['take_blessing', 'question_keepers'];
    case 'harbor':
      return ['broker_deal', 'inspect_harbor'];
    case 'watchtower':
      return ['secure_cache', 'question_keepers'];
    case 'waystation':
      return ['broker_deal', 'secure_cache'];
    case 'wilds':
    default:
      return ['deep_survey', 'secure_cache'];
  }
}

export function resupplyAtCurrentNode(state: GlobalGameState, packs = 12): GlobalGameState {
  const node = state.map_nodes.find((entry) => entry.id === state.company_node_id);
  if (!node) return state;

  const region = state.regions.find((entry) => entry.id === node.region_id);
  const scarcity = 1 + Math.max(0, ((100 - (region?.prosperity ?? 50)) / 100) * 0.7);
  const marketModifier = Math.max(0.8, 1.45 - node.market / 100) * scarcity;
  const totalCost = Math.round(packs * marketModifier * 3);
  if (state.company.gold < totalCost) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - totalCost,
      supplies: Math.min(180, state.company.supplies + packs),
      updated_at: isoNow()
    },
    chronicle: [`Resupplied at ${node.name}: +${packs} supplies for ${totalCost}g.`, ...state.chronicle].slice(0, 80)
  };
}

export function scoutCurrentRegion(state: GlobalGameState): GlobalGameState {
  const node = state.map_nodes.find((entry) => entry.id === state.company_node_id);
  if (!node) return state;

  const cost = Math.max(30, 80 - node.recruit);
  if (state.company.gold < cost) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - cost,
      scouting_level: Math.min(6, state.company.scouting_level + 1),
      updated_at: isoNow()
    },
    contracts: state.contracts.map((contract) =>
      contract.region_id === node.region_id && contract.status === 'available'
        ? { ...contract, rumor_accuracy: Math.min(0.96, contract.rumor_accuracy + 0.16), updated_at: isoNow() }
        : contract
    ),
    chronicle: [`Scouts ride out from ${node.name}; regional contract intelligence sharpens.`, ...state.chronicle].slice(0, 80)
  };
}

export function exploreCurrentNode(state: GlobalGameState): GlobalGameState {
  const node = state.map_nodes.find((entry) => entry.id === state.company_node_id);
  if (!node || state.company.supplies < 4) return state;
  const region = state.regions.find((entry) => entry.id === node.region_id);
  const localContracts = state.contracts.filter((contract) => contract.status === 'available' && contract.location_node_id === node.id).length;
  const loreChance = node.type === 'ruin' || node.strategic_role === 'relic_site';
  const prosperityGain = node.type === 'city' || node.type === 'port' ? 1 : 0;
  const hiddenLandmarks = state.landmarks.filter((landmark) => landmark.node_id === node.id && !landmark.discovered);
  const discoveredLandmark = hiddenLandmarks[0] ?? null;
  const routeIntelBoost = discoveredLandmark?.discovery_reward === 'route_intel' ? 0.12 : 0;
  const marketBoost = discoveredLandmark?.discovery_reward === 'market_edge' ? 2 : 0;
  const logisticsBoost = discoveredLandmark?.discovery_reward === 'safe_camp' ? 2 : 0;
  const chronicleDetail = discoveredLandmark
    ? ` Landmark found: ${discoveredLandmark.name}.`
    : loreChance
      ? ' Relic traces marked.'
      : '.';

  return {
    ...state,
    company: {
      ...state.company,
      supplies: Math.max(0, state.company.supplies - 4),
      scouting_level: Math.min(6, state.company.scouting_level + 1),
      updated_at: isoNow()
    },
    region_fame: state.region_fame.map((entry) =>
      entry.regionId === node.region_id
        ? {
            ...entry,
            fame: Math.min(100, entry.fame + 2.2),
            publicRenown: Math.min(100, entry.publicRenown + 1.1)
          }
        : entry
    ),
    regions: state.regions.map((entry) =>
      entry.id === node.region_id
        ? {
            ...entry,
            prosperity: Math.min(100, entry.prosperity + prosperityGain),
            updated_at: isoNow()
          }
        : entry
    ),
    contracts: state.contracts.map((contract) =>
      contract.region_id === node.region_id && contract.status === 'available'
        ? { ...contract, rumor_accuracy: Math.min(0.98, contract.rumor_accuracy + 0.08 + routeIntelBoost), updated_at: isoNow() }
        : contract
    ),
    map_nodes: state.map_nodes.map((entry) =>
      entry.id === node.id
        ? {
            ...entry,
            market: Math.min(100, entry.market + marketBoost),
            logistics: Math.min(100, entry.logistics + logisticsBoost)
          }
        : entry
    ),
    map_routes: state.map_routes.map((route) =>
      route.unlock_landmark_id && route.unlock_landmark_id === discoveredLandmark?.id
        ? {
            ...route,
            discovered: true
          }
        : route
    ),
    landmarks: state.landmarks.map((landmark) =>
      landmark.id === discoveredLandmark?.id
        ? {
            ...landmark,
            discovered: true
          }
        : landmark
    ),
    chronicle: [
      `Exploration sweep at ${node.name}: ${localContracts} local leads checked, routes traced through ${region?.name ?? 'the frontier'}${chronicleDetail}`,
      ...state.chronicle
    ].slice(0, 80)
  };
}

export function activateCurrentLandmark(state: GlobalGameState, landmarkId: string): GlobalGameState {
  const landmark = state.landmarks.find((entry) => entry.id === landmarkId && entry.node_id === state.company_node_id);
  if (!landmark || !landmark.discovered || landmark.activated) return state;

  const discoveredRoutes = state.map_routes.filter((route) => route.unlock_landmark_id === landmark.id && route.discovered).length;
  const nextLibrary = state.library.some((entry) => entry.title === `Survey Notes: ${landmark.name}`)
    ? state.library
    : [buildLandmarkLore(landmark), ...state.library];
  const nextStash =
    landmark.kind === 'ruin' || landmark.kind === 'harbor'
      ? [buildLandmarkItem(landmark), ...state.stash]
      : state.stash;
  const contractAlreadyExists = state.contracts.some((contract) => contract.title.includes(landmark.name) && contract.status === 'available');
  const nextContracts = contractAlreadyExists ? state.contracts : [buildLandmarkContract(state, landmark), ...state.contracts];
  const companyPatch =
    landmark.discovery_reward === 'safe_camp'
      ? {
          supplies: Math.min(180, state.company.supplies + 6),
          medicine: state.company.medicine + 1
        }
      : landmark.discovery_reward === 'market_edge'
        ? {
            gold: state.company.gold + 45,
            trade_goods: Math.max(0, state.company.trade_goods - 1)
          }
        : {
            scouting_level: Math.min(6, state.company.scouting_level + 1)
          };

  return {
    ...state,
    company: {
      ...state.company,
      ...companyPatch,
      updated_at: isoNow()
    },
    mercenaries:
      landmark.discovery_reward === 'safe_camp'
        ? state.mercenaries.map((mercenary) =>
            mercenary.alive
              ? {
                  ...mercenary,
                  fatigue: Math.max(0, mercenary.fatigue - 10),
                  morale: Math.min(100, mercenary.morale + 4),
                  updated_at: isoNow()
                }
              : mercenary
          )
        : state.mercenaries,
    contracts: nextContracts,
    library: nextLibrary,
    stash: nextStash,
    active_site_operation: null,
    landmarks: state.landmarks.map((entry) =>
      entry.id === landmark.id
        ? {
            ...entry,
            activated: true
          }
        : entry
    ),
    chronicle: [
      `${landmark.name} is worked for advantage: ${discoveredRoutes > 0 ? `${discoveredRoutes} hidden route${discoveredRoutes > 1 ? 's' : ''} entered into the atlas` : 'the site yields field value'}, and fresh opportunities open at once.`,
      ...state.chronicle
    ].slice(0, 80)
  };
}

export function beginLandmarkOperation(state: GlobalGameState, landmarkId: string): GlobalGameState {
  const landmark = state.landmarks.find((entry) => entry.id === landmarkId && entry.node_id === state.company_node_id);
  if (!landmark || !landmark.discovered || state.active_travel || state.active_site_operation) return state;

  return {
    ...state,
    active_site_operation: {
      landmark_id: landmark.id,
      node_id: landmark.node_id,
      title: landmark.name,
      description: landmark.summary,
      choices: choicesForLandmark(landmark)
    }
  };
}

export function resolveLandmarkOperation(state: GlobalGameState, choice: SiteOperationChoice): GlobalGameState {
  const operation = state.active_site_operation;
  if (!operation || !operation.choices.includes(choice)) return state;
  const landmark = state.landmarks.find((entry) => entry.id === operation.landmark_id);
  if (!landmark) return { ...state, active_site_operation: null };
  const addSiteContract = (input: GlobalGameState, currentContracts: GlobalGameState['contracts']) =>
    currentContracts.some((contract) => contract.title.includes(landmark.name) && contract.status === 'available')
      ? currentContracts
      : [buildLandmarkContract(input, landmark), ...currentContracts];

  let next = activateCurrentLandmark({ ...state, active_site_operation: null }, landmark.id);
  const company = { ...next.company };
  let contracts = next.contracts;
  let chronicleLine = `${landmark.name} is resolved through field work.`;

  switch (choice) {
    case 'secure_cache':
      company.supplies = Math.min(180, company.supplies + 8);
      company.ammunition += 4;
      chronicleLine = `${landmark.name}: a secured cache yields rations, powder and a cleaner route back out.`;
      break;
    case 'deep_survey':
      company.supplies = Math.max(0, company.supplies - 5);
      next = {
        ...next,
        mercenaries: next.mercenaries.map((mercenary) =>
          mercenary.alive ? { ...mercenary, fatigue: Math.min(100, mercenary.fatigue + 6), updated_at: isoNow() } : mercenary
        )
      };
      contracts = addSiteContract(next, contracts);
      chronicleLine = `${landmark.name}: the company pushes deeper, mapping chambers and dragging out a harder follow-up opportunity.`;
      break;
    case 'take_blessing':
      next = {
        ...next,
        mercenaries: next.mercenaries.map((mercenary) =>
          mercenary.alive
            ? {
                ...mercenary,
                morale: Math.min(100, mercenary.morale + 6),
                stress: Math.max(0, mercenary.stress - 5),
                updated_at: isoNow()
              }
            : mercenary
        )
      };
      chronicleLine = `${landmark.name}: the company accepts rites and leaves steadier, quieter and harder to shake.`;
      break;
    case 'question_keepers':
      contracts = addSiteContract(next, contracts);
      company.scouting_level = Math.min(6, company.scouting_level + 1);
      chronicleLine = `${landmark.name}: its keepers trade names, timings and grudges for coin and discretion.`;
      break;
    case 'broker_deal':
      company.gold += 60;
      company.trade_goods += 1;
      chronicleLine = `${landmark.name}: brokers open a profitable side arrangement and quietly expand your commercial reach.`;
      break;
    case 'inspect_harbor':
      company.permits = Array.from(new Set([...company.permits, landmark.region_id]));
      contracts = addSiteContract(next, contracts);
      chronicleLine = `${landmark.name}: manifests, chains and berths are inspected, opening better passage and a sharper contract.`;
      break;
  }

  return {
    ...next,
    company: {
      ...company,
      updated_at: isoNow()
    },
    contracts,
    chronicle: [chronicleLine, ...next.chronicle].slice(0, 80)
  };
}

export function recruitAtCurrentNode(state: GlobalGameState): GlobalGameState {
  const node = state.map_nodes.find((entry) => entry.id === state.company_node_id);
  if (!node || node.recruit < 15) return state;

  const level = node.type === 'capital' || node.type === 'city' || node.type === 'fortress' ? 2 : 1;
  const originByNodeType = {
    capital: 'noble_house',
    city: 'city_urchin',
    village: 'frontier_peasant',
    fortress: 'veteran_levy',
    ruin: 'outlaw_band',
    port: 'city_urchin',
    crossing: 'frontier_peasant',
    outpost: 'veteran_levy'
  } as const;
  const recruit = buildRecruit(state.company.id, level, originByNodeType[node.type]);
  const adjustedRecruit = {
    ...recruit,
    hire_cost: Math.round(recruit.hire_cost * Math.max(0.82, 1.25 - node.recruit / 100))
  };

  return recruitMercenary(state, adjustedRecruit);
}

export function buyCampaignStock(state: GlobalGameState, medicine = 4, ammunition = 10): GlobalGameState {
  const node = state.map_nodes.find((entry) => entry.id === state.company_node_id);
  if (!node) return state;
  const totalCost = Math.round(medicine * Math.max(8, 18 - node.market / 8) + ammunition * Math.max(2, 7 - node.market / 18));
  if (state.company.gold < totalCost) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - totalCost,
      medicine: state.company.medicine + medicine,
      ammunition: state.company.ammunition + ammunition,
      updated_at: isoNow()
    },
    chronicle: [`Bought medical stock and ammunition at ${node.name} for ${totalCost}g.`, ...state.chronicle].slice(0, 80)
  };
}

export function establishForwardPost(state: GlobalGameState): GlobalGameState {
  const node = state.map_nodes.find((entry) => entry.id === state.company_node_id);
  if (!node) return state;
  if (state.forward_posts.some((post) => post.node_id === node.id)) return state;
  const cost = Math.max(120, 260 - node.logistics * 2);
  if (state.company.gold < cost || state.company.supplies < 18) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - cost,
      supplies: state.company.supplies - 18,
      updated_at: isoNow()
    },
    forward_posts: [
      ...state.forward_posts,
      {
        id: `post_${node.id}`,
        node_id: node.id,
        stash_supplies: 20,
        stash_medicine: 3,
        stash_ammunition: 8,
        guard_rating: 18 + node.repair / 3,
        level: 1,
        integrity: 100,
        specialty: 'supply',
        created_at: isoNow()
      }
    ],
    chronicle: [`A forward post is established at ${node.name}.`, ...state.chronicle].slice(0, 80)
  };
}

export function fortifyCurrentPost(state: GlobalGameState): GlobalGameState {
  const post = state.forward_posts.find((entry) => entry.node_id === state.company_node_id);
  if (!post) return state;
  const cost = 90 + post.level * 45;
  if (state.company.gold < cost || state.company.supplies < 8) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - cost,
      supplies: state.company.supplies - 8,
      updated_at: isoNow()
    },
    forward_posts: state.forward_posts.map((entry) =>
      entry.node_id === state.company_node_id
        ? {
            ...entry,
            level: Math.min(3, entry.level + 1),
            integrity: Math.min(100, entry.integrity + 14),
            guard_rating: Math.min(100, entry.guard_rating + 9)
          }
        : entry
    ),
    chronicle: [`The post at ${state.map_nodes.find((node) => node.id === state.company_node_id)?.name ?? 'the frontier'} is fortified for ${cost}g.`, ...state.chronicle].slice(0, 80)
  };
}

export function specializeCurrentPost(
  state: GlobalGameState,
  specialty: 'supply' | 'medical' | 'military'
): GlobalGameState {
  const post = state.forward_posts.find((entry) => entry.node_id === state.company_node_id);
  if (!post || post.specialty === specialty) return state;
  const cost = 70 + post.level * 20;
  if (state.company.gold < cost) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - cost,
      updated_at: isoNow()
    },
    forward_posts: state.forward_posts.map((entry) =>
      entry.node_id === state.company_node_id
        ? {
            ...entry,
            specialty,
            guard_rating: specialty === 'military' ? Math.min(100, entry.guard_rating + 6) : entry.guard_rating,
            stash_medicine: specialty === 'medical' ? entry.stash_medicine + 4 : entry.stash_medicine,
            stash_ammunition: specialty === 'military' ? entry.stash_ammunition + 6 : entry.stash_ammunition,
            stash_supplies: specialty === 'supply' ? entry.stash_supplies + 8 : entry.stash_supplies
          }
        : entry
    ),
    chronicle: [`The forward post is reorganized around ${specialty} operations.`, ...state.chronicle].slice(0, 80)
  };
}

export function investInLocalInfrastructure(state: GlobalGameState): GlobalGameState {
  const node = state.map_nodes.find((entry) => entry.id === state.company_node_id);
  if (!node) return state;

  const region = state.regions.find((entry) => entry.id === node.region_id);
  const cost = Math.round(110 + (node.market + node.logistics + node.repair) * 0.7);
  if (state.company.gold < cost) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - cost,
      updated_at: isoNow()
    },
    map_nodes: state.map_nodes.map((entry) =>
      entry.id === node.id
        ? {
            ...entry,
            market: Math.min(100, entry.market + 4),
            logistics: Math.min(100, entry.logistics + 5),
            repair: Math.min(100, entry.repair + 3),
            recruit: Math.min(100, entry.recruit + 2)
          }
        : entry
    ),
    regions: state.regions.map((entry) =>
      entry.id === node.region_id
        ? {
            ...entry,
            prosperity: Math.min(100, entry.prosperity + 3),
            stability: Math.min(100, entry.stability + 2)
          }
        : entry
    ),
    forward_posts: state.forward_posts.map((entry) =>
      entry.node_id === node.id
        ? { ...entry, guard_rating: Math.min(100, entry.guard_rating + 3) }
        : entry
    ),
    chronicle: [`You invest ${cost}g into roads, brokers and local repair crews at ${node.name}.`, ...state.chronicle].slice(0, 80)
  };
}

export function setTravelPolicy(state: GlobalGameState, policy: TravelPolicy): GlobalGameState {
  return {
    ...state,
    company: {
      ...state.company,
      travel_policy: policy,
      updated_at: isoNow()
    }
  };
}

export function depositSuppliesAtPost(state: GlobalGameState): GlobalGameState {
  const post = state.forward_posts.find((entry) => entry.node_id === state.company_node_id);
  if (!post || state.company.supplies < 10) return state;
  return {
    ...state,
    company: {
      ...state.company,
      supplies: state.company.supplies - 10,
      updated_at: isoNow()
    },
    forward_posts: state.forward_posts.map((entry) =>
      entry.node_id === state.company_node_id ? { ...entry, stash_supplies: Math.min(60, entry.stash_supplies + 10) } : entry
    ),
    chronicle: [`Supplies transferred into the post stores at ${state.map_nodes.find((node) => node.id === state.company_node_id)?.name ?? 'the post'}.`, ...state.chronicle].slice(0, 80)
  };
}

export function withdrawSuppliesFromPost(state: GlobalGameState): GlobalGameState {
  const post = state.forward_posts.find((entry) => entry.node_id === state.company_node_id);
  if (!post || post.stash_supplies <= 0) return state;
  const lifted = Math.min(10, post.stash_supplies);
  return {
    ...state,
    company: {
      ...state.company,
      supplies: Math.min(180, state.company.supplies + lifted),
      updated_at: isoNow()
    },
    forward_posts: state.forward_posts.map((entry) =>
      entry.node_id === state.company_node_id ? { ...entry, stash_supplies: entry.stash_supplies - lifted } : entry
    ),
    chronicle: [`Supplies withdrawn from the post at ${state.map_nodes.find((node) => node.id === state.company_node_id)?.name ?? 'the post'}.`, ...state.chronicle].slice(0, 80)
  };
}

export { buyPackAnimal, buyRegionalPermit, buyTradeGoods, sellTradeGoods };
