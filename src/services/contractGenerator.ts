import { contractTypeRiskMod } from '../lib/constants/balance';
import { isoNow, makeId } from '../lib/utils/id';
import { pick, randInt } from '../lib/utils/rng';
import type { Contract, ContractType, GlobalGameState, Region, WorldEvent } from '../types/game';

const contractTitles: Record<ContractType, string[]> = {
  escort: ['Pilgrim Escort', 'Silver Caravan Guard', 'Noble Procession Watch'],
  hunt: ['Ashmarsh Hunt', 'Warg Den Purge', 'Moonfang Pursuit'],
  patrol: ['Frontier Patrol Circuit', 'Road Beacon Sweep', 'Fogline Recon'],
  defense: ['Palisade Last Stand', 'Harbor Ward Defense', 'Shrine Perimeter Hold'],
  recovery: ['Relic Recovery Push', 'Hostage Recovery', 'Banner Retrieval'],
  assassination: ['Cut the Head', 'Silent Knife Contract', 'Warlord Elimination'],
  siege_support: ['Siege Ladder Escort', 'Breach Support', 'Counter-Battery Raid'],
  caravan_security: ['Merchants Under Fire', 'Salt Caravan Security', 'Night Convoy Guard']
};

const types = Object.keys(contractTitles) as ContractType[];
const patrons = {
  war: ['Border Marshal', 'Fortress Chamberlain', 'Militia Banner-Captain'],
  commerce: ['Guild Factor', 'Harbor Broker', 'Salt Caravan Master'],
  politics: ['Noble Envoy', 'Cathedral Prelate', 'Faction Magistrate'],
  survival: ['Village Elder', 'Refugee Speaker', 'Road Warden']
} as const;

const factionPatrons: Record<string, string[]> = {
  fac_iron_oath: ['Iron Oath Quartermaster', 'March Adjutant', 'Convoy Magistrate'],
  fac_red_briar: ['Red Briar Muster Captain', 'Forage Judge', 'League Seizure Clerk'],
  fac_amber_church: ['Amber Reliquary Custodian', 'Processional Canon', 'Ash-Writ Prelate']
};

const regionFlavor: Record<string, {
  titleTags: string[];
  urgencies: string[];
  descriptors: string[];
}> = {
  reg_blackfen: {
    titleTags: ['Marsh', 'Fog', 'Flood', 'Reed', 'Drowned'],
    urgencies: ['is sinking by the hour', 'turns to mud and panic', 'draws knives out of the reeds'],
    descriptors: ['flooded causeways', 'reed-choked crossings', 'half-drowned toll paths']
  },
  reg_sunscar: {
    titleTags: ['Wind', 'Pilgrim', 'Dust', 'Sunscar', 'Steppe'],
    urgencies: ['frays under wind and rumor', 'turns public too quickly', 'travels faster than the caravans'],
    descriptors: ['wind-cut roads', 'pilgrim canyons', 'broad grain tracks']
  },
  reg_emberfall: {
    titleTags: ['Ash', 'Cinder', 'Basalt', 'Ember', 'Siege'],
    urgencies: ['closes under bombardment', 'burns hotter every dusk', 'splits stone and nerve alike'],
    descriptors: ['ash ridges', 'basalt breaches', 'quarry galleries']
  },
  reg_hallowport: {
    titleTags: ['Harbor', 'Lantern', 'Tide', 'Salt', 'Dock'],
    urgencies: ['shifts with every tide table', 'moves under false paperwork', 'draws knives after sunset'],
    descriptors: ['dock approaches', 'salt lanes', 'harbor intake roads']
  }
};

