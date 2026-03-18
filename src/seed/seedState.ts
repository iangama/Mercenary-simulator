import type {
  ActiveTravel,
  BaseUpgrade,
  Company,
  Contract,
  EquipmentItem,
  Faction,
  GlobalGameState,
  Landmark,
  LoreEntry,
  MapNode,
  MapRoute,
  Mercenary,
  Region,
  RegionFame,
  RivalCompany,
  WorldEvent
} from '../types/game';
import { isoNow, makeId } from '../lib/utils/id';

const now = isoNow();

const company: Company = {
  id: 'company_player',
  name: 'Ashen Banner Company',
  gold: 920,
  renown_tier: 1,
  base_level: 1,
  supplies: 70,
  medicine: 16,
  ammunition: 30,
  trade_goods: 0,
  pack_animals: 2,
  cargo_capacity: 110,
  permits: ['reg_sunscar'],
  travel_policy: 'evade',
  campaign_progress: 0,
  fatigue_modifier: 1,
  scouting_level: 1,
  created_at: now,
  updated_at: now
};

const factions: Faction[] = [
  { id: 'fac_iron_oath', name: 'Iron Oath Compact', motto: 'A road held is a realm held.', notes: 'Quartermasters, magistrates and disciplined convoy soldiers. Their order is real, but never cheap.', doctrine: 'Law and logistics', aggression: 45, wealth: 75, honor: 82, player_relation: 10, created_at: now, updated_at: now },
  { id: 'fac_red_briar', name: 'Red Briar League', motto: 'Take the ridge, name the law later.', notes: 'Militia captains, seizure courts and frontier opportunists bound together by expansion and fear.', doctrine: 'Expansionist militias', aggression: 74, wealth: 58, honor: 39, player_relation: -5, created_at: now, updated_at: now },
  { id: 'fac_amber_church', name: 'Amber Church', motto: 'Ash remembers what men forget.', notes: 'Austere prelates, relic escorts and political pilgrims who carry doctrine as both faith and administration.', doctrine: 'Sacred hierarchy', aggression: 28, wealth: 67, honor: 88, player_relation: 5, created_at: now, updated_at: now }
];

const regions: Region[] = [
  { id: 'reg_blackfen', name: 'Blackfen Frontier', biome: 'Marshland', danger_level: 3, stability: 52, prosperity: 35, faction_control: 'fac_red_briar', front_state: 'conflict', unlocked: true, threat_pressure: 58, rival_presence: 42, created_at: now, updated_at: now },
  { id: 'reg_sunscar', name: 'Sunscar Plains', biome: 'Windswept Steppe', danger_level: 2, stability: 64, prosperity: 59, faction_control: 'fac_iron_oath', front_state: 'stable', unlocked: true, threat_pressure: 36, rival_presence: 28, created_at: now, updated_at: now },
  { id: 'reg_emberfall', name: 'Emberfall Basin', biome: 'Volcanic badlands', danger_level: 4, stability: 41, prosperity: 44, faction_control: 'fac_red_briar', front_state: 'siege', unlocked: false, threat_pressure: 67, rival_presence: 60, created_at: now, updated_at: now },
  { id: 'reg_hallowport', name: 'Hallowport March', biome: 'Coastal trade belt', danger_level: 2, stability: 70, prosperity: 81, faction_control: 'fac_iron_oath', front_state: 'tense', unlocked: false, threat_pressure: 22, rival_presence: 50, created_at: now, updated_at: now }
];

const region_fame: RegionFame[] = regions.map((r, i) => ({
  regionId: r.id,
  fame: i === 0 ? 16 : 8,
  reliability: i === 1 ? 14 : 10,
  brutality: i === 0 ? 12 : 4,
  publicRenown: i === 0 ? 11 : 6
}));

