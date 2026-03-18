import { classGrowth } from '../lib/constants/balance';
import type { Mercenary } from '../types/game';
import { xpRequired } from './formulas';

export function xpFromMission(enemyPower: number, riskModifier: number) {
  return Math.round(enemyPower * 5 * riskModifier);
}

export function applyXpAndLevel(mercenary: Mercenary, gainedXp: number): Mercenary {
  const next = { ...mercenary, xp: mercenary.xp + gainedXp };
  while (next.xp >= xpRequired(next.level)) {
    next.xp -= xpRequired(next.level);
    next.level += 1;
    const g = classGrowth[next.class];
    next.max_hp += g.hp;
    next.hp += g.hp;
    next.attack += g.attack;
    next.defense += g.defense;
    next.speed += g.speed;
    next.morale += g.morale;
    next.discipline += g.discipline;
  }
  return next;
}
