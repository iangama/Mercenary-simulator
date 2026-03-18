create extension if not exists "pgcrypto";

create table if not exists companies (
  id text primary key,
  name text not null,
  gold int not null default 0,
  renown_tier int not null default 1,
  base_level int not null default 1,
  supplies int not null default 0,
  medicine int not null default 0,
  ammunition int not null default 0,
  trade_goods int not null default 0,
  pack_animals int not null default 0,
  cargo_capacity int not null default 0,
  permits jsonb not null default '[]'::jsonb,
  travel_policy text not null default 'evade',
  campaign_progress int not null default 0,
  fatigue_modifier numeric not null default 1,
  scouting_level int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists factions (
  id text primary key,
  name text not null,
  motto text,
  notes text,
  doctrine text not null,
  aggression int not null,
  wealth int not null,
  honor int not null,
  player_relation int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists regions (
  id text primary key,
  name text not null,
  biome text not null,
  danger_level int not null,
  stability int not null,
  prosperity int not null,
  faction_control text not null references factions(id),
  front_state text not null default 'stable',
  unlocked boolean not null default false,
  threat_pressure int not null,
  rival_presence int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists map_nodes (
  id text primary key,
  region_id text not null references regions(id) on delete cascade,
  name text not null,
  type text not null,
  x numeric not null,
  y numeric not null,
  danger int not null,
  market int not null,
  recruit int not null,
  repair int not null,
  logistics int not null,
  political_tension int not null default 0,
  faction_control text not null references factions(id),
  occupation int not null default 100,
  siege_days int not null default 0,
  strategic_role text,
  tags jsonb not null default '[]'::jsonb
);

create table if not exists map_routes (
  id text primary key,
  from_node_id text not null references map_nodes(id) on delete cascade,
  to_node_id text not null references map_nodes(id) on delete cascade,
  terrain text not null,
  distance int not null,
  risk numeric not null,
  control text not null,
  access text not null default 'legal',
  travel_modes jsonb not null default '[]'::jsonb,
  patrol_pressure int not null default 0,
  weather_locked boolean not null default false,
  smuggling_risk numeric not null default 0
);

create table if not exists region_fame (
  region_id text primary key references regions(id) on delete cascade,
  fame numeric not null default 0,
  reliability numeric not null default 0,
  brutality numeric not null default 0,
  public_renown numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists mercenaries (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  name text not null,
  class text not null,
  origin text not null default 'frontier_peasant',
  rarity text not null,
  level int not null default 1,
  xp int not null default 0,
  hp int not null,
  max_hp int not null,
  attack int not null,
  defense int not null,
  speed int not null,
  morale int not null,
  discipline int not null,
  fatigue int not null default 0,
  loyalty int not null default 50,
  ambition int not null default 50,
  camaraderie int not null default 50,
  stress int not null default 0,
  trait text not null,
  alive boolean not null default true,
  hire_cost int not null,
  salary int not null,
  equipment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contracts (
  id text primary key,
  region_id text not null references regions(id),
  location_node_id text references map_nodes(id),
  extraction_node_id text references map_nodes(id),
  faction_id text not null references factions(id),
  theme text,
  patron text,
  type text not null,
  title text not null,
  description text not null,
  briefing text,
  reward_note text,
  difficulty int not null,
  enemy_power int not null,
  risk_level int not null,
  reward_gold int not null,
  reward_reputation int not null,
  deadline_days int not null,
  travel_deadline_day int,
  strategic_value int not null default 0,
  objective_type text,
  failure_cost int,
  negotiated boolean not null default false,
  status text not null,
  chain_id text,
  chain_step int,
  chain_branch text,
  hidden_difficulty int not null,
  hidden_reward_gold int not null,
  hidden_enemy_archetypes jsonb not null default '[]'::jsonb,
  rumor_accuracy numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists injuries (
  id text primary key,
  mercenary_id text not null references mercenaries(id) on delete cascade,
  type text not null,
  severity int not null,
  permanent boolean not null,
  stat_penalty_type text not null,
  stat_penalty_value int not null,
  created_at timestamptz not null default now()
);

create table if not exists base_upgrades (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  type text not null,
  level int not null,
  effect_value numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rival_companies (
  id text primary key,
  name text not null,
  banner text not null default '',
  captain_name text not null default '',
  legend text,
  specialty text not null default 'frontline',
  strength_rating int not null,
  wealth int not null,
  reputation int not null,
  doctrine text not null,
  region_focus text not null references regions(id),
  node_id text references map_nodes(id),
  target_node_id text references map_nodes(id),
  objective text,
  grudges jsonb not null default '[]'::jsonb,
  hostility_to_player int not null,
  roster_power int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists world_events (
  id text primary key,
  type text not null,
  title text not null,
  description text not null,
  region_id text not null references regions(id),
  faction_id text not null references factions(id),
  severity int not null,
  duration_days int not null,
  active boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mission_runs (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  contract_id text not null references contracts(id),
  outcome text not null,
  reward_gold int not null,
  reputation_delta int not null,
  log_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists memorial_entries (
  id text primary key,
  mercenary_id text,
  name text not null,
  class text not null,
  level_at_death int not null,
  cause_of_death text not null,
  notable_events jsonb not null,
  traits jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists forward_posts (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  node_id text not null references map_nodes(id) on delete cascade,
  stash_supplies int not null default 0,
  stash_medicine int not null default 0,
  stash_ammunition int not null default 0,
  guard_rating numeric not null default 0,
  level int not null default 1,
  integrity int not null default 100,
  specialty text not null default 'supply',
  created_at timestamptz not null default now()
);

create table if not exists library_entries (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  title text not null,
  category text not null,
  summary text not null,
  body text not null,
  region_id text references regions(id),
  rarity text not null,
  discovered boolean not null default false,
  acquired_from text not null,
  created_at timestamptz not null default now()
);

create table if not exists game_state (
  company_id text primary key references companies(id) on delete cascade,
  state_json jsonb not null,
  save_version int not null default 1,
  checkpoint_day int,
  campaign_status text,
  summary_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table game_state enable row level security;

create policy if not exists "read_game_state" on game_state
for select using (true);

create policy if not exists "write_game_state" on game_state
for insert with check (true);

create policy if not exists "update_game_state" on game_state
for update using (true) with check (true);