const map_nodes: MapNode[] = [
  { id: 'node_blackfen_keep', region_id: 'reg_blackfen', name: 'Blackfen Keep', type: 'fortress', x: 18, y: 44, danger: 58, market: 42, recruit: 28, repair: 66, logistics: 52, political_tension: 71, faction_control: 'fac_red_briar', occupation: 58, siege_days: 2, strategic_role: 'frontier_keep', tags: ['garrison', 'marsh-road'] },
  { id: 'node_mirecross', region_id: 'reg_blackfen', name: 'Mirecross', type: 'crossing', x: 28, y: 49, danger: 64, market: 20, recruit: 12, repair: 18, logistics: 24, political_tension: 66, faction_control: 'fac_red_briar', occupation: 51, siege_days: 0, strategic_role: 'corridor', tags: ['river', 'ambush-prone'] },
  { id: 'node_drowned_market', region_id: 'reg_blackfen', name: 'Drowned Market', type: 'village', x: 24, y: 58, danger: 61, market: 54, recruit: 24, repair: 20, logistics: 39, political_tension: 63, faction_control: 'fac_red_briar', occupation: 47, siege_days: 0, strategic_role: 'supply_hub', tags: ['smugglers', 'supplies'] },
  { id: 'node_sunscar_gate', region_id: 'reg_sunscar', name: 'Sunscar Gate', type: 'city', x: 46, y: 38, danger: 26, market: 82, recruit: 55, repair: 58, logistics: 77, political_tension: 24, faction_control: 'fac_iron_oath', occupation: 73, siege_days: 0, strategic_role: 'supply_hub', tags: ['trade', 'contracts'] },
  { id: 'node_pilgrim_road', region_id: 'reg_sunscar', name: 'Pilgrim Road', type: 'outpost', x: 58, y: 34, danger: 31, market: 18, recruit: 16, repair: 28, logistics: 31, political_tension: 19, faction_control: 'fac_amber_church', occupation: 61, siege_days: 0, strategic_role: 'corridor', tags: ['church', 'escort'] },
  { id: 'node_reedplain', region_id: 'reg_sunscar', name: 'Reedplain', type: 'village', x: 55, y: 46, danger: 35, market: 37, recruit: 31, repair: 22, logistics: 42, political_tension: 28, faction_control: 'fac_iron_oath', occupation: 62, siege_days: 0, strategic_role: 'supply_hub', tags: ['grain', 'horses'] },
  { id: 'node_emberwatch', region_id: 'reg_emberfall', name: 'Emberwatch', type: 'fortress', x: 71, y: 56, danger: 72, market: 34, recruit: 20, repair: 61, logistics: 47, political_tension: 77, faction_control: 'fac_red_briar', occupation: 42, siege_days: 5, strategic_role: 'frontier_keep', tags: ['volcanic', 'warfront'] },
  { id: 'node_cinder_quarry', region_id: 'reg_emberfall', name: 'Cinder Quarry', type: 'ruin', x: 80, y: 62, danger: 79, market: 8, recruit: 0, repair: 0, logistics: 8, political_tension: 82, faction_control: 'fac_red_briar', occupation: 31, siege_days: 1, strategic_role: 'relic_site', tags: ['ruin', 'relics'] },
  { id: 'node_hallowport', region_id: 'reg_hallowport', name: 'Hallowport', type: 'port', x: 83, y: 28, danger: 29, market: 88, recruit: 44, repair: 52, logistics: 81, political_tension: 32, faction_control: 'fac_iron_oath', occupation: 69, siege_days: 0, strategic_role: 'port_gate', tags: ['harbor', 'ships'] },
  { id: 'node_tideward', region_id: 'reg_hallowport', name: 'Tideward Docks', type: 'crossing', x: 73, y: 24, danger: 24, market: 61, recruit: 18, repair: 30, logistics: 58, political_tension: 25, faction_control: 'fac_iron_oath', occupation: 64, siege_days: 0, strategic_role: 'corridor', tags: ['river-mouth', 'ferries'] }
];

