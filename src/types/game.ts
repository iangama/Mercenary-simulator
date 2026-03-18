export type Id = string;

export type MercenaryClass = 'Vanguard' | 'Bruiser' | 'Duelist' | 'Archer' | 'Tactician' | 'Medic';
export type MercenaryOrigin = 'noble_house' | 'frontier_peasant' | 'city_urchin' | 'veteran_levy' | 'temple_ward' | 'outlaw_band';
export type MercenaryTrait =
  | 'Fearless'
  | 'Cowardly'
  | 'Scarred'
  | 'Loyal'
  | 'Ambitious'
  | 'Hotheaded'
  | 'Precise'
  | 'Fragile'
  | 'Ruthless'
  | 'Iron-Willed';

export type ContractType =
  | 'escort'
  | 'hunt'
  | 'patrol'
  | 'defense'
  | 'recovery'
  | 'assassination'
  | 'siege_support'
  | 'caravan_security';

export type ContractStatus = 'available' | 'taken' | 'expired' | 'resolved';
export type RivalDoctrine = 'Professional' | 'Brutal' | 'Opportunistic' | 'Noble' | 'Fanatical' | 'Ruthless';
export type EnemyArchetype = 'Aggressor' | 'Defender' | 'Hunter' | 'Controller' | 'Opportunist' | 'Fanatic';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'trinket';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type MapNodeType = 'capital' | 'city' | 'village' | 'fortress' | 'ruin' | 'port' | 'crossing' | 'outpost';
export type RouteTerrain = 'road' | 'forest' | 'swamp' | 'hills' | 'mountain' | 'river' | 'coast';
export type RouteAccess = 'legal' | 'permit' | 'smuggler';
export type TravelMode =
  | 'foot'
  | 'horses'
  | 'wagon'
  | 'river_barge'
  | 'coastal_ship'
  | 'forced_march'
  | 'stealth_column'
  | 'guided_route';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'heatwave' | 'freeze';
export type TravelPolicy = 'evade' | 'bribe' | 'fight';
export type FrontState = 'stable' | 'tense' | 'conflict' | 'siege';
export type InterceptionType = 'rival_raiders' | 'border_patrol' | 'smuggler_ambush' | 'warband';
export type InterceptionStance = 'breakthrough' | 'guard_cargo' | 'withdraw' | 'counter_ambush';
export type CampaignStatus = 'ongoing' | 'ascendant' | 'collapsed' | 'dominating';
export type SiteOperationChoice = 'secure_cache' | 'deep_survey' | 'take_blessing' | 'question_keepers' | 'broker_deal' | 'inspect_harbor';
export type JourneyIncidentChoice = 'push_on' | 'make_camp' | 'detour' | 'press_guides';

export interface RegionFame {
  regionId: Id;
  fame: number;
  reliability: number;
  brutality: number;
  publicRenown: number;
}

export interface MapNode {
  id: Id;
  region_id: Id;
  name: string;
  type: MapNodeType;
  x: number;
  y: number;
  danger: number;
  market: number;
  recruit: number;
  repair: number;
  logistics: number;
  political_tension: number;
  faction_control: Id;
  occupation: number;
  siege_days: number;
  strategic_role?: 'corridor' | 'supply_hub' | 'frontier_keep' | 'port_gate' | 'relic_site';
  tags: string[];
}

export interface MapRoute {
  id: Id;
  from: Id;
  to: Id;
  terrain: RouteTerrain;
  distance: number;
  risk: number;
  control: 'open' | 'restricted' | 'hostile';
  access: RouteAccess;
  travel_modes: TravelMode[];
  patrol_pressure?: number;
  weather_locked?: boolean;
  smuggling_risk?: number;
  hidden?: boolean;
  discovered?: boolean;
  unlock_landmark_id?: Id;
}

export interface ActiveTravel {
  route_id: Id;
  from_node_id: Id;
  to_node_id: Id;
  mode: TravelMode;
  progress_days: number;
  total_days: number;
  risk: number;
  supplies_cost: number;
  fatigue_cost: number;
  started_day: number;
}

export interface ActiveInterception {
  id: Id;
  route_id: Id;
  destination_node_id: Id;
  type: InterceptionType;
  enemy_power: number;
  stakes: number;
  delay_days: number;
  discovered: boolean;
}