const contractDetails = {
  war: {
    briefings: [
      'Scouts report smoke by dusk and counter-marches before dawn. Expect a battlefield that is already moving.',
      'Quartermasters want the road, not glory. Hold the corridor and they can feed a war for another week.',
      'The patron is less afraid of the enemy than of panic breaking through the settlements behind the line.'
    ],
    rewardNotes: ['Salvage rights on captured kit.', 'Priority claim on seized banners and battlefield correspondence.', 'Militia stores will quietly release munitions to proven companies.']
  },
  commerce: {
    briefings: [
      'Merchants care about sequence and timing. Lose a wagon and the whole route reprices against you.',
      'The road looks calm on paper, but brokers have already doubled escort rates and stopped moving after sunset.',
      'The client is paying for predictability; any delay will be remembered longer than any heroics.'
    ],
    rewardNotes: ['Brokerage letters may unlock better prices in the next market.', 'Choice of cargo salvage after delivery.', 'Warehouse clerks will overlook certain handling fees.']
  },
  politics: {
    briefings: [
      'This is a contract of appearances as much as steel. Witnesses matter, and so do the ones who vanish.',
      'The patron wants results that can be denied in public and praised in private.',
      'Expect sealed letters, nervous retainers and at least one lie in the official story.'
    ],
    rewardNotes: ['Access to sealed correspondence or patronage notes.', 'A favor marker from a local official.', 'Quiet introductions in noble or ecclesial circles.']
  },
  survival: {
    briefings: [
      'The locals are exhausted, underfed and likely armed with tools before weapons. They need relief more than speeches.',
      'The contract begins where the state has already failed. Expect rumor, fear and desperate bargaining.',
      'If you arrive late, the mission may still exist, but not the people who first requested it.'
    ],
    rewardNotes: ['Villagers may reveal hidden stores, tracks or relic rumors.', 'Survivors might surrender a family heirloom in gratitude.', 'Guides and shelter can be secured off the books.']
  }
} as const;

function contractTheme(type: ContractType): NonNullable<Contract['theme']> {
  if (type === 'siege_support' || type === 'defense' || type === 'assassination') return 'war';
  if (type === 'escort' || type === 'caravan_security') return 'commerce';
  if (type === 'recovery') return 'politics';
  return 'survival';
}

function preferredTypesForRegion(state: GlobalGameState, region: Region): ContractType[] {
  if (region.front_state === 'siege') return ['siege_support', 'defense', 'recovery', 'escort'];
  if (region.front_state === 'conflict') return ['defense', 'patrol', 'assassination', 'hunt'];
  if (state.weather === 'storm' || state.weather === 'rain') return ['escort', 'caravan_security', 'recovery', 'patrol'];
  if (region.prosperity > 70) return ['caravan_security', 'escort', 'assassination', 'recovery'];
  return types;
}

function pickPatron(state: GlobalGameState, theme: NonNullable<Contract['theme']>, region: Region) {
  const factionSpecific = factionPatrons[region.faction_control] ?? [];
  const themePool = [...patrons[theme]];
  const pool = [...factionSpecific, ...themePool];
  return pick(pool.length > 0 ? pool : themePool);
}

function titleForRegion(type: ContractType, region: Region) {
  const base = pick(contractTitles[type]);
  const flavor = regionFlavor[region.id];
  if (!flavor) return base;
  return `${pick(flavor.titleTags)} ${base}`;
}

function buildDescription(theme: NonNullable<Contract['theme']>, patron: string, region: Region, type: ContractType, urgency: string, locationName: string) {
  if (theme === 'war') return `${patron} demands ${type.replace('_', ' ')} support around ${locationName} in ${region.name} as the front ${urgency}.`;
  if (theme === 'commerce') return `${patron} needs ${type.replace('_', ' ')} protection around ${locationName} in ${region.name} while routes strain under ${urgency}.`;
  if (theme === 'politics') return `${patron} quietly commissions ${type.replace('_', ' ')} action through ${locationName} in ${region.name} before ${urgency} turns public.`;
  return `${patron} requests ${type.replace('_', ' ')} relief near ${locationName} in ${region.name} while ${urgency} threatens the locals.`;
}

function rumorAccuracy(state: GlobalGameState, regionId: string) {
  const fame = state.region_fame.find((f) => f.regionId === regionId)?.fame ?? 0;
  return Math.max(0.35, Math.min(0.95, 0.45 + state.company.scouting_level * 0.15 + fame / 1000));
}

export function displayContractIntel(contract: Contract) {
  const spread = Math.max(1, Math.round((1 - contract.rumor_accuracy) * 4));
  const estDifficulty = `${Math.max(1, contract.hidden_difficulty - spread)}-${contract.hidden_difficulty + spread}`;
  const estReward = `${Math.round(contract.hidden_reward_gold * (1 - (1 - contract.rumor_accuracy) * 0.35))}-${Math.round(contract.hidden_reward_gold * (1 + (1 - contract.rumor_accuracy) * 0.25))}`;
  const risk = contract.hidden_difficulty + contract.risk_level > 7 ? 'high' : contract.hidden_difficulty + contract.risk_level > 5 ? 'medium' : 'low';
  return {
    estDifficulty,
    estReward,
    risk,
    possibleEnemies: contract.hidden_enemy_archetypes.slice(0, Math.max(1, Math.round(contract.rumor_accuracy * contract.hidden_enemy_archetypes.length)))
  };
}

