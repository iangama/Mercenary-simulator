import type { CombatantSnapshot } from '../types/game';
import { rand } from '../lib/utils/rng';

export const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v));

export function initiativeScore(unit: CombatantSnapshot) {
  return unit.speed * rand(0.9, 1.1) + unit.morale * 0.2 - unit.fatigue * 0.15;
}

export function hitChance(attacker: CombatantSnapshot, defender: CombatantSnapshot) {
  return clamp(0.7, 0.97, 0.82 + (attacker.speed - defender.speed) / 300 + attacker.discipline / 500);
}

export function critChance(attacker: CombatantSnapshot) {
  return Math.min(0.35, attacker.speed / 220 + attacker.morale / 500);
}

export function damageRoll(attacker: CombatantSnapshot, defender: CombatantSnapshot, skillMultiplier: number, bonusDamage = 0) {
  const fatiguePenaltyMultiplier = 1 - attacker.fatigue / 200;
  const baseDamage = (attacker.attack + bonusDamage) * skillMultiplier * fatiguePenaltyMultiplier;
  const mitigated = baseDamage * (1 - defender.defense / (defender.defense + 100));
  return Math.max(1, mitigated * rand(0.85, 1.15));
}

export function injuryChanceOnDowned(riskLevel: number, regionDanger: number, injuryReduction = 0) {
  return clamp(0.05, 0.95, 0.15 + riskLevel * 0.12 + regionDanger * 0.05 - injuryReduction);
}

export function deathChanceOnDowned(riskLevel: number, enemyBrutality: number) {
  return clamp(0.03, 0.95, 0.05 + riskLevel * 0.08 + enemyBrutality * 0.04);
}

export function xpRequired(level: number) {
  return 100 * Math.pow(level, 1.5);
}
