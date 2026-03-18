import { isoNow, makeId } from '../lib/utils/id';
import { pick } from '../lib/utils/rng';
import type { Contract, EquipmentItem, GlobalGameState, LoreEntry, Region } from '../types/game';

const lorePool: Record<string, Omit<LoreEntry, 'id' | 'created_at' | 'discovered' | 'acquired_from'>[]> = {
  reg_blackfen: [
    {
      title: 'Marsh Toll Register, Year of the Flooded Bell',
      category: 'ledger',
      summary: 'An ugly toll-book that shows how Blackfen crossings changed hands three times in one wet season.',
      body: 'Each page begins as accountancy and ends as confession. Ferrymen paid Red Briar outriders by day and hired smugglers by night. The final clerk notes that no bridge truly belongs to the one who owns it, only to the one who can still reach it in rain.',
      region_id: 'reg_blackfen',
      rarity: 'rare'
    },
    {
      title: 'Reed-Sworn Ballad of Mirecross',
      category: 'ballad',
      summary: 'A rough marching song about wardens who held a drowning crossing for three days.',
      body: 'The verses are inconsistent on names and exact deaths, but precise on the sound: rain on helms, boots in sucking mud, and a horn that only ever blew retreat after everyone worth saving had already crossed.',
      region_id: 'reg_blackfen',
      rarity: 'common'
    },
    {
      title: 'Smuggler Prayer Knotted in Tar Rope',
      category: 'relic_note',
      summary: 'A crude invocation against inspectors, marsh spirits and unpaid partners.',
      body: 'The prayer is half superstition, half route cipher. Certain knots correspond to culverts, reed cuts and bribed ferrymen. It reads like religion only until you realize it is a map no magistrate was meant to see.',
      region_id: 'reg_blackfen',
      rarity: 'rare'
    }
  ],
  reg_sunscar: [
    {
      title: 'Pilgrim Road Homilies, Ninth Wind Copy',
      category: 'book',
      summary: 'A devotional text annotated by caravan guards rather than priests.',
      body: 'Between the sermons are practical notes: where the canyon wind kills torchlight, which prelates travel armed, and how many mules vanish each year to brigands who wear the Church colors badly.',
      region_id: 'reg_sunscar',
      rarity: 'common'
    },
    {
      title: 'Sealed Transcript of the Sunscar Gate Hearings',
      category: 'field_report',
      summary: 'A legal record concerning missing convoy silver, quietly copied for leverage.',
      body: 'The transcript reveals less about theft than about who was permitted to accuse whom. The final testimony breaks off mid-page, followed by the note: "Witness transferred under escort. Record withdrawn from public table."',
      region_id: 'reg_sunscar',
      rarity: 'rare'
    },
    {
      title: 'Wind Ledger of the Pilgrim Inns',
      category: 'ledger',
      summary: 'A route book showing which hostels keep honest rooms and which sell names by candlelight.',
      body: 'The keeper notes are brutally practical. "Good oats, bad locks." "Holy symbols in front room, cutpurses in the stable." "Do not discuss relics unless armed." It is hospitality reduced to operational intelligence.',
      region_id: 'reg_sunscar',
      rarity: 'common'
    }
  ],
  reg_emberfall: [
    {
      title: 'Cinder Quarry Excavation Notes',
      category: 'relic_note',
      summary: 'Field annotations from a failed dig that found military relics under volcanic glass.',
      body: 'The surveyors describe drill points, sealed basalt doors and a smell of lamp oil in chambers undisturbed for decades. Every useful diagram ends with the same warning: "Do not break the lower vault in darkness."',
      region_id: 'reg_emberfall',
      rarity: 'unique'
    },
    {
      title: 'Ash-Cracked Orders of the Fifth Breach',
      category: 'field_report',
      summary: 'Siege orders issued to a unit that never reported back.',
      body: 'The orders are clear, cold and impossible. Advance under battery smoke, secure the breach, deny the quarry galleries, burn the ledgers. Someone expected the men to die. Someone else expected the records to survive them.',
      region_id: 'reg_emberfall',
      rarity: 'rare'
    }
  ],
  reg_hallowport: [
    {
      title: 'Hallowport Harbor Book of Quiet Fees',
      category: 'ledger',
      summary: 'A port ledger listing the prices no honest tariff would ever print.',
      body: 'Every line disguises a bribe as a dock service. Lantern trimming, tide inspection, gull removal, rope blessing. Read closely and it becomes a map of who really governs the harbor after sunset.',
      region_id: 'reg_hallowport',
      rarity: 'rare'
    },
    {
      title: 'Ballad of the Last Unsearched Hull',
      category: 'ballad',
      summary: 'A dockside song about one ship that passed inspection only because everyone was paid enough to look away.',
      body: 'Sung badly and loudly, the ballad remembers names the official books omit. It treats corruption not as scandal but as seaworthy practice. Under the chorus someone has penciled berth numbers and dates.',
      region_id: 'reg_hallowport',
      rarity: 'common'
    }
  ]
};