function buildContract(state: GlobalGameState, region: Region): Contract {
  const type = pick(preferredTypesForRegion(state, region));
  const theme = contractTheme(type);
  const fame = state.region_fame.find((f) => f.regionId === region.id);
  const regionNodes = state.map_nodes.filter((node) => node.region_id === region.id);
  const locationNode = regionNodes.length > 0 ? pick(regionNodes) : null;
  const eventSeverity = state.events.filter((e) => e.region_id === region.id && e.active).reduce((n, e) => n + e.severity, 0);
  const baseDifficulty = Math.max(1, Math.round(region.danger_level + region.threat_pressure / 35 + eventSeverity * 0.3));
  const hiddenDifficulty = Math.min(10, baseDifficulty + randInt(0, 2));
  const riskLevel = Math.max(1, Math.min(5, Math.round(hiddenDifficulty / 2)));
  const rewardScale = 1 + (fame?.fame ?? 0) / 250 + eventSeverity * 0.07;
  const hiddenRewardGold = Math.round((120 + hiddenDifficulty * 65) * rewardScale * contractTypeRiskMod[type]);
  const visibleReward = Math.round(hiddenRewardGold * (0.8 + (fame?.reliability ?? 10) / 120));
  const extractionNode = locationNode && regionNodes.length > 1 ? pick(regionNodes.filter((node) => node.id !== locationNode.id)) : null;
  const deadlineDays = Math.max(2, 7 - Math.round(hiddenDifficulty / 2));
  const patron = pickPatron(state, theme, region);
  const regionalFlavor = regionFlavor[region.id];
  const urgency =
    regionalFlavor?.urgencies
      ? pick([...regionalFlavor.urgencies])
      : region.front_state === 'siege' ? 'closes in by the hour'
      : region.front_state === 'conflict' ? 'intensifies daily'
      : state.weather === 'storm' ? 'stormfall'
      : 'pressure';
  const objective_type =
    type === 'escort' || type === 'caravan_security' ? 'escort'
    : type === 'recovery' ? 'recover'
    : type === 'defense' ? 'hold_line'
    : type === 'assassination' || type === 'hunt' ? 'eliminate'
    : 'breakthrough';
  const detailSet = contractDetails[theme];
  const briefing = pick([...detailSet.briefings]);
  const reward_note = pick([...detailSet.rewardNotes]);

  return {
    id: makeId('ctr'),
    region_id: region.id,
    location_node_id: locationNode?.id,
    faction_id: region.faction_control,
    theme,
    patron,
    type,
    title: titleForRegion(type, region),
    description: buildDescription(theme, patron, region, type, urgency, locationNode?.name ?? region.name),
    briefing: `${briefing} Theater: ${pick(regionalFlavor?.descriptors ?? [region.name])}.`,
    reward_note,
    difficulty: Math.max(1, hiddenDifficulty - 1),
    enemy_power: 95 + hiddenDifficulty * 28,
    risk_level: riskLevel,
    reward_gold: visibleReward,
    reward_reputation: 6 + hiddenDifficulty,
    deadline_days: deadlineDays,
    extraction_node_id: extractionNode?.id,
    travel_deadline_day: state.day + deadlineDays,
    strategic_value: 40 + hiddenDifficulty * 6 + eventSeverity * 4,
    objective_type,
    failure_cost: Math.round(visibleReward * (theme === 'war' ? 0.4 : theme === 'commerce' ? 0.35 : 0.28)),
    status: 'available',
    hidden_difficulty: hiddenDifficulty,
    hidden_reward_gold: hiddenRewardGold,
    hidden_enemy_archetypes: shuffleArchetypes(),
    rumor_accuracy: rumorAccuracy(state, region.id),
    negotiated: false,
    created_at: isoNow(),
    updated_at: isoNow()
  };
}

