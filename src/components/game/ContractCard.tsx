import type { Contract } from '../../types/game';

export function ContractCard(props: {
  contract: Contract;
  selected: boolean;
  intel: { estDifficulty: string; estReward: string; risk: string; possibleEnemies: string[] };
  locationLabel?: string;
  onSelect: () => void;
}) {
  const c = props.contract;
  return (
    <article className={`contract-card panel ${props.selected ? 'selected' : ''}`} onClick={props.onSelect}>
      <h3>{c.title}</h3>
      <p>{c.description}</p>
      {c.briefing && <p className="contract-briefing">{c.briefing}</p>}
      <div className="stat-row">
        <span>Theme: {c.theme ?? 'mixed'}</span>
        <span>Patron: {c.patron ?? 'Unknown'}</span>
      </div>
      <div className="stat-row">
        <span>Type: {c.type.replace('_', ' ')}</span>
        <span>Deadline: {c.deadline_days}d</span>
        {props.locationLabel && <span>Location: {props.locationLabel}</span>}
      </div>
      <div className="stat-row">
        <span>Strategic Value: {c.strategic_value}</span>
        {c.extraction_node_id && <span>Extraction Required</span>}
        {c.negotiated && <span>Negotiated Terms</span>}
      </div>
      <div className="intel-row">
        <span>Est. Difficulty: {props.intel.estDifficulty}</span>
        <span>Est. Reward: {props.intel.estReward}g</span>
      </div>
      <div className="intel-row">
        <span className={`risk ${props.intel.risk}`}>Risk: {props.intel.risk}</span>
        <span>Enemy Intel: {props.intel.possibleEnemies.join(', ')}</span>
      </div>
      {c.reward_note && <p className="contract-reward-note">Reward note: {c.reward_note}</p>}
    </article>
  );
}
