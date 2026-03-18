import { isoNow } from '../lib/utils/id';
import type { GlobalGameState, Mercenary } from '../types/game';

function updateMercenary(state: GlobalGameState, mercenary: Mercenary): Mercenary {
  if (!mercenary.alive) return mercenary;

  const poor = state.company.gold < 120;
  const overstretched = state.company.supplies < 18 || Boolean(state.active_travel);
  const winning = state.company.campaign_progress >= 100 || state.campaign_status === 'ascendant' || state.campaign_status === 'dominating';

  const loyaltyDelta = (poor ? -3 : 1) + (winning ? 2 : 0) + (mercenary.trait === 'Loyal' ? 1 : 0) - (mercenary.trait === 'Ambitious' && !winning ? 1 : 0);
  const stressDelta = (overstretched ? 5 : -3) + (mercenary.fatigue >= 55 ? 4 : 0) + (poor ? 3 : 0);
  const camaraderieDelta = mercenary.trait === 'Hotheaded' ? -1 : 1;

  return {
    ...mercenary,
    loyalty: Math.max(0, Math.min(100, mercenary.loyalty + loyaltyDelta)),
    ambition: Math.max(0, Math.min(100, mercenary.ambition + (winning ? 1 : 0))),
    camaraderie: Math.max(0, Math.min(100, mercenary.camaraderie + camaraderieDelta)),
    stress: Math.max(0, Math.min(100, mercenary.stress + stressDelta)),
    morale: Math.max(0, Math.min(100, mercenary.morale + (winning ? 1 : poor ? -2 : 0))),
    updated_at: isoNow()
  };
}

export function simulateCompanyDynamics(state: GlobalGameState): GlobalGameState {
  const mercenaries = state.mercenaries.map((mercenary) => updateMercenary(state, mercenary));
  const atRisk = mercenaries.find((mercenary) => mercenary.alive && mercenary.loyalty <= 18 && mercenary.stress >= 72 && mercenary.fatigue >= 60);
  const desertionTriggered = Boolean(atRisk && state.company.gold <= 40);
  const nextMercenaries = desertionTriggered ? mercenaries.filter((mercenary) => mercenary.id !== atRisk!.id) : mercenaries;

  const note =
    desertionTriggered && atRisk
      ? `${atRisk.name} deserts the company after pay failures and campaign strain.`
      : `Camp discipline settles: loyalty, stress and camaraderie shift with the company's fortunes.`;

  return {
    ...state,
    mercenaries: nextMercenaries,
    chronicle: [note, ...state.chronicle].slice(0, 80)
  };
}
