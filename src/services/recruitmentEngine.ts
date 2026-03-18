import { isoNow, makeId } from '../lib/utils/id';
import { pick, randInt } from '../lib/utils/rng';
import type { EquipmentRarity, GlobalGameState, Mercenary, MercenaryClass, MercenaryOrigin, MercenaryTrait } from '../types/game';
import { recruitmentCost, salaryCost } from './economyEngine';

const names = ['Brann', 'Kiera', 'Dagan', 'Vera', 'Aston', 'Helena', 'Moro', 'Lys', 'Quill', 'Rhea', 'Jorn', 'Talya'];
const classes: MercenaryClass[] = ['Vanguard', 'Bruiser', 'Duelist', 'Archer', 'Tactician', 'Medic'];
const traits: MercenaryTrait[] = ['Fearless', 'Cowardly', 'Scarred', 'Loyal', 'Ambitious', 'Hotheaded', 'Precise', 'Fragile', 'Ruthless', 'Iron-Willed'];
const origins: MercenaryOrigin[] = ['noble_house', 'frontier_peasant', 'city_urchin', 'veteran_levy', 'temple_ward', 'outlaw_band'];
const rarityPool: EquipmentRarity[] = ['common', 'common', 'uncommon', 'uncommon', 'rare'];

function baseStats(cls: MercenaryClass) {
  return {
    Vanguard: { hp: 120, attack: 24, defense: 36, speed: 14 },
    Bruiser: { hp: 110, attack: 32, defense: 28, speed: 18 },
    Duelist: { hp: 88, attack: 36, defense: 18, speed: 32 },
    Archer: { hp: 84, attack: 34, defense: 17, speed: 31 },
    Tactician: { hp: 90, attack: 22, defense: 24, speed: 24 },
    Medic: { hp: 95, attack: 18, defense: 23, speed: 23 }
  }[cls];
}

function originProfile(origin: MercenaryOrigin) {
  return {
    noble_house: { morale: 6, discipline: 5, loyalty: -6, ambition: 12, camaraderie: -2, salary: 10 },
    frontier_peasant: { morale: 2, discipline: 1, loyalty: 6, ambition: 0, camaraderie: 5, salary: -2 },
    city_urchin: { morale: 0, discipline: -2, loyalty: -1, ambition: 5, camaraderie: 2, salary: -4 },
    veteran_levy: { morale: 3, discipline: 7, loyalty: 4, ambition: 3, camaraderie: 3, salary: 6 },
    temple_ward: { morale: 4, discipline: 4, loyalty: 7, ambition: -2, camaraderie: 4, salary: 2 },
    outlaw_band: { morale: 1, discipline: -4, loyalty: -7, ambition: 8, camaraderie: -3, salary: -1 }
  }[origin];
}

export function buildRecruit(companyId: string, level = 1, forcedOrigin?: MercenaryOrigin): Mercenary {
  const cls = pick(classes);
  const origin = forcedOrigin ?? pick(origins);
  const rarity = pick(rarityPool);
  const stats = baseStats(cls);
  const rarityModifier = rarity === 'rare' ? 120 : rarity === 'uncommon' ? 45 : 10;
  const profile = originProfile(origin);
  return {
    id: makeId('merc'),
    company_id: companyId,
    name: `${pick(names)} ${String.fromCharCode(randInt(65, 90))}.`,
    class: cls,
    origin,
    rarity,
    level,
    xp: 0,
    hp: stats.hp,
    max_hp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
    morale: randInt(45, 65) + profile.morale,
    discipline: randInt(42, 62) + profile.discipline,
    fatigue: 0,
    loyalty: randInt(42, 62) + profile.loyalty,
    ambition: randInt(36, 64) + profile.ambition,
    camaraderie: randInt(38, 62) + profile.camaraderie,
    stress: randInt(0, 12),
    trait: pick(traits),
    alive: true,
    hire_cost: recruitmentCost(level, rarityModifier),
    salary: salaryCost(level, 4) + profile.salary,
    equipment: {},
    created_at: isoNow(),
    updated_at: isoNow()
  };
}

export function recruitMercenary(state: GlobalGameState, mercenary: Mercenary): GlobalGameState {
  const livingRoster = state.mercenaries.filter((member) => member.alive).length;
  const saturationTax = livingRoster >= 10 ? 1.22 : livingRoster >= 8 ? 1.12 : 1;
  const adjustedCost = Math.round(mercenary.hire_cost * saturationTax);
  if (state.company.gold < adjustedCost) return state;
  return {
    ...state,
    company: { ...state.company, gold: state.company.gold - adjustedCost, updated_at: isoNow() },
    mercenaries: [...state.mercenaries, { ...mercenary, hire_cost: adjustedCost }],
    chronicle: [`${mercenary.name} joins the company as ${mercenary.class} for ${adjustedCost}g.`, ...state.chronicle].slice(0, 80)
  };
}
