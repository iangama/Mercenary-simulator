import { getEquippedStatBonus } from '../../services/equipmentEngine';
import type { Mercenary } from '../../types/game';

export function MercenaryCard(props: { mercenary: Mercenary; selected?: boolean; onClick?: () => void }) {
  const m = props.mercenary;
  const bonus = getEquippedStatBonus(m);
  return (
    <article className={`merc-card panel ${props.selected ? 'selected' : ''}`} onClick={props.onClick}>
      <h3>{m.name}</h3>
      <p>{m.class} • Lv {m.level} • {m.trait}</p>
      <p>{m.origin.replace('_', ' ')} • loyalty {m.loyalty} • ambition {m.ambition}</p>
      <div className="stat-row">
        <span>HP {m.hp}/{m.max_hp}</span>
        <span>ATK {Math.round(m.attack + bonus.attack)}</span>
        <span>DEF {Math.round(m.defense + bonus.defense)}</span>
        <span>SPD {Math.round(m.speed + bonus.speed)}</span>
      </div>
      <div className="stat-row">
        <span>Morale {m.morale}</span>
        <span>Discipline {m.discipline}</span>
        <span>Bond {m.camaraderie}</span>
        <span>Stress {m.stress}</span>
      </div>
      <div className="equip-row">
        <span>Weapon: {m.equipment.weapon?.name ?? '-'}</span>
        <span>Armor: {m.equipment.armor?.name ?? '-'}</span>
      </div>
      <div className="equip-row">
        <span>Accessory: {m.equipment.accessory?.name ?? '-'}</span>
        <span>Trinket: {m.equipment.trinket?.name ?? '-'}</span>
      </div>
    </article>
  );
}