function specialContractFromEvent(state: GlobalGameState, region: Region, event: WorldEvent): Contract {
  const regionNodes = state.map_nodes.filter((node) => node.region_id === region.id);
  const locationNode = regionNodes.length > 0 ? pick(regionNodes) : undefined;
  const extractionNode = regionNodes.filter((node) => node.id !== locationNode?.id).at(0);
  const type =
    event.type === 'relic_rumor' ? 'recovery'
    : event.type === 'caravan_boom' ? 'caravan_security'
    : event.type === 'war_escalation' ? 'siege_support'
    : event.type === 'assassination_wave' ? 'assassination'
    : event.type === 'refugee_movement' ? 'escort'
    : event.type === 'famine' ? 'escort'
    : 'defense';
  const theme = contractTheme(type);
  const patron = pickPatron(state, theme, region);
  const severity = Math.max(1, event.severity);
  const hiddenDifficulty = Math.min(10, region.danger_level + severity + 2);
  const rewardGold = Math.round((180 + hiddenDifficulty * 80) * contractTypeRiskMod[type]);

  return {
    id: makeId('ctr_evt'),
    region_id: region.id,
    location_node_id: locationNode?.id,
    extraction_node_id: extractionNode?.id,
    faction_id: region.faction_control,
    theme,
    patron,
    type,
    title: `${event.title}: ${titleForRegion(type, region)}`,
    description: `${event.description} ${patron} is now offering a high-priority ${type.replace('_', ' ')} contract in ${region.name}.`,
    briefing: `Special contract triggered by ${event.title}. Expect sharper opposition, tighter timing and unusual collateral pressure on the region.`,
    reward_note: `Special event contract. Completing it should materially shift ${region.name}'s current momentum.`,
    difficulty: Math.max(1, hiddenDifficulty - 1),
    enemy_power: 110 + hiddenDifficulty * 32,
    risk_level: Math.min(5, Math.max(2, Math.round(hiddenDifficulty / 2))),
    reward_gold: rewardGold,
    reward_reputation: 10 + severity * 2,
    deadline_days: Math.max(2, 5 - Math.floor(severity / 2)),
    travel_deadline_day: state.day + Math.max(2, 5 - Math.floor(severity / 2)),
    strategic_value: 62 + severity * 10,
    objective_type:
      type === 'escort' || type === 'caravan_security' ? 'escort'
      : type === 'recovery' ? 'recover'
      : type === 'defense' ? 'hold_line'
      : type === 'assassination' ? 'eliminate'
      : 'breakthrough',
    failure_cost: Math.round(rewardGold * 0.42),
    status: 'available',
    chain_id: `event_${event.id}`,
    chain_step: 1,
    chain_branch: 'success',
    hidden_difficulty: hiddenDifficulty,
    hidden_reward_gold: Math.round(rewardGold * 1.18),
    hidden_enemy_archetypes: shuffleArchetypes(),
    rumor_accuracy: Math.max(0.55, rumorAccuracy(state, region.id)),
    negotiated: false,
    created_at: isoNow(),
    updated_at: isoNow()
  };
}

function shuffleArchetypes() {
  const all = ['Aggressor', 'Defender', 'Hunter', 'Controller', 'Opportunist', 'Fanatic'] as const;
  const sample = [pick([...all]), pick([...all]), pick([...all])];
  return Array.from(new Set(sample));
}

export function generateContracts(state: GlobalGameState, perUnlockedRegion = 2): Contract[] {
  const existing = state.contracts.filter((c) => c.status === 'available');
  const next = [...existing];
  const regions = state.regions.filter((r) => r.unlocked);
  for (const region of regions) {
    const count = existing.filter((c) => c.region_id === region.id && c.status === 'available').length;
    for (let i = count; i < perUnlockedRegion; i += 1) {
      next.push(buildContract(state, region));
    }
  }
  for (const event of state.events.filter((entry) => entry.active)) {
    const region = state.regions.find((candidate) => candidate.id === event.region_id);
    if (!region?.unlocked) continue;
    const specialChainId = `event_${event.id}`;
    if (next.some((contract) => contract.chain_id === specialChainId && contract.status === 'available')) continue;
    if (event.severity >= 3 || event.type === 'relic_rumor' || event.type === 'caravan_boom') {
      next.push(specialContractFromEvent(state, region, event));
    }
  }
  return next;
}
