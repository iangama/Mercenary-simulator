import type { MissionLogEntry } from '../../types/game';

export function BattleLog({ entries }: { entries: MissionLogEntry[] }) {
  if (entries.length === 0) return <section className="panel battle-log">No mission executed yet.</section>;
  return (
    <section className="panel battle-log">
      <h3>Mission Log</h3>
      {entries.map((entry, index) => (
        <p
          key={`${entry.round}-${index}`}
          className={`log ${entry.type}`}
          style={{ animationDelay: `${index * 45}ms` }}
        >
          {entry.text}
        </p>
      ))}
    </section>
  );
}