const map_routes: MapRoute[] = [
  { id: 'route_blackfen_keep_mirecross', from: 'node_blackfen_keep', to: 'node_mirecross', terrain: 'swamp', distance: 2, risk: 0.42, control: 'open', access: 'legal', patrol_pressure: 38, smuggling_risk: 0.18, travel_modes: ['foot', 'horses', 'wagon', 'forced_march', 'stealth_column', 'guided_route'] },
  { id: 'route_mirecross_drowned_market', from: 'node_mirecross', to: 'node_drowned_market', terrain: 'river', distance: 2, risk: 0.47, control: 'open', access: 'smuggler', patrol_pressure: 46, smuggling_risk: 0.31, travel_modes: ['foot', 'river_barge', 'stealth_column', 'guided_route'] },
  { id: 'route_blackfen_keep_sunscar_gate', from: 'node_blackfen_keep', to: 'node_sunscar_gate', terrain: 'road', distance: 3, risk: 0.24, control: 'restricted', access: 'permit', patrol_pressure: 24, smuggling_risk: 0.12, travel_modes: ['foot', 'horses', 'wagon', 'forced_march', 'guided_route'] },
  { id: 'route_mirecross_sunscar_gate_smuggler', from: 'node_mirecross', to: 'node_sunscar_gate', terrain: 'swamp', distance: 2, risk: 0.39, control: 'restricted', access: 'smuggler', patrol_pressure: 33, smuggling_risk: 0.26, hidden: true, discovered: false, unlock_landmark_id: 'lm_mirecross_shrine', travel_modes: ['foot', 'stealth_column', 'guided_route'] },
  { id: 'route_sunscar_gate_pilgrim_road', from: 'node_sunscar_gate', to: 'node_pilgrim_road', terrain: 'road', distance: 2, risk: 0.16, control: 'open', access: 'legal', patrol_pressure: 12, smuggling_risk: 0.06, travel_modes: ['foot', 'horses', 'wagon', 'forced_march', 'stealth_column', 'guided_route'] },
  { id: 'route_sunscar_gate_reedplain', from: 'node_sunscar_gate', to: 'node_reedplain', terrain: 'hills', distance: 2, risk: 0.19, control: 'open', access: 'legal', patrol_pressure: 15, smuggling_risk: 0.08, travel_modes: ['foot', 'horses', 'wagon', 'forced_march', 'stealth_column', 'guided_route'] },
  { id: 'route_reedplain_tideward_postroad', from: 'node_reedplain', to: 'node_tideward', terrain: 'road', distance: 2, risk: 0.17, control: 'open', access: 'legal', patrol_pressure: 10, smuggling_risk: 0.05, hidden: true, discovered: false, unlock_landmark_id: 'lm_reedplain_corrals', travel_modes: ['horses', 'wagon', 'guided_route'] },
  { id: 'route_reedplain_emberwatch', from: 'node_reedplain', to: 'node_emberwatch', terrain: 'mountain', distance: 4, risk: 0.54, control: 'hostile', access: 'permit', patrol_pressure: 57, smuggling_risk: 0.24, travel_modes: ['foot', 'horses', 'forced_march', 'stealth_column', 'guided_route'] },
  { id: 'route_emberwatch_cinder_quarry', from: 'node_emberwatch', to: 'node_cinder_quarry', terrain: 'mountain', distance: 2, risk: 0.68, control: 'hostile', access: 'smuggler', patrol_pressure: 69, smuggling_risk: 0.37, travel_modes: ['foot', 'forced_march', 'stealth_column', 'guided_route'] },
  { id: 'route_sunscar_gate_tideward', from: 'node_sunscar_gate', to: 'node_tideward', terrain: 'road', distance: 3, risk: 0.21, control: 'open', access: 'legal', patrol_pressure: 18, smuggling_risk: 0.07, travel_modes: ['foot', 'horses', 'wagon', 'forced_march', 'guided_route'] },
  { id: 'route_tideward_hallowport', from: 'node_tideward', to: 'node_hallowport', terrain: 'coast', distance: 1, risk: 0.12, control: 'open', access: 'legal', patrol_pressure: 10, smuggling_risk: 0.05, travel_modes: ['foot', 'horses', 'wagon', 'river_barge', 'coastal_ship', 'guided_route'] },
  { id: 'route_hallowport_emberwatch', from: 'node_hallowport', to: 'node_emberwatch', terrain: 'coast', distance: 4, risk: 0.35, control: 'restricted', access: 'permit', patrol_pressure: 28, smuggling_risk: 0.15, travel_modes: ['coastal_ship', 'foot', 'horses', 'guided_route'] },
  { id: 'route_cinder_quarry_hallowport_smoke', from: 'node_cinder_quarry', to: 'node_hallowport', terrain: 'coast', distance: 3, risk: 0.33, control: 'restricted', access: 'smuggler', patrol_pressure: 24, smuggling_risk: 0.18, hidden: true, discovered: false, unlock_landmark_id: 'lm_cinder_vault', travel_modes: ['coastal_ship', 'guided_route', 'stealth_column'] }
];

