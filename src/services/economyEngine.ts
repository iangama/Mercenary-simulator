import { isoNow } from '../lib/utils/id';
import type { BaseUpgrade, GlobalGameState, Mercenary } from '../types/game';

export function recruitmentCost(level: number, rarityModifier: number) {
  return 100 + level * 50 + rarityModifier;
}

export function salaryCost(level: number, reputationTierModifier: number) {
  return 10 + level * 6 + reputationTierModifier;
}

export function healingCost(severity: number, infirmaryLevel: number) {
  return Math.max(10, Math.round(40 + severity * 25 - infirmaryLevel * 12));
}

export function baseUpgradeCost(baseCost: number, currentLevel: number) {
  return Math.round(baseCost * Math.pow(currentLevel + 1, 1.4));
}

export function applyPayrollAndRecovery(state: GlobalGameState): GlobalGameState {
  const payroll = state.mercenaries.filter((m) => m.alive).reduce((n, m) => n + m.salary, 0);
  const infirmary = state.base_upgrades.find((u) => u.type === 'Infirmary')?.level ?? 0;
  const upkeep =
    state.company.pack_animals * 3 +
    state.forward_posts.reduce((sum, post) => sum + 5 + post.level * 2, 0) +
    Math.max(0, Math.round(state.company.trade_goods * 0.5));

  const mercenaries: Mercenary[] = state.mercenaries.map((m) => {
    if (!m.alive) return m;
    const fatigueDrop = 6 + (state.base_upgrades.find((u) => u.type === 'Mess Hall')?.level ?? 0) * 2;
    return {
      ...m,
      hp: Math.min(m.max_hp, m.hp + 8 + infirmary * 3),
      fatigue: Math.max(0, m.fatigue - fatigueDrop),
      updated_at: isoNow()
    };
  });

  const company = {
    ...state.company,
    gold: Math.max(0, state.company.gold - payroll - upkeep),
    supplies: Math.max(0, state.company.supplies - Math.max(1, Math.floor(state.mercenaries.length / 2)) - state.forward_posts.length),
    updated_at: isoNow()
  };

  return {
    ...state,
    company,
    mercenaries,
    chronicle: [`Payroll paid (${payroll}g) with logistical upkeep (${upkeep}g). Recovery and fatigue updates processed.`, ...state.chronicle].slice(0, 80)
  };
}

export function upgradeBase(state: GlobalGameState, type: BaseUpgrade['type']) {
  const index = state.base_upgrades.findIndex((u) => u.type === type);
  if (index < 0) return state;
  const current = state.base_upgrades[index];
  const cost = baseUpgradeCost(120, current.level);
  if (state.company.gold < cost) return state;

  const upgraded = { ...current, level: current.level + 1, effect_value: current.effect_value * 1.18, updated_at: isoNow() };
  const upgrades = [...state.base_upgrades];
  upgrades[index] = upgraded;

  return {
    ...state,
    company: { ...state.company, gold: state.company.gold - cost, base_level: state.company.base_level + 1, updated_at: isoNow() },
    base_upgrades: upgrades,
    chronicle: [`Base upgraded: ${type} to level ${upgraded.level}.`, ...state.chronicle].slice(0, 80)
  };
}
