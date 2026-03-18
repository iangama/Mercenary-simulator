alter table companies add column if not exists medicine int not null default 0;
alter table companies add column if not exists ammunition int not null default 0;
alter table companies add column if not exists trade_goods int not null default 0;
alter table companies add column if not exists pack_animals int not null default 0;
alter table companies add column if not exists cargo_capacity int not null default 0;
alter table companies add column if not exists permits jsonb not null default '[]'::jsonb;
alter table companies add column if not exists travel_policy text not null default 'evade';
alter table companies add column if not exists campaign_progress int not null default 0;
alter table companies add column if not exists scouting_level int not null default 1;

alter table factions add column if not exists motto text;
alter table factions add column if not exists notes text;

alter table regions add column if not exists front_state text not null default 'stable';
alter table regions add column if not exists rival_presence int not null default 0;

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

alter table mercenaries add column if not exists origin text not null default 'frontier_peasant';
alter table mercenaries add column if not exists loyalty int not null default 50;
alter table mercenaries add column if not exists ambition int not null default 50;
alter table mercenaries add column if not exists camaraderie int not null default 50;
alter table mercenaries add column if not exists stress int not null default 0;

alter table contracts add column if not exists location_node_id text references map_nodes(id);
alter table contracts add column if not exists extraction_node_id text references map_nodes(id);
alter table contracts add column if not exists theme text;
alter table contracts add column if not exists patron text;
alter table contracts add column if not exists briefing text;
alter table contracts add column if not exists reward_note text;
alter table contracts add column if not exists travel_deadline_day int;
alter table contracts add column if not exists strategic_value int not null default 0;
alter table contracts add column if not exists objective_type text;
alter table contracts add column if not exists failure_cost int;
alter table contracts add column if not exists negotiated boolean not null default false;

alter table rival_companies add column if not exists banner text not null default '';
alter table rival_companies add column if not exists captain_name text not null default '';
alter table rival_companies add column if not exists legend text;
alter table rival_companies add column if not exists specialty text not null default 'frontline';
alter table rival_companies add column if not exists node_id text references map_nodes(id);
alter table rival_companies add column if not exists target_node_id text references map_nodes(id);
alter table rival_companies add column if not exists objective text;
alter table rival_companies add column if not exists grudges jsonb not null default '[]'::jsonb;

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

alter table game_state add column if not exists save_version int not null default 1;
alter table game_state add column if not exists checkpoint_day int;
alter table game_state add column if not exists campaign_status text;
alter table game_state add column if not exists summary_json jsonb not null default '{}'::jsonb;