const equipmentPool: EquipmentItem[] = [
  { id: 'eq_halberd_warden', name: 'Warden Halberd', slot: 'weapon', rarity: 'rare', description: 'A gate-halberd balanced for holding narrow stone entries against cavalry and riot alike.', provenance: 'Forged for the Sunscar gatewatch before the border wars splintered.', baseValue: 14, scalingFactor: 0.24, attackMod: 6, defenseMod: 2, speedMod: -1, moraleMod: 0, maxHpMod: 0, valueGold: 260 },
  { id: 'eq_lacquered_mail', name: 'Lacquered Mail', slot: 'armor', rarity: 'uncommon', description: 'Black plates lacquered in swamp resin; ugly, but it turns rain and blood with equal indifference.', provenance: 'Common issue among marsh road-wardens in Blackfen.', baseValue: 12, scalingFactor: 0.18, attackMod: 0, defenseMod: 5, speedMod: -1, moraleMod: 0, maxHpMod: 10, valueGold: 180 },
  { id: 'eq_hawkeye_charm', name: 'Hawkeye Charm', slot: 'trinket', rarity: 'epic', description: 'A polished brass eye that steadies the breath and sharpens the finishing shot.', provenance: 'Passed down among harbor marksmen who hunted pirates from the sea walls.', baseValue: 16, scalingFactor: 0.22, attackMod: 2, defenseMod: 0, speedMod: 5, moraleMod: 2, maxHpMod: 0, specialEffect: 'execute', valueGold: 420 },
  { id: 'eq_standfast_seal', name: 'Standfast Seal', slot: 'accessory', rarity: 'legendary', description: 'A command seal worn on a braided cord; men say formations break less often within its sight.', provenance: 'Recovered from a dead general whose retreat never reached the history rolls.', baseValue: 20, scalingFactor: 0.32, attackMod: 3, defenseMod: 6, speedMod: 1, moraleMod: 6, maxHpMod: 18, specialEffect: 'guardian', valueGold: 860 },
  { id: 'eq_bloodthirst_edge', name: 'Bloodthirst Edge', slot: 'weapon', rarity: 'legendary', description: 'A long cruel blade that seems to wake only after first blood is drawn.', provenance: 'Whispered to have crossed three mercenary companies without ever being sold.', baseValue: 22, scalingFactor: 0.35, attackMod: 8, defenseMod: 0, speedMod: 3, moraleMod: 0, maxHpMod: 0, specialEffect: 'lifesteal', valueGold: 920 }
];

const library: LoreEntry[] = [
  {
    id: 'lore_banner_founding',
    title: 'Ledger of the Ashen Banner, Opening Month',
    category: 'ledger',
    summary: 'A cramped account of debt, hired steel and the first promises made by the company.',
    body: 'The first pages record feed grain, lamp oil and half-paid wages. The margins hold stranger things: names of creditors, rumors of drowned roads, and a single line underlined twice. "Do not take a contract you cannot reach."',
    region_id: 'reg_sunscar',
    rarity: 'common',
    discovered: true,
    acquired_from: 'Founding records',
    created_at: now
  }
];

