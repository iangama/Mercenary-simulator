import type { GlobalGameState } from '../../types/game';

export function ResourceBar({ state, alerts = [] }: { state: GlobalGameState; alerts?: string[] }) {
  const living = state.mercenaries.filter((m) => m.alive).length;
  const wounded = state.mercenaries.filter((m) => m.alive && m.hp < m.max_hp).length;
  const location = state.map_nodes.find((node) => node.id === state.company_node_id);
  return (
    <header className="resource-bar panel">
      <div>
        <h1>Mercenary Company</h1>
        <p>
          {state.company.name} • Day {state.day}
          {location ? ` • ${location.name}` : ''}
          {state.active_travel ? ' • In Transit' : ''}
        </p>
        <p>
          {state.campaign_status} campaign • {alerts.length} alert{alerts.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="resource-grid">
        <div><span>Gold</span><strong>{state.company.gold}</strong></div>
        <div><span>Supplies</span><strong>{state.company.supplies}</strong></div>
        <div><span>Medicine</span><strong>{state.company.medicine}</strong></div>
        <div><span>Ammunition</span><strong>{state.company.ammunition}</strong></div>
        <div><span>Roster</span><strong>{living}</strong></div>
        <div><span>Wounded</span><strong>{wounded}</strong></div>
      </div>
    </header>
  );
}
