import type { CombatantSnapshot, EnemyArchetype } from '../types/game';
import { rand } from '../lib/utils/rng';

function priorityByArchetype(archetype: EnemyArchetype, target: CombatantSnapshot, missionRisk: number, factionAggression: number) {
  const hpPct = target.hp / Math.max(1, target.maxHp);
  const lowHpWeight = (1 - hpPct) * 40;
  const supportBonus = target.isSupport ? 22 : 0;
  const downedBonus = target.downed ? 35 : 0;
  const threatScore = target.threat * 0.3;
  const defenseScore = target.defense * 0.25;
  const exposureBonus = target.speed > 26 ? 9 : 2;

  const base = lowHpWeight + supportBonus + downedBonus + threatScore - defenseScore + exposureBonus;

  switch (archetype) {
    case 'Aggressor':
      return base + (target.defense < 20 ? 18 : 0) + factionAggression * 0.1;
    case 'Defender':
      return base + (target.class === 'Vanguard' || target.class === 'Bruiser' ? 12 : -4);
    case 'Hunter':
      return base + (hpPct < 0.35 ? 30 : 0) + (target.downed ? 25 : 0) + missionRisk * 8;
    case 'Controller':
      return base + (target.class === 'Tactician' || target.class === 'Medic' ? 18 : 0) + target.morale * 0.2;
    case 'Opportunist':
      return base + (target.defense < 18 ? 20 : 0) + (target.class === 'Archer' ? 9 : 0);
    case 'Fanatic':
      return base + 14 + missionRisk * 6;
    default:
      return base;
  }
}

export function pickEnemyTarget(
  archetype: EnemyArchetype,
  aliveTargets: CombatantSnapshot[],
  missionRisk: number,
  factionAggression: number
): CombatantSnapshot {
  const scored = aliveTargets.map((t) => ({
    target: t,
    score: priorityByArchetype(archetype, t, missionRisk, factionAggression) + rand(-6, 6)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].target;
}