const landmarks: Landmark[] = [
  {
    id: 'lm_blackfen_watch',
    node_id: 'node_blackfen_keep',
    region_id: 'reg_blackfen',
    name: 'Fenwatch Beacon',
    kind: 'watchtower',
    summary: 'A half-sunken signal tower whose mirrored hood still marks safe marsh paths when relit.',
    discovered: true,
    activated: false,
    discovery_reward: 'route_intel'
  },
  {
    id: 'lm_mirecross_shrine',
    node_id: 'node_mirecross',
    region_id: 'reg_blackfen',
    name: 'Bridge-Saints Shrine',
    kind: 'shrine',
    summary: 'Small votive stones under the crossing where ferrymen leave toll nails and warning charms.',
    discovered: false,
    activated: false,
    discovery_reward: 'safe_camp'
  },
  {
    id: 'lm_drowned_ledger',
    node_id: 'node_drowned_market',
    region_id: 'reg_blackfen',
    name: 'Drowned Ledger House',
    kind: 'ruin',
    summary: 'A collapsed counting-house where smugglers still hide tariff books and river maps in wax tubes.',
    discovered: false,
    activated: false,
    discovery_reward: 'lore'
  },
  {
    id: 'lm_sunscar_stones',
    node_id: 'node_sunscar_gate',
    region_id: 'reg_sunscar',
    name: 'Sunscar Mile Stones',
    kind: 'waystation',
    summary: 'Carved road-markers that list caravan days, water rights and the names of companies who broke formation here.',
    discovered: true,
    activated: false,
    discovery_reward: 'route_intel'
  },
  {
    id: 'lm_pilgrim_reliquary',
    node_id: 'node_pilgrim_road',
    region_id: 'reg_sunscar',
    name: 'Ash Reliquary',
    kind: 'shrine',
    summary: 'A brass reliquary where escorts pray for winds at their back and no inspection at the next ridge.',
    discovered: false,
    activated: false,
    discovery_reward: 'lore'
  },
  {
    id: 'lm_reedplain_corrals',
    node_id: 'node_reedplain',
    region_id: 'reg_sunscar',
    name: 'Reedplain Horse Corrals',
    kind: 'waystation',
    summary: 'Long fenced runs where remount brokers trade speed for silence and ask no questions after dusk.',
    discovered: false,
    activated: false,
    discovery_reward: 'market_edge'
  },
  {
    id: 'lm_emberwatch_battery',
    node_id: 'node_emberwatch',
    region_id: 'reg_emberfall',
    name: 'Ashfall Battery',
    kind: 'watchtower',
    summary: 'A scorched ridge battery whose observers can read troop smoke across the basin in a single glance.',
    discovered: true,
    activated: false,
    discovery_reward: 'route_intel'
  },
  {
    id: 'lm_cinder_vault',
    node_id: 'node_cinder_quarry',
    region_id: 'reg_emberfall',
    name: 'Cinder Vault Mouth',
    kind: 'ruin',
    summary: 'A furnace-cut vault entrance under the quarry where relic hunters vanish and return richer or not at all.',
    discovered: false,
    activated: false,
    discovery_reward: 'lore'
  },
  {
    id: 'lm_hallowport_chain',
    node_id: 'node_hallowport',
    region_id: 'reg_hallowport',
    name: 'Harbor Chain Tower',
    kind: 'harbor',
    summary: 'A tide tower controlling the chain boom that can close the harbor faster than a convoy can pray.',
    discovered: true,
    activated: false,
    discovery_reward: 'market_edge'
  },
  {
    id: 'lm_tideward_saltroad',
    node_id: 'node_tideward',
    region_id: 'reg_hallowport',
    name: 'Saltroad Ferries',
    kind: 'waystation',
    summary: 'Low draft ferries and rope guides used by pilots who know when a river crossing becomes a smuggler crossing.',
    discovered: false,
    activated: false,
    discovery_reward: 'safe_camp'
  }
];

const mercenaryTemplates = [
  { name: 'Ser Aldren', class: 'Vanguard', trait: 'Loyal', origin: 'noble_house' },
  { name: 'Mira Voss', class: 'Duelist', trait: 'Precise', origin: 'city_urchin' },
  { name: 'Torvin Hale', class: 'Bruiser', trait: 'Hotheaded', origin: 'frontier_peasant' },
  { name: 'Ilya Reed', class: 'Archer', trait: 'Ambitious', origin: 'veteran_levy' },
  { name: 'Sister Ceryn', class: 'Medic', trait: 'Iron-Willed', origin: 'temple_ward' },
  { name: 'Nox Varin', class: 'Tactician', trait: 'Ruthless', origin: 'outlaw_band' }
] as const;

