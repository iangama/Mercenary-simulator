import { isoNow } from '../lib/utils/id';
import type { GlobalGameState, MapNode } from '../types/game';

export interface MarketSnapshot {
  supplies: number;
  medicine: number;
  ammunition: number;
  animals: number;
  tradeGoodsBuy: number;
  tradeGoodsSell: number;
  permit: number;
}

export function getLocalNode(state: GlobalGameState) {
  return state.map_nodes.find((node) => node.id === state.company_node_id) ?? null;
}

export function getMarketSnapshot(state: GlobalGameState, node: MapNode | null = getLocalNode(state)): MarketSnapshot {
  const region = state.regions.find((entry) => entry.id === node?.region_id);
  const prosperity = region?.prosperity ?? 50;
  const pressure = region?.threat_pressure ?? 40;
  const market = node?.market ?? 40;
  const logistics = node?.logistics ?? 30;
  const scarcity = 1 + (100 - prosperity) / 160 + pressure / 220;
  const efficiency = Math.max(0.65, 1.35 - market / 130 - logistics / 260);

  return {
    supplies: Math.round(3.2 * scarcity * efficiency),
    medicine: Math.round(12 * scarcity * efficiency),
    ammunition: Math.round(5.5 * scarcity * efficiency),
    animals: Math.round(52 * scarcity * Math.max(0.8, 1.25 - logistics / 170)),
    tradeGoodsBuy: Math.round(22 * Math.max(0.75, 1.18 - market / 140)),
    tradeGoodsSell: Math.round(18 * Math.max(0.8, 0.88 + market / 170 + prosperity / 260)),
    permit: Math.round(46 * Math.max(0.9, 1.4 - (region?.stability ?? 50) / 100))
  };
}

export function buyPackAnimal(state: GlobalGameState): GlobalGameState {
  const node = getLocalNode(state);
  if (!node) return state;
  const prices = getMarketSnapshot(state, node);
  if (state.company.gold < prices.animals) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - prices.animals,
      pack_animals: state.company.pack_animals + 1,
      cargo_capacity: state.company.cargo_capacity + 18,
      updated_at: isoNow()
    },
    chronicle: [`A new pack animal is acquired at ${node.name} for ${prices.animals}g.`, ...state.chronicle].slice(0, 80)
  };
}

export function buyRegionalPermit(state: GlobalGameState): GlobalGameState {
  const node = getLocalNode(state);
  if (!node) return state;
  if (state.company.permits.includes(node.region_id)) return state;
  if (!(node.type === 'city' || node.type === 'fortress' || node.type === 'capital' || node.type === 'port')) return state;
  const prices = getMarketSnapshot(state, node);
  if (state.company.gold < prices.permit) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - prices.permit,
      permits: [...state.company.permits, node.region_id],
      updated_at: isoNow()
    },
    chronicle: [`Transit permit secured in ${node.name} for ${prices.permit}g.`, ...state.chronicle].slice(0, 80)
  };
}

export function buyTradeGoods(state: GlobalGameState, units = 4): GlobalGameState {
  const node = getLocalNode(state);
  if (!node) return state;
  const prices = getMarketSnapshot(state, node);
  const cost = prices.tradeGoodsBuy * units;
  if (state.company.gold < cost) return state;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold - cost,
      trade_goods: state.company.trade_goods + units,
      updated_at: isoNow()
    },
    chronicle: [`Trade goods loaded at ${node.name} for ${cost}g. Porters, bribes and shrinkage are now in play.`, ...state.chronicle].slice(0, 80)
  };
}

export function sellTradeGoods(state: GlobalGameState): GlobalGameState {
  const node = getLocalNode(state);
  if (!node || state.company.trade_goods <= 0) return state;
  const prices = getMarketSnapshot(state, node);
  const corruptionLoss = Math.max(0, Math.floor(state.company.trade_goods / 5));
  const effectiveGoods = Math.max(0, state.company.trade_goods - corruptionLoss);
  const revenue = prices.tradeGoodsSell * effectiveGoods;

  return {
    ...state,
    company: {
      ...state.company,
      gold: state.company.gold + revenue,
      trade_goods: 0,
      updated_at: isoNow()
    },
    chronicle: [`Cargo sold at ${node.name} for ${revenue}g after ${corruptionLoss} units vanish to graft, spoilage or theft.`, ...state.chronicle].slice(0, 80)
  };
}
