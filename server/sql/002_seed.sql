insert into factions (id, name, motto, notes, doctrine, aggression, wealth, honor, player_relation)
values
('fac_iron_oath', 'Iron Oath Compact', 'A road held is a realm held.', 'Quartermasters, magistrates and disciplined convoy soldiers.', 'Law and logistics', 45, 75, 82, 10),
('fac_red_briar', 'Red Briar League', 'Take the ridge, name the law later.', 'Militia captains and frontier opportunists bound together by expansion.', 'Expansionist militias', 74, 58, 39, -5),
('fac_amber_church', 'Amber Church', 'Ash remembers what men forget.', 'Prelates, relic escorts and political pilgrims.', 'Sacred hierarchy', 28, 67, 88, 5)
on conflict (id) do nothing;

insert into regions (id, name, biome, danger_level, stability, prosperity, faction_control, front_state, unlocked, threat_pressure, rival_presence)
values
('reg_blackfen', 'Blackfen Frontier', 'Marshland', 3, 52, 35, 'fac_red_briar', 'conflict', true, 58, 42),
('reg_sunscar', 'Sunscar Plains', 'Windswept Steppe', 2, 64, 59, 'fac_iron_oath', 'stable', true, 36, 28),
('reg_emberfall', 'Emberfall Basin', 'Volcanic badlands', 4, 41, 44, 'fac_red_briar', 'siege', false, 67, 60),
('reg_hallowport', 'Hallowport March', 'Coastal trade belt', 2, 70, 81, 'fac_iron_oath', 'tense', false, 22, 50)
on conflict (id) do nothing;

insert into companies (
  id, name, gold, renown_tier, base_level, supplies, medicine, ammunition, trade_goods, pack_animals, cargo_capacity,
  permits, travel_policy, campaign_progress, fatigue_modifier, scouting_level
)
values ('company_player', 'Ashen Banner Company', 920, 1, 1, 70, 16, 30, 0, 2, 110, '["reg_sunscar"]'::jsonb, 'evade', 0, 1, 1)
on conflict (id) do nothing;

insert into world_events (id, type, title, description, region_id, faction_id, severity, duration_days, active)
values
('evt_bandit_blackfen', 'bandit_uprising', 'Bandit Uprising in Blackfen', 'Outlaw confederacies strike roads and depots.', 'reg_blackfen', 'fac_red_briar', 3, 6, true),
('evt_relic_sunscar', 'relic_rumor', 'Relic Rumor on Sunscar Trade Wind', 'Competing companies mobilize scouts for hidden basilica vaults.', 'reg_sunscar', 'fac_amber_church', 2, 5, true),
('evt_harbor_book_hallowport', 'civil_dispute', 'Harbor Book Tampering', 'Dock ledgers are being rewritten overnight.', 'reg_hallowport', 'fac_iron_oath', 2, 7, true),
('evt_emberfall_siege', 'war_escalation', 'Ashfall Batteries Open', 'Siege engines in Emberfall are trading fire over the ridge line.', 'reg_emberfall', 'fac_red_briar', 4, 6, true)
on conflict (id) do nothing;