function makeMercenary(index: number): Mercenary {
  const tpl = mercenaryTemplates[index % mercenaryTemplates.length];
  const base = {
    Vanguard: { hp: 128, atk: 24, def: 38, spd: 15 },
    Bruiser: { hp: 110, atk: 33, def: 28, spd: 19 },
    Duelist: { hp: 88, atk: 36, def: 18, spd: 33 },
    Archer: { hp: 82, atk: 34, def: 17, spd: 31 },
    Tactician: { hp: 90, atk: 22, def: 24, spd: 24 },
    Medic: { hp: 95, atk: 18, def: 22, spd: 23 }
  }[tpl.class];

  return {
    id: makeId('merc'),
    company_id: company.id,
    name: tpl.name,
    class: tpl.class,
    origin: tpl.origin,
    rarity: index === 0 ? 'rare' : 'uncommon',
    level: 1,
    xp: 0,
    hp: base.hp,
    max_hp: base.hp,
    attack: base.atk,
    defense: base.def,
    speed: base.spd,
    morale: 58,
    discipline: 54,
    fatigue: index > 3 ? 12 : 4,
    loyalty: tpl.trait === 'Loyal' ? 72 : 56,
    ambition: tpl.trait === 'Ambitious' ? 71 : 48,
    camaraderie: tpl.trait === 'Hotheaded' ? 44 : 58,
    stress: index > 3 ? 18 : 10,
    trait: tpl.trait,
    alive: true,
    hire_cost: 100 + 1 * 50 + (index === 0 ? 90 : 35),
    salary: 10 + 1 * 6 + 4,
    equipment: index === 0 ? { weapon: equipmentPool[0], armor: equipmentPool[1] } : {},
    created_at: now,
    updated_at: now
  };
}

