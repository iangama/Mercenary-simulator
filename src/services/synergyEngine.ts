import type { Mercenary } from '../types/game';

export interface TeamSynergy {
  name: string;
  description: string;
  damageBonus: number;
  defenseBonus: number;
  hitBonus: number;
  initiativeBonus: number;
  injuryReduction: number;
  active: boolean;
}

function bonus(base: number, matching: number, required: number) {
  return base * (matching / required);
}

export function computeSynergies(squad: Mercenary[]): TeamSynergy[] {
  const frontline = squad.filter((m) => m.class === 'Vanguard' || m.class === 'Bruiser').length;
  const hunters = squad.filter((m) => m.class === 'Duelist' || m.class === 'Archer').length;
  const hasTactician = squad.some((m) => m.class === 'Tactician');
  const ranged = squad.filter((m) => m.class === 'Archer').length;
  const hasMedic = squad.some((m) => m.class === 'Medic');

  const frontlineStability = frontline >= 2;
  const hunterPack = hunters >= 2;
  const tacticalNet = hasTactician && ranged >= 1;
  const fieldSustain = hasMedic && frontline >= 1;

  return [
    {
      name: 'Frontline Stability',
      description: '2+ frontline units reinforce shieldwall cohesion.',
      damageBonus: 0,
      defenseBonus: frontlineStability ? bonus(0.2, frontline, 2) : 0,
      hitBonus: 0,
      initiativeBonus: 0,
      injuryReduction: frontlineStability ? 0.04 : 0,
      active: frontlineStability
    },
    {
      name: 'Hunter Pack',
      description: 'Fast finishers punish weakened targets.',
      damageBonus: hunterPack ? bonus(0.18, hunters, 2) : 0,
      defenseBonus: 0,
      hitBonus: hunterPack ? 0.03 : 0,
      initiativeBonus: 0,
      injuryReduction: 0,
      active: hunterPack
    },
    {
      name: 'Tactical Net',
      description: 'Tactician + ranged unit improves target acquisition.',
      damageBonus: 0,
      defenseBonus: 0,
      hitBonus: tacticalNet ? 0.07 : 0,
      initiativeBonus: tacticalNet ? 0.08 : 0,
      injuryReduction: 0,
      active: tacticalNet
    },
    {
      name: 'Field Sustain',
      description: 'Medic reduces post-battle losses in frontline.',
      damageBonus: 0,
      defenseBonus: 0.04,
      hitBonus: 0,
      initiativeBonus: 0,
      injuryReduction: fieldSustain ? 0.12 : 0,
      active: fieldSustain
    }
  ];
}

export function aggregateSynergy(synergies: TeamSynergy[]) {
  return synergies.reduce(
    (acc, s) => {
      if (!s.active) return acc;
      acc.damageBonus += s.damageBonus;
      acc.defenseBonus += s.defenseBonus;
      acc.hitBonus += s.hitBonus;
      acc.initiativeBonus += s.initiativeBonus;
      acc.injuryReduction += s.injuryReduction;
      return acc;
    },
    { damageBonus: 0, defenseBonus: 0, hitBonus: 0, initiativeBonus: 0, injuryReduction: 0 }
  );
}