export interface ActiveSiteOperation {
  landmark_id: Id;
  node_id: Id;
  title: string;
  description: string;
  choices: SiteOperationChoice[];
}

export interface ActiveJourneyIncident {
  id: Id;
  route_id: Id;
  title: string;
  description: string;
  danger: number;
  delay_days: number;
  choices: JourneyIncidentChoice[];
}

export interface TravelOrder {
  target_node_id: Id;
  mode: TravelMode;
  route_ids: Id[];
}

export interface ForwardPost {
  id: Id;
  node_id: Id;
  stash_supplies: number;
  stash_medicine: number;
  stash_ammunition: number;
  guard_rating: number;
  level: number;
  integrity: number;
  specialty: 'supply' | 'medical' | 'military';
  created_at: string;
}

export interface Company {
  id: Id;
  name: string;
  gold: number;
  renown_tier: number;
  base_level: number;
  supplies: number;
  medicine: number;
  ammunition: number;
  trade_goods: number;
  pack_animals: number;
  cargo_capacity: number;
  permits: string[];
  travel_policy: TravelPolicy;
  campaign_progress: number;
  fatigue_modifier: number;
  scouting_level: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentItem {
  id: Id;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  description?: string;
  provenance?: string;
  baseValue: number;
  scalingFactor: number;
  attackMod: number;
  defenseMod: number;
  speedMod: number;
  moraleMod: number;
  maxHpMod: number;
  specialEffect?: 'lifesteal' | 'morale_aura' | 'anti_brute' | 'execute' | 'guardian';
  valueGold: number;
}

export interface LoreEntry {
  id: Id;
  title: string;
  category: 'book' | 'ledger' | 'field_report' | 'relic_note' | 'ballad';
  summary: string;
  body: string;
  region_id?: Id;
  rarity: 'common' | 'rare' | 'unique';
  discovered: boolean;
  acquired_from: string;
  created_at: string;
}

export interface Landmark {
  id: Id;
  node_id: Id;
  region_id: Id;
  name: string;
  kind: 'ruin' | 'waystation' | 'shrine' | 'watchtower' | 'harbor' | 'wilds';
  summary: string;
  discovered: boolean;
  activated?: boolean;
  discovery_reward?: 'route_intel' | 'lore' | 'market_edge' | 'safe_camp';
}

export interface Mercenary {
  id: Id;
  company_id: Id;
  name: string;
  class: MercenaryClass;
  origin: MercenaryOrigin;
  rarity: EquipmentRarity;
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  morale: number;
  discipline: number;
  fatigue: number;
  loyalty: number;
  ambition: number;
  camaraderie: number;
  stress: number;
  trait: MercenaryTrait;
  alive: boolean;
  hire_cost: number;
  salary: number;
  equipment: Partial<Record<EquipmentSlot, EquipmentItem>>;
  created_at: string;
  updated_at: string;
}

export interface Faction {
  id: Id;
  name: string;
  motto?: string;
  notes?: string;
  doctrine: string;
  aggression: number;
  wealth: number;
  honor: number;
  player_relation: number;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: Id;
  region_id: Id;
  location_node_id?: Id;
  extraction_node_id?: Id;
  faction_id: Id;
  theme?: 'war' | 'commerce' | 'politics' | 'survival';
  patron?: string;
  type: ContractType;
  title: string;
  description: string;
  briefing?: string;
  reward_note?: string;
  difficulty: number;
  enemy_power: number;
  risk_level: number;
  reward_gold: number;
  reward_reputation: number;
  deadline_days: number;
  travel_deadline_day?: number;
  strategic_value: number;
  objective_type?: 'hold_line' | 'breakthrough' | 'escort' | 'eliminate' | 'recover';
  failure_cost?: number;
  negotiated?: boolean;
  status: ContractStatus;
  chain_id?: Id;
  chain_step?: number;
  chain_branch?: 'success' | 'failure';
  hidden_difficulty: number;
  hidden_reward_gold: number;
  hidden_enemy_archetypes: EnemyArchetype[];
  rumor_accuracy: number;
  created_at: string;
  updated_at: string;
}

export interface Region {
  id: Id;
  name: string;
  biome: string;
  danger_level: number;
  stability: number;
  prosperity: number;
  faction_control: Id;
  front_state: FrontState;
  unlocked: boolean;
  threat_pressure: number;
  rival_presence: number;
  created_at: string;
  updated_at: string;
}

export interface Injury {
  id: Id;
  mercenary_id: Id;
  type: string;
  severity: number;
  permanent: boolean;
  stat_penalty_type: 'attack' | 'defense' | 'speed' | 'max_hp' | 'morale';
  stat_penalty_value: number;
  created_at: string;
}

export interface BaseUpgrade {
  id: Id;
  company_id: Id;
  type: 'Barracks' | 'Training Yard' | 'Infirmary' | 'War Room' | 'Forge' | 'Mess Hall' | 'Stables';
  level: number;
  effect_value: number;
  created_at: string;
  updated_at: string;
}

export interface RivalCompany {
  id: Id;
  name: string;
  banner: string;
  captain_name: string;
  legend?: string;
  specialty: 'siege' | 'raiding' | 'escort_hunting' | 'trade_warfare' | 'frontline';
  strength_rating: number;
  wealth: number;
  reputation: number;
  doctrine: RivalDoctrine;
  region_focus: Id;
  node_id: Id;
  target_node_id?: Id;
  objective?: 'capture_node' | 'raid_post' | 'steal_contract' | 'shadow_player' | 'fortify_front';
  grudges: string[];
  hostility_to_player: number;
  roster_power: number;
  created_at: string;
  updated_at: string;
}

export interface WorldEvent {
  id: Id;
  type:
    | 'war_escalation'
    | 'caravan_boom'
    | 'plague'
    | 'monster_migration'
    | 'noble_request'
    | 'bandit_uprising'
    | 'famine'
    | 'civil_dispute'
    | 'mercenary_shortage'
    | 'relic_rumor'
    | 'assassination_wave'
    | 'refugee_movement';
  title: string;
  description: string;
  region_id: Id;
  faction_id: Id;
  severity: number;
  duration_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type MissionOutcome =
  | 'flawless_victory'
  | 'costly_victory'
  | 'pyrrhic_victory'
  | 'partial_success'
  | 'failure'
  | 'disaster';

export interface MissionRun {
  id: Id;
  company_id: Id;
  contract_id: Id;
  outcome: MissionOutcome;
  reward_gold: number;
  reputation_delta: number;
  log_json: MissionLogEntry[];
  created_at: string;
}

export interface MissionLogEntry {
  round: number;
  text: string;
  type: 'action' | 'critical' | 'injury' | 'death' | 'morale' | 'summary';
}

export interface MemorialEntry {
  id: Id;
  mercenary_id: Id;
  name: string;
  class: MercenaryClass;
  level_at_death: number;
  cause_of_death: string;
  notable_events: string[];
  traits: MercenaryTrait[];
  created_at: string;
}

export interface CombatantSnapshot {
  id: Id;
  side: 'player' | 'enemy';
  name: string;
  class: MercenaryClass;
  archetype?: EnemyArchetype;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  morale: number;
  discipline: number;
  fatigue: number;
  threat: number;
  position: 'front' | 'back';
  alive: boolean;
  downed: boolean;
  isSupport: boolean;
}

export interface GlobalGameState {
  company: Company;
  company_node_id: Id;
  active_travel: ActiveTravel | null;
  travel_order: TravelOrder | null;
  active_interception: ActiveInterception | null;
  active_site_operation: ActiveSiteOperation | null;
  active_journey_incident: ActiveJourneyIncident | null;
  season: Season;
  weather: Weather;
  campaign_status: CampaignStatus;
  mercenaries: Mercenary[];
  contracts: Contract[];
  factions: Faction[];
  regions: Region[];
  map_nodes: MapNode[];
  map_routes: MapRoute[];
  forward_posts: ForwardPost[];
  injuries: Injury[];
  base_upgrades: BaseUpgrade[];
  rivals: RivalCompany[];
  events: WorldEvent[];
  mission_runs: MissionRun[];
  memorial: MemorialEntry[];
  region_fame: RegionFame[];
  stash: EquipmentItem[];
  library: LoreEntry[];
  landmarks: Landmark[];
  day: number;
  chronicle: string[];
}