const contracts: Contract[] = [
  {
    id: 'ctr_blackfen_patrol_1',
    region_id: 'reg_blackfen',
    faction_id: 'fac_iron_oath',
    type: 'patrol',
    title: 'Fogline Sweep',
    description: 'Clear raider scouts from flooded roads before supply wagons move.',
    briefing: 'Mirecross lantern crews swear the raiders are marking wheel ruts with chalk and bone splinters. If true, someone is preparing a larger strike behind them.',
    reward_note: 'The quartermaster at Sunscar Gate will release spare powder if the road opens in time.',
    difficulty: 2,
    location_node_id: 'node_mirecross',
    enemy_power: 118,
    risk_level: 2,
    reward_gold: 190,
    reward_reputation: 8,
    deadline_days: 4,
    travel_deadline_day: 4,
    strategic_value: 58,
    objective_type: 'hold_line',
    status: 'available',
    chain_id: 'chain_fogline',
    chain_step: 1,
    chain_branch: 'success',
    hidden_difficulty: 3,
    hidden_reward_gold: 230,
    hidden_enemy_archetypes: ['Opportunist', 'Hunter'],
    rumor_accuracy: 0.72,
    created_at: now,
    updated_at: now
  },
  {
    id: 'ctr_sunscar_escort_1',
    region_id: 'reg_sunscar',
    faction_id: 'fac_amber_church',
    type: 'escort',
    title: 'Pilgrim Corridor',
    description: 'Escort a relic caravan through wind-broken canyons.',
    briefing: 'The reliquary is sealed, but the clergy have tripled the guard count and still refuse to name what is inside. Expect interest from both brigands and rival patrons.',
    reward_note: 'Church factors promise letters of passage and access to pilgrim hostels if the convoy arrives intact.',
    difficulty: 2,
    location_node_id: 'node_pilgrim_road',
    enemy_power: 108,
    risk_level: 1,
    reward_gold: 160,
    reward_reputation: 10,
    deadline_days: 3,
    travel_deadline_day: 3,
    strategic_value: 47,
    objective_type: 'escort',
    status: 'available',
    hidden_difficulty: 2,
    hidden_reward_gold: 165,
    hidden_enemy_archetypes: ['Defender', 'Controller'],
    rumor_accuracy: 0.78,
    created_at: now,
    updated_at: now
  },
  {
    id: 'ctr_blackfen_hunt_2',
    region_id: 'reg_blackfen',
    faction_id: 'fac_red_briar',
    type: 'hunt',
    title: 'Thornbreak Hunt',
    description: 'Track a fanatic warband gathering near drowned watchtowers.',
    briefing: 'The warband has begun burning reeds in circles rather than lines. Locals say they are searching for stone beneath the water, not prey.',
    reward_note: 'Recovered trophies may include maps torn from an older frontier survey.',
    difficulty: 3,
    location_node_id: 'node_drowned_market',
    enemy_power: 145,
    risk_level: 3,
    reward_gold: 280,
    reward_reputation: 7,
    deadline_days: 5,
    travel_deadline_day: 5,
    strategic_value: 73,
    objective_type: 'eliminate',
    status: 'available',
    hidden_difficulty: 4,
    hidden_reward_gold: 320,
    hidden_enemy_archetypes: ['Fanatic', 'Aggressor', 'Hunter'],
    rumor_accuracy: 0.61,
    created_at: now,
    updated_at: now
  },
  {
    id: 'ctr_sunscar_recovery_2',
    region_id: 'reg_sunscar',
    faction_id: 'fac_iron_oath',
    type: 'recovery',
    title: 'Dust Archive Recovery',
    description: 'Recover a sealed chest of convoy records before rival brokers erase the trail.',
    briefing: 'A paymaster died on the road without naming his killers. His ledgers matter more than his body now.',
    reward_note: 'The surviving clerks will sell names and schedules at a discount if the books return unopened.',
    difficulty: 3,
    location_node_id: 'node_reedplain',
    enemy_power: 132,
    risk_level: 2,
    reward_gold: 245,
    reward_reputation: 9,
    deadline_days: 4,
    travel_deadline_day: 4,
    strategic_value: 64,
    objective_type: 'recover',
    status: 'available',
    hidden_difficulty: 4,
    hidden_reward_gold: 292,
    hidden_enemy_archetypes: ['Controller', 'Hunter', 'Opportunist'],
    rumor_accuracy: 0.69,
    created_at: now,
    updated_at: now
  },
  {
    id: 'ctr_hallowport_security_1',
    region_id: 'reg_hallowport',
    faction_id: 'fac_iron_oath',
    type: 'caravan_security',
    title: 'Lantern Fleet Security',
    description: 'Guard a night convoy of bonded cargo through the Tideward approach.',
    briefing: 'The manifests are false, the lantern count is wrong, and the harbor book has already been altered twice. This is valuable cargo under a cheap name.',
    reward_note: 'Harbor brokers may open sealed berths and better trade rates if the convoy lands untouched.',
    difficulty: 3,
    location_node_id: 'node_tideward',
    enemy_power: 136,
    risk_level: 2,
    reward_gold: 260,
    reward_reputation: 8,
    deadline_days: 5,
    travel_deadline_day: 5,
    strategic_value: 61,
    objective_type: 'escort',
    status: 'available',
    hidden_difficulty: 4,
    hidden_reward_gold: 310,
    hidden_enemy_archetypes: ['Opportunist', 'Defender'],
    rumor_accuracy: 0.67,
    created_at: now,
    updated_at: now
  }
];

const base_upgrades: BaseUpgrade[] = [
  { id: makeId('up'), company_id: company.id, type: 'Barracks', level: 1, effect_value: 2, created_at: now, updated_at: now },
  { id: makeId('up'), company_id: company.id, type: 'Infirmary', level: 1, effect_value: 0.12, created_at: now, updated_at: now },
  { id: makeId('up'), company_id: company.id, type: 'War Room', level: 1, effect_value: 1, created_at: now, updated_at: now }
];

