import { isoNow, makeId } from '../lib/utils/id';
import { pick, randInt, roll } from '../lib/utils/rng';
import type { GlobalGameState, Region, WorldEvent } from '../types/game';

const catalog: Array<Pick<WorldEvent, 'type' | 'title' | 'description'>> = [
  { type: 'war_escalation', title: 'War Escalation', description: 'Faction militias mobilize and consume local order.' },
  { type: 'caravan_boom', title: 'Caravan Boom', description: 'Trade routes flood with coin and soft targets.' },
  { type: 'plague', title: 'Fever Plague', description: 'Infection raises medical burden and slows recovery.' },
  { type: 'monster_migration', title: 'Monster Migration', description: 'Predator packs cross region borders.' },
  { type: 'noble_request', title: 'Noble Commission', description: 'High-status patron requests elite protection.' },
  { type: 'bandit_uprising', title: 'Bandit Uprising', description: 'Outlaw confederacies strike roads and depots.' },
  { type: 'famine', title: 'Regional Famine', description: 'Supply crisis increases contract urgency.' },
  { type: 'civil_dispute', title: 'Faction Civil Dispute', description: 'Internal rivalry weakens command cohesion.' },
  { type: 'mercenary_shortage', title: 'Mercenary Shortage', description: 'Hiring becomes expensive and low quality.' },
  { type: 'relic_rumor', title: 'Relic Rumor', description: 'Rumors of relics pull rivals into contention.' },
  { type: 'assassination_wave', title: 'Assassination Wave', description: 'Covert killings increase threat instability.' },
  { type: 'refugee_movement', title: 'Refugee Movement', description: 'Mass displacement reshapes local power.' }
];

const regionalEventFlavor: Record<string, Partial<Record<WorldEvent['type'], { title: string; description: string }>>> = {
  reg_blackfen: {
    bandit_uprising: {
      title: 'Reed Knife Rising',
      description: 'Hidden punts and reed-cutters are turning the marsh toll paths into private killing grounds.'
    },
    plague: {
      title: 'Marsh Fever Bloom',
      description: 'Stagnant water and corpse smoke spread a fever that slows recovery and frightens ferrymen off the roads.'
    }
  },
  reg_sunscar: {
    noble_request: {
      title: 'Dust Court Commission',
      description: 'A noble household wants mercenary discretion before a convoy scandal reaches the open courts.'
    },
    relic_rumor: {
      title: 'Pilgrim Reliquary Whisper',
      description: 'Talk of a sealed reliquary has pulled priests, thieves and escorts onto the same road.'
    }
  },
  reg_emberfall: {
    war_escalation: {
      title: 'Basalt Battery Exchange',
      description: 'Siege engines are trading fire across the ash ridges and every supply lane now matters more than any banner speech.'
    },
    monster_migration: {
      title: 'Ash Maw Migration',
      description: 'Predators driven by quarry blasts are crossing the lower ridges and tearing through straggler camps.'
    }
  },
  reg_hallowport: {
    caravan_boom: {
      title: 'Lantern Fleet Rush',
      description: 'Night convoys are flooding the harbor approaches, bringing both profit and professionally organized theft.'
    },
    civil_dispute: {
      title: 'Harbor Book Schism',
      description: 'Dock clerks, brokers and bonded houses are rewriting customs law by ledger knife rather than decree.'
    }
  }
};

function applyEventPressure(region: Region, event: WorldEvent): Region {
  const severity = event.severity;
  const pressureDelta = event.type === 'caravan_boom' ? -3 : severity * 3;
  const prosperityDelta = event.type === 'caravan_boom' ? severity * 4 : event.type === 'famine' ? -severity * 5 : -severity;
  const stabilityDelta = event.type === 'noble_request' ? 2 : -severity * 2;
  return {
    ...region,
    threat_pressure: Math.max(0, Math.min(100, region.threat_pressure + pressureDelta)),
    prosperity: Math.max(0, Math.min(100, region.prosperity + prosperityDelta)),
    stability: Math.max(0, Math.min(100, region.stability + stabilityDelta)),
    updated_at: isoNow()
  };
}

export function advanceEvents(state: GlobalGameState): GlobalGameState {
  const events = state.events
    .map((e) => ({ ...e, duration_days: e.duration_days - 1, active: e.duration_days - 1 > 0, updated_at: isoNow() }))
    .filter((e) => e.active);

  let regions = [...state.regions];
  for (const event of events) {
    regions = regions.map((r) => (r.id === event.region_id ? applyEventPressure(r, event) : r));
  }

  const dynamicChance = Math.min(0.7, 0.22 + regions.reduce((n, r) => n + (100 - r.stability) / 400, 0));
  if (roll(dynamicChance)) {
    const region = pick(regions);
    const spec = pick(catalog);
    const regional = regionalEventFlavor[region.id]?.[spec.type];
    const newcomer: WorldEvent = {
      id: makeId('evt'),
      type: spec.type,
      title: regional?.title ?? spec.title,
      description: regional?.description ?? spec.description,
      region_id: region.id,
      faction_id: region.faction_control,
      severity: randInt(1, 4),
      duration_days: randInt(3, 7),
      active: true,
      created_at: isoNow(),
      updated_at: isoNow()
    };
    events.unshift(newcomer);
  }

  return {
    ...state,
    regions,
    events,
    chronicle: [
      `Day ${state.day}: ${events[0]?.title ?? 'World conditions'} shifts the balance across the frontier.`,
      ...state.chronicle
    ].slice(0, 80)
  };
}
