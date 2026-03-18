import { isoNow } from '../lib/utils/id';
import type { GlobalGameState } from '../types/game';

export function negotiateContractTerms(state: GlobalGameState, contractId: string): GlobalGameState {
  const contracts = state.contracts.map((contract) => {
    if (contract.id !== contractId || contract.status !== 'available' || contract.negotiated) return contract;
    return {
      ...contract,
      reward_gold: Math.round(contract.reward_gold * 1.18),
      hidden_reward_gold: Math.round(contract.hidden_reward_gold * 1.14),
      risk_level: Math.min(5, contract.risk_level + 1),
      strategic_value: Math.min(100, contract.strategic_value + 6),
      deadline_days: Math.max(1, contract.deadline_days - 1),
      travel_deadline_day: contract.travel_deadline_day ? contract.travel_deadline_day - 1 : contract.travel_deadline_day,
      negotiated: true,
      updated_at: isoNow()
    };
  });

  return {
    ...state,
    contracts,
    chronicle: [`Negotiation secured hazard pay on ${state.contracts.find((contract) => contract.id === contractId)?.title ?? 'a contract'}, but the window tightened.`, ...state.chronicle].slice(0, 80)
  };
}