const rivals: RivalCompany[] = [
  {
    id: 'riv_graven',
    name: 'Graven Pike Syndicate',
    banner: 'Black pikes over split iron',
    captain_name: 'Marshal Veyr Karth',
    legend: 'Known for arriving one day after a battle only to profit as if they had won it themselves.',
    specialty: 'frontline',
    strength_rating: 138,
    wealth: 840,
    reputation: 45,
    doctrine: 'Ruthless',
    region_focus: 'reg_blackfen',
    node_id: 'node_blackfen_keep',
    objective: 'capture_node',
    grudges: ['Territorial humiliation in Blackfen'],
    hostility_to_player: 35,
    roster_power: 146,
    created_at: now,
    updated_at: now
  },
  {
    id: 'riv_gilded',
    name: 'Gilded Vow Lancers',
    banner: 'Golden sunburst on ivory field',
    captain_name: 'Lady Maris Pell',
    specialty: 'escort_hunting',
    strength_rating: 119,
    wealth: 980,
    reputation: 64,
    doctrine: 'Professional',
    region_focus: 'reg_sunscar',
    node_id: 'node_pilgrim_road',
    objective: 'steal_contract',
    grudges: ['Player undercut a Sunscar patron'],
    hostility_to_player: 18,
    roster_power: 118,
    created_at: now,
    updated_at: now
  },
  {
    id: 'riv_ashhounds',
    name: 'Ashhounds',
    banner: 'Ash wolf on rust cloth',
    captain_name: 'Rook Halvern',
    legend: 'Dockside raiders turned campaign scavengers, notorious for stealing the return leg of a victory.',
    specialty: 'raiding',
    strength_rating: 131,
    wealth: 740,
    reputation: 50,
    doctrine: 'Opportunistic',
    region_focus: 'reg_hallowport',
    node_id: 'node_hallowport',
    objective: 'raid_post',
    grudges: ['Player caravan passed under their nose'],
    hostility_to_player: 27,
    roster_power: 128,
    created_at: now,
    updated_at: now
  }
];

const events: WorldEvent[] = [
  {
    id: 'evt_bandit_blackfen',
    type: 'bandit_uprising',
    title: 'Bandit Uprising in Blackfen',
    description: 'Road keeps are collapsing. Hunt and patrol contracts surge with higher ambush lethality.',
    region_id: 'reg_blackfen',
    faction_id: 'fac_red_briar',
    severity: 3,
    duration_days: 6,
    active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'evt_relic_sunscar',
    type: 'relic_rumor',
    title: 'Relic Rumor on Sunscar Trade Wind',
    description: 'Competing companies are mobilizing scouts for hidden basilica vaults.',
    region_id: 'reg_sunscar',
    faction_id: 'fac_amber_church',
    severity: 2,
    duration_days: 5,
    active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'evt_harbor_book_hallowport',
    type: 'civil_dispute',
    title: 'Harbor Book Tampering',
    description: 'Dock ledgers are being rewritten overnight. Convoys, permits and warehouse claims are all becoming politically dangerous.',
    region_id: 'reg_hallowport',
    faction_id: 'fac_iron_oath',
    severity: 2,
    duration_days: 7,
    active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 'evt_emberfall_siege',
    type: 'war_escalation',
    title: 'Ashfall Batteries Open',
    description: 'Siege engines in Emberfall are trading fire over the ridge line. Fortified nodes and quarry routes are becoming decisive.',
    region_id: 'reg_emberfall',
    faction_id: 'fac_red_briar',
    severity: 4,
    duration_days: 6,
    active: true,
    created_at: now,
    updated_at: now
  }
];

export function createSeedState(): GlobalGameState {
  const active_travel: ActiveTravel | null = null;
  return {
    company,
    company_node_id: 'node_sunscar_gate',
    active_travel,
    travel_order: null,
    active_interception: null,
    active_site_operation: null,
    active_journey_incident: null,
    season: 'spring',
    weather: 'clear',
    campaign_status: 'ongoing',
    mercenaries: [0, 1, 2, 3, 4, 5].map(makeMercenary),
    contracts,
    factions,
    regions,
    map_nodes,
    map_routes,
    forward_posts: [],
    injuries: [],
    base_upgrades,
    rivals,
    events,
    mission_runs: [],
    memorial: [],
    region_fame,
    stash: [equipmentPool[2]],
    library,
    landmarks,
    day: 1,
    chronicle: ['The Ashen Banner Company is founded with coin barely enough for one bad month.']
  };
}
