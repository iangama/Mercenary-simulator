export const SAVE_VERSION = 2;

const isObject = (value) => Boolean(value) && typeof value === 'object';

export function unwrapState(payload) {
  if (isObject(payload) && isObject(payload.state)) return payload.state;
  return isObject(payload) ? payload : null;
}

export function validateStateEnvelope(payload) {
  const state = unwrapState(payload);
  if (!state) return { ok: false, error: 'state payload missing' };
  if (!isObject(state.company) || typeof state.company.id !== 'string') return { ok: false, error: 'company data missing' };
  if (!Array.isArray(state.mercenaries) || !Array.isArray(state.contracts) || !Array.isArray(state.regions)) {
    return { ok: false, error: 'state collections missing' };
  }
  if (typeof state.day !== 'number') return { ok: false, error: 'state day missing' };
  return { ok: true, state };
}

export function summarizeState(state) {
  return {
    company_name: state.company?.name ?? 'Unknown Company',
    gold: state.company?.gold ?? 0,
    supplies: state.company?.supplies ?? 0,
    location_node_id: state.company_node_id ?? null,
    living_mercenaries: Array.isArray(state.mercenaries) ? state.mercenaries.filter((mercenary) => mercenary.alive).length : 0,
    available_contracts: Array.isArray(state.contracts) ? state.contracts.filter((contract) => contract.status === 'available').length : 0
  };
}

export function buildEnvelope(state, sourceEnvelope = null) {
  const summary = summarizeState(state);
  return {
    version: SAVE_VERSION,
    saved_at: new Date().toISOString(),
    campaign_status: state.campaign_status ?? sourceEnvelope?.campaign_status ?? 'ongoing',
    checkpoint_day: state.day ?? sourceEnvelope?.checkpoint_day ?? 1,
    summary,
    state
  };
}