const relicItems: Record<string, EquipmentItem[]> = {
  reg_blackfen: [
    {
      id: 'eq_mireglass_talon',
      name: 'Mireglass Talon',
      slot: 'trinket',
      rarity: 'rare',
      description: 'A shard of green-black swamp glass worn in a leather cage; it steadies the eye in foul weather.',
      provenance: 'Recovered from a drowned watchtower cache in Blackfen.',
      baseValue: 14,
      scalingFactor: 0.18,
      attackMod: 1,
      defenseMod: 0,
      speedMod: 3,
      moraleMod: 1,
      maxHpMod: 0,
      valueGold: 280
    },
    {
      id: 'eq_reedwarden_cloak',
      name: 'Reedwarden Cloak',
      slot: 'accessory',
      rarity: 'rare',
      description: 'Layered reed-fiber and waxed cloth that breaks the outline of a traveler in marsh fog.',
      provenance: 'Taken from a dead guide who knew too many crossings to be innocent.',
      baseValue: 13,
      scalingFactor: 0.17,
      attackMod: 0,
      defenseMod: 2,
      speedMod: 2,
      moraleMod: 1,
      maxHpMod: 4,
      valueGold: 250
    }
  ],
  reg_sunscar: [
    {
      id: 'eq_pilgrim_bell',
      name: 'Pilgrim Bell of the Ninth Wind',
      slot: 'trinket',
      rarity: 'epic',
      description: 'A small bronze bell said to steady frightened mounts and tired escorts when the canyons start to howl.',
      provenance: 'Recovered from a reliquary cart that arrived missing three guards and one priest.',
      baseValue: 17,
      scalingFactor: 0.2,
      attackMod: 0,
      defenseMod: 1,
      speedMod: 2,
      moraleMod: 4,
      maxHpMod: 0,
      valueGold: 470
    }
  ],
  reg_emberfall: [
    {
      id: 'eq_emberscript_plate',
      name: 'Emberscript Plate',
      slot: 'armor',
      rarity: 'epic',
      description: 'Scored iron lamellae etched with drill-script from a dead frontier legion.',
      provenance: 'Lifted from an Emberfall siege vault that should have remained sealed.',
      baseValue: 18,
      scalingFactor: 0.25,
      attackMod: 0,
      defenseMod: 7,
      speedMod: -1,
      moraleMod: 3,
      maxHpMod: 12,
      valueGold: 540
    },
    {
      id: 'eq_quarry_breach_hammer',
      name: 'Quarry Breach Hammer',
      slot: 'weapon',
      rarity: 'epic',
      description: 'A heavy breach hammer meant for doors, shields and anyone sheltering behind either.',
      provenance: 'Recovered from a collapsed siege gallery in Emberfall.',
      baseValue: 20,
      scalingFactor: 0.26,
      attackMod: 7,
      defenseMod: 1,
      speedMod: -2,
      moraleMod: 0,
      maxHpMod: 6,
      valueGold: 590
    }
  ],
  reg_hallowport: [
    {
      id: 'eq_tideglass_astrolabe',
      name: 'Tideglass Astrolabe',
      slot: 'accessory',
      rarity: 'rare',
      description: 'A dockmaster instrument altered to predict not stars but profitable departures.',
      provenance: 'Confiscated from a bonded captain who vanished before dawn.',
      baseValue: 15,
      scalingFactor: 0.19,
      attackMod: 1,
      defenseMod: 1,
      speedMod: 3,
      moraleMod: 2,
      maxHpMod: 0,
      valueGold: 330
    }
  ]
};

export function awardNarrativeLoot(
  state: GlobalGameState,
  contract: Contract,
  region: Region,
  outcome: string
): { library: LoreEntry[]; stash: EquipmentItem[]; notes: string[] } {
  if (!['flawless_victory', 'costly_victory', 'pyrrhic_victory', 'partial_success'].includes(outcome)) {
    return { library: state.library, stash: state.stash, notes: [] };
  }

  let library = state.library;
  let stash = state.stash;
  const notes: string[] = [];

  const possibleLore = lorePool[region.id] ?? [];
  const undiscovered = possibleLore.filter((entry) => !state.library.some((owned) => owned.title === entry.title));
  if (undiscovered.length > 0 && (contract.theme === 'politics' || contract.theme === 'survival' || contract.type === 'recovery' || contract.location_node_id)) {
    const entry = pick([...undiscovered]);
    library = [
      {
        ...entry,
        id: makeId('lore'),
        created_at: isoNow(),
        discovered: true,
        acquired_from: contract.title
      },
      ...library
    ];
    notes.push(`Recovered archive: ${entry.title}.`);
  }

  const possibleItems = relicItems[region.id] ?? [];
  const undiscoveredItems = possibleItems.filter((item) => !state.stash.some((owned) => owned.id === item.id));
  if (undiscoveredItems.length > 0 && (contract.type === 'recovery' || contract.type === 'hunt' || contract.location_node_id?.includes('quarry') || contract.theme === 'commerce')) {
    const item = pick([...undiscoveredItems]);
    stash = [item, ...stash];
    notes.push(`Relic secured: ${item.name}.`);
  }

  return { library, stash, notes };
}
