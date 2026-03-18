import { isoNow } from '../lib/utils/id';
import type { GlobalGameState } from '../types/game';
import { simulateBaseAndPosts } from './basePostEngine';
import { simulateCompanyDynamics } from './companyDynamicsEngine';
import { generateContracts } from './contractGenerator';
import { applyPayrollAndRecovery } from './economyEngine';
import { advanceEvents } from './eventEngine';
import { simulateRivals } from './rivalAiEngine';
import { simulateTerritory } from './territorialEngine';

function deriveSeason(day: number): GlobalGameState['season'] {
  const cycle = Math.floor(((day - 1) % 48) / 12);
  return ['spring', 'summer', 'autumn', 'winter'][cycle] as GlobalGameState['season'];
}

function deriveWeather(state: GlobalGameState): GlobalGameState['weather'] {
  const avgPressure = state.regions.reduce((sum, region) => sum + region.threat_pressure, 0) / Math.max(1, state.regions.length);
  if (state.season === 'winter') return avgPressure > 48 ? 'freeze' : 'fog';
  if (state.season === 'summer') return avgPressure > 55 ? 'heatwave' : 'clear';
  if (state.season === 'autumn') return avgPressure > 52 ? 'storm' : 'rain';
  return avgPressure > 50 ? 'rain' : 'clear';
}

export function runWorldTick(input: GlobalGameState): GlobalGameState {
  let state = { ...input, day: input.day + 1 };
  state = { ...state, season: deriveSeason(state.day) };

  state = advanceEvents(state);
  state = simulateRivals(state);
  state = simulateTerritory(state);
  state = applyPayrollAndRecovery(state);
  state = simulateCompanyDynamics(state);
  state = simulateBaseAndPosts(state);
  state = { ...state, weather: deriveWeather(state) };

  const expired = state.contracts.map((c) => {
    if (c.status !== 'available') return c;
    const nextDeadline = c.deadline_days - 1;
    const travelExpired = c.travel_deadline_day != null && c.travel_deadline_day < state.day;
    const region = state.regions.find((entry) => entry.id === c.region_id);
    const strategicValue = Math.min(100, c.strategic_value + Math.round((region?.threat_pressure ?? 0) / 12) + (region && region.stability < 45 ? 6 : 0));
    const rewardGold = Math.round(c.reward_gold * (1 + Math.max(0, strategicValue - c.strategic_value) / 90));
    if (nextDeadline <= 0 || travelExpired) return { ...c, deadline_days: Math.max(0, nextDeadline), status: 'expired' as const, strategic_value: strategicValue, reward_gold: rewardGold, updated_at: isoNow() };
    return { ...c, deadline_days: nextDeadline, strategic_value: strategicValue, reward_gold: rewardGold, updated_at: isoNow() };
  });

  const stateAfterExpiry = {
    ...state,
    contracts: expired
  };

  state = {
    ...stateAfterExpiry,
    contracts: [...expired.filter((c) => c.status === 'available'), ...generateContracts(stateAfterExpiry, 3)].slice(0, 20)
  };

  const region_fame = state.region_fame.map((f) => ({ ...f, fame: Math.max(0, f.fame - 0.6) }));
  const avgFame = region_fame.reduce((n, f) => n + f.fame, 0) / Math.max(1, region_fame.length);

  const regions = state.regions.map((r) => {
    if (r.unlocked) return r;
    const unlock = avgFame >= 18 && state.company.base_level >= 2;
    return unlock ? { ...r, unlocked: true, updated_at: isoNow() } : r;
  });

  const map_routes = state.map_routes.map((route) => {
    const weatherLocked =
      (state.weather === 'storm' && route.terrain === 'coast') ||
      (state.weather === 'freeze' && route.terrain === 'river') ||
      (state.weather === 'rain' && route.terrain === 'swamp');
    const basePatrol = Math.max(0, (route.patrol_pressure ?? 0) - 3);
    return {
      ...route,
      patrol_pressure: basePatrol,
      weather_locked: weatherLocked,
      control: weatherLocked ? 'restricted' : route.control
    };
  });

  return {
    ...state,
    region_fame,
    regions,
    map_routes,
    campaign_status:
      state.company.campaign_progress >= 220 ? 'dominating'
      : state.company.campaign_progress >= 110 ? 'ascendant'
      : state.company.gold <= 0 && state.mercenaries.filter((m) => m.alive).length <= 2 ? 'collapsed'
      : 'ongoing',
    chronicle: [`Day ${state.day}: ${state.season} ${state.weather} settles over the frontier as contracts rotate and rivals reposition.`, ...state.chronicle].slice(0, 80)
  };
}
