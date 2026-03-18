import type { Screen } from '../../app/useGameController';

const tabs: Array<{ id: Screen; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mercenaries', label: 'Mercenaries' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'squad', label: 'Squad Builder' },
  { id: 'base', label: 'Base' },
  { id: 'rivals', label: 'Rivals' },
  { id: 'chronicle', label: 'Chronicle' },
  { id: 'memorial', label: 'Memorial' }
];

export function TopNav(props: { active: Screen; onChange: (screen: Screen) => void }) {
  return (
    <nav className="top-nav panel">
      <div className="demo-nav-mark">
        <strong>Demo Build</strong>
        <span>Atlas Campaign Slice</span>
      </div>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${props.active === tab.id ? 'active' : ''}`}
          onClick={() => props.onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
