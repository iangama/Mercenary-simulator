import type { EquipmentRarity, MercenaryClass } from '../../types/game';

export const rarityMultiplier: Record<EquipmentRarity, number> = {
  common: 1,
  uncommon: 1.35,
  rare: 1.85,
  epic: 2.65,
  legendary: 4.2
};

export const classGrowth: Record<MercenaryClass, { hp: number; attack: number; defense: number; speed: number; morale: number; discipline: number }> = {
  Vanguard: { hp: 10, attack: 2, defense: 5, speed: 1, morale: 2, discipline: 3 },
  Bruiser: { hp: 7, attack: 5, defense: 4, speed: 3, morale: 2, discipline: 2 },
  Duelist: { hp: 4, attack: 6, defense: 2, speed: 6, morale: 2, discipline: 2 },
  Archer: { hp: 4, attack: 5, defense: 2, speed: 6, morale: 2, discipline: 3 },
  Tactician: { hp: 5, attack: 2, defense: 4, speed: 4, morale: 4, discipline: 5 },
  Medic: { hp: 6, attack: 2, defense: 3, speed: 4, morale: 4, discipline: 4 }
};

export const archetypeSkillMultiplier = {
  Aggressor: 1.2,
  Defender: 0.9,
  Hunter: 1.05,
  Controller: 0.88,
  Opportunist: 1,
  Fanatic: 1.3
} as const;

export const contractTypeRiskMod = {
  escort: 0.9,
  hunt: 1.05,
  patrol: 1,
  defense: 1.1,
  recovery: 1.15,
  assassination: 1.3,
  siege_support: 1.35,
  caravan_security: 1.05
} as const;
