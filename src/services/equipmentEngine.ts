import { rarityMultiplier } from '../lib/constants/balance';
import type { EquipmentItem, Mercenary } from '../types/game';

export function equipmentScaledValue(item: EquipmentItem, levelFactor: number) {
  return item.baseValue * rarityMultiplier[item.rarity] * levelFactor;
}

export function getEquippedStatBonus(merc: Mercenary) {
  const items = Object.values(merc.equipment).filter(Boolean) as EquipmentItem[];
  const levelScaling = 1 + merc.level * 0.06;
  return items.reduce(
    (acc, item) => {
      const scale = rarityMultiplier[item.rarity] * (item.scalingFactor + levelScaling);
      acc.attack += item.attackMod * scale;
      acc.defense += item.defenseMod * scale;
      acc.speed += item.speedMod * scale;
      acc.morale += item.moraleMod * scale;
      acc.maxHp += item.maxHpMod * scale;
      if (item.specialEffect) acc.effects.add(item.specialEffect);
      return acc;
    },
    { attack: 0, defense: 0, speed: 0, morale: 0, maxHp: 0, effects: new Set<string>() }
  );
}
