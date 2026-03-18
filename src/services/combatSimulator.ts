import { archetypeSkillMultiplier } from '../lib/constants/balance';
import { isoNow, makeId } from '../lib/utils/id';
import { pick, roll, shuffle } from '../lib/utils/rng';
import type {
  CombatantSnapshot,
  Contract,
  EnemyArchetype,
  GlobalGameState,
  Injury,
  MemorialEntry,
  Mercenary,
  MissionLogEntry,
  MissionOutcome,
  MissionRun,
  Region
} from '../types/game';
import { pickEnemyTarget } from './enemyAiEngine';
import { getEquippedStatBonus } from './equipmentEngine';
import { aggregateSynergy, computeSynergies } from './synergyEngine';
import { critChance, damageRoll, deathChanceOnDowned, hitChance, initiativeScore, injuryChanceOnDowned } from './formulas';
import { applyXpAndLevel, xpFromMission } from './progressionEngine';
import { awardNarrativeLoot } from './contentEngine';

interface SimResult {
  state: GlobalGameState;
  log: MissionLogEntry[];
}

interface ObjectiveState {
  progress: number;
  target: number;
}

const enemyClassPool: Record<EnemyArchetype, CombatantSnapshot['class']> = {
  Aggressor: 'Bruiser',
  Defender: 'Vanguard',
  Hunter: 'Duelist',
  Controller: 'Tactician',
  Opportunist: 'Archer',
  Fanatic: 'Bruiser'
};

function createEnemy(index: number, contract: Contract, region: Region): CombatantSnapshot {
  const archetype = contract.hidden_enemy_archetypes[index % contract.hidden_enemy_archetypes.length] ?? 'Aggressor';
  const enemyScale = 1 + Math.max(0, region.rival_presence - 20) / 180 + Math.max(0, region.threat_pressure - 30) / 220;
  const power = (contract.enemy_power / 4 + contract.risk_level * 8 + region.danger_level * 4) * enemyScale;
  return {
    id: makeId('enemy'),
    side: 'enemy',
    name: `${archetype} Raider ${index + 1}`,
    class: enemyClassPool[archetype],
    archetype,
    hp: Math.round(72 + power * 0.45),
    maxHp: Math.round(72 + power * 0.45),
    attack: Math.round(22 + power * 0.15),
    defense: Math.round(14 + power * 0.11),
    speed: Math.round(17 + power * 0.08),
    morale: 44 + contract.risk_level * 7,
    discipline: 40 + region.danger_level * 5,
    fatigue: 0,
    threat: 40,
    position: archetype === 'Controller' || archetype === 'Hunter' || archetype === 'Opportunist' ? 'back' : 'front',
    alive: true,
    downed: false,
    isSupport: archetype === 'Controller'
  };
}

function createPlayerCombatant(merc: Mercenary, synergyDefenseBonus: number): CombatantSnapshot {
  const eq = getEquippedStatBonus(merc);
  return {
    id: merc.id,
    side: 'player',
    name: merc.name,
    class: merc.class,
    hp: Math.round(merc.hp + eq.maxHp),
    maxHp: Math.round(merc.max_hp + eq.maxHp),
    attack: Math.round(merc.attack + eq.attack),
    defense: Math.round((merc.defense + eq.defense) * (1 + synergyDefenseBonus)),
    speed: Math.round(merc.speed + eq.speed),
    morale: Math.round(merc.morale + eq.morale),
    discipline: merc.discipline,
    fatigue: merc.fatigue,
    threat: merc.class === 'Vanguard' ? 64 : merc.class === 'Bruiser' ? 51 : 36,
    position: merc.class === 'Vanguard' || merc.class === 'Bruiser' ? 'front' : 'back',
    alive: merc.alive,
    downed: false,
    isSupport: merc.class === 'Medic' || merc.class === 'Tactician'
  };
}

function determineOutcome(playersAlive: number, totalPlayers: number, enemiesAlive: number, objective: ObjectiveState): MissionOutcome {
  const objectiveComplete = objective.progress >= objective.target;
  if (enemiesAlive === 0 && playersAlive === totalPlayers) return 'flawless_victory';
  if (enemiesAlive === 0 && objectiveComplete && playersAlive >= Math.ceil(totalPlayers * 0.66)) return 'costly_victory';
  if ((enemiesAlive === 0 || objectiveComplete) && playersAlive >= 1) return 'pyrrhic_victory';
  if (playersAlive >= 1 && (enemiesAlive >= 1 || objective.progress > 0)) return 'partial_success';
  if (playersAlive === 0 && enemiesAlive >= 1) return 'disaster';
  return 'failure';
}

function missionRewardMultiplier(outcome: MissionOutcome) {
  return {
    flawless_victory: 1.2,
    costly_victory: 1,
    pyrrhic_victory: 0.82,
    partial_success: 0.55,
    failure: 0.25,
    disaster: 0
  }[outcome];
}

export function simulateMission(state: GlobalGameState, contractId: string, squadIds: string[]): SimResult {
  const contract = state.contracts.find((c) => c.id === contractId);
  if (!contract) return { state, log: [{ round: 0, text: 'Contract not found.', type: 'summary' }] };
  const region = state.regions.find((r) => r.id === contract.region_id);
  if (!region) return { state, log: [{ round: 0, text: 'Region data missing.', type: 'summary' }] };

  const squadMercs = state.mercenaries.filter((m) => squadIds.includes(m.id) && m.alive);
  const synergies = computeSynergies(squadMercs);
  const synergy = aggregateSynergy(synergies);
  const avgLevel = squadMercs.reduce((sum, merc) => sum + merc.level, 0) / Math.max(1, squadMercs.length);
  const campaignPressure = 1 + state.day / 120 + state.company.campaign_progress / 400;
  const objective: ObjectiveState = {
    progress: 0,
    target: contract.objective_type === 'escort' ? 7 : contract.objective_type === 'recover' ? 6 : contract.objective_type === 'hold_line' ? 8 : 5
  };
  const weatherMod = state.weather === 'storm' ? -2 : state.weather === 'fog' ? -1 : state.weather === 'clear' ? 0 : state.weather === 'heatwave' ? -1 : 0;
  const regionTerrainDefense = region.front_state === 'siege' ? 0.08 : region.biome.includes('Marsh') ? 0.05 : 0;

  const players = squadMercs.map((m) => {
    const unit = createPlayerCombatant(m, synergy.defenseBonus + regionTerrainDefense);
    unit.speed = Math.max(5, unit.speed + weatherMod);
    if (contract.objective_type === 'escort' && unit.isSupport) unit.morale += 4;
    return unit;
  });
  const scaledEnemyPower = Math.round(contract.enemy_power * Math.max(1, campaignPressure * (0.95 + avgLevel / 12)));
  const scaledContract = { ...contract, enemy_power: scaledEnemyPower };
  const enemies = Array.from({ length: Math.max(3, Math.min(6, Math.round(scaledEnemyPower / 55))) }, (_, i) => createEnemy(i, scaledContract, region));
  const units = [...players, ...enemies];

  const log: MissionLogEntry[] = [];

  for (let round = 1; round <= 12; round += 1) {
    const alivePlayers = units.filter((u) => u.side === 'player' && u.alive && !u.downed);
    const aliveEnemies = units.filter((u) => u.side === 'enemy' && u.alive && !u.downed);
    if (alivePlayers.length === 0 || aliveEnemies.length === 0) break;

    const turnOrder = shuffle(
      [...alivePlayers, ...aliveEnemies]
        .map((u) => ({ unit: u, init: initiativeScore(u) * (1 + (u.side === 'player' ? synergy.initiativeBonus : 0)) }))
        .sort((a, b) => b.init - a.init)
        .map((x) => x.unit)
    );

    for (const actor of turnOrder) {
      if (!actor.alive || actor.downed) continue;
      const targets = units.filter((u) => u.side !== actor.side && u.alive);
      if (targets.length === 0) continue;

      const target = actor.side === 'enemy'
        ? pickEnemyTarget(actor.archetype ?? 'Aggressor', targets, contract.risk_level, state.factions.find((f) => f.id === contract.faction_id)?.aggression ?? 50)
        : pick(selectPlayerTargets(targets, actor));

      const classAction = actor.side === 'player' ? resolvePlayerAbility(actor, units, target, objective, log, round, contract) : null;
      if (classAction?.skipAttack) continue;

      const attackerHitChance = Math.min(0.99, hitChance(actor, target) + (actor.side === 'player' ? synergy.hitBonus : 0));
      if (!roll(attackerHitChance)) {
        log.push({ round, text: `${actor.name} misses ${target.name}.`, type: 'action' });
        continue;
      }

      const baseSkill = actor.side === 'enemy' ? archetypeSkillMultiplier[actor.archetype ?? 'Aggressor'] : 1;
      const positionMod = actor.position === 'front' && target.position === 'back' ? 0.92 : actor.position === 'back' && target.position === 'back' ? 1.06 : 1;
      const mapPressureBonus = actor.side === 'player' ? contract.strategic_value / 120 : region.front_state === 'siege' ? 0.08 : 0;
      const dmg = damageRoll(actor, target, baseSkill * positionMod, actor.side === 'player' ? actor.attack * (synergy.damageBonus + mapPressureBonus) : 0);
      const isCrit = roll(critChance(actor));
      const final = Math.round(isCrit ? dmg * 1.75 : dmg);
      target.hp -= final;
      if (isCrit) {
        actor.morale += 5;
        target.morale = Math.max(0, target.morale - 5);
      }

      if ((actor.side === 'player' || actor.archetype === 'Hunter') && target.downed && roll(0.35)) {
        target.hp -= Math.round(final * 0.4);
      }

      log.push({
        round,
        text: isCrit
          ? `${actor.name} lands a critical strike on ${target.name} for ${final}.`
          : `${actor.name} hits ${target.name} for ${final}.`,
        type: isCrit ? 'critical' : 'action'
      });

      if (target.hp <= 0 && !target.downed) {
        target.downed = true;
        target.alive = true;
        log.push({ round, text: `${target.name} is downed.`, type: 'injury' });
        if (actor.side === 'player' && (contract.objective_type === 'eliminate' || contract.objective_type === 'breakthrough')) {
          objective.progress += 2;
        }
      }
    }

    objective.progress += objectiveTickGain(players, contract);
  }

  const alivePlayers = units.filter((u) => u.side === 'player' && u.alive && !u.downed);
  const aliveEnemies = units.filter((u) => u.side === 'enemy' && u.alive && !u.downed);
  const outcome = determineOutcome(alivePlayers.length, players.length, aliveEnemies.length, objective);

  const injuryChance = injuryChanceOnDowned(contract.risk_level, region.danger_level, synergy.injuryReduction);
  const deathChance = deathChanceOnDowned(contract.risk_level, contract.risk_level + region.threat_pressure / 35);

  const injuries: Injury[] = [...state.injuries];
  const memorial: MemorialEntry[] = [...state.memorial];

  let mercenaries = state.mercenaries.map((m) => {
    const snap = units.find((u) => u.id === m.id);
    if (!snap) return m;

    let next = { ...m, hp: Math.max(1, Math.min(m.max_hp, snap.hp)), fatigue: Math.min(95, m.fatigue + 9) };

    if (snap.downed) {
      if (roll(deathChance)) {
        next.alive = false;
        next.hp = 0;
        memorial.push({
          id: makeId('mem'),
          mercenary_id: m.id,
          name: m.name,
          class: m.class,
          level_at_death: m.level,
          cause_of_death: `Fell during ${contract.title}`,
          notable_events: [`Contract risk ${contract.risk_level} in ${region.name}`],
          traits: [m.trait],
          created_at: isoNow()
        });
        log.push({ round: 99, text: `${m.name} dies on the field.`, type: 'death' });
      } else if (roll(injuryChance)) {
        const severity = Math.min(5, Math.max(1, Math.round(contract.risk_level + region.danger_level / 2)));
        const penaltyType = pick(['attack', 'defense', 'speed', 'max_hp', 'morale'] as const);
        const penalty = severity * 2;
        injuries.push({
          id: makeId('inj'),
          mercenary_id: m.id,
          type: severity >= 4 ? 'Crippling wound' : 'Battle trauma',
          severity,
          permanent: severity >= 4,
          stat_penalty_type: penaltyType,
          stat_penalty_value: penalty,
          created_at: isoNow()
        });
        next.hp = Math.max(1, Math.round(next.max_hp * 0.35));
        if (penaltyType === 'attack') next.attack = Math.max(5, next.attack - penalty);
        if (penaltyType === 'defense') next.defense = Math.max(5, next.defense - penalty);
        if (penaltyType === 'speed') next.speed = Math.max(5, next.speed - penalty);
        if (penaltyType === 'max_hp') {
          next.max_hp = Math.max(40, next.max_hp - penalty * 3);
          next.hp = Math.min(next.hp, next.max_hp);
        }
        if (penaltyType === 'morale') next.morale = Math.max(10, next.morale - penalty * 2);
        log.push({ round: 99, text: `${m.name} survives but suffers ${severity >= 4 ? 'a permanent injury' : 'a major injury'}.`, type: 'injury' });
      } else {
        next.hp = Math.max(1, Math.round(next.max_hp * 0.45));
      }
    }

    if (next.alive) {
      const xpGain = xpFromMission(scaledEnemyPower, 1 + contract.risk_level * 0.12 + (objective.progress >= objective.target ? 0.15 : 0));
      next = applyXpAndLevel(next, xpGain);
    }

    return next;
  });

  const rewardMultiplier = missionRewardMultiplier(outcome);
  const reward = Math.round(contract.hidden_reward_gold * rewardMultiplier);
  const failurePenalty =
    outcome === 'failure' || outcome === 'disaster'
      ? contract.failure_cost ?? 0
      : outcome === 'partial_success'
        ? Math.round((contract.failure_cost ?? 0) * 0.45)
        : 0;

  const fame = state.region_fame.map((f) => {
    if (f.regionId !== region.id) return { ...f, fame: Math.max(0, f.fame - 0.4) };
    const successMod = ['flawless_victory', 'costly_victory', 'pyrrhic_victory'].includes(outcome) ? 1 : 0.45;
    const gain = contract.reward_reputation * successMod * (1 + region.danger_level * 0.1);
    return {
      ...f,
      fame: Math.max(0, f.fame + gain),
      reliability: Math.max(0, f.reliability + (outcome.includes('victory') ? 1.8 : -1.4)),
      brutality: Math.max(0, f.brutality + (outcome === 'disaster' ? 3 : 0.5)),
      publicRenown: Math.max(0, f.publicRenown + (outcome.includes('victory') ? 1.6 : -0.8))
    };
  });

  const company = {
    ...state.company,
    gold: Math.max(0, state.company.gold + reward - failurePenalty - state.mercenaries.filter((m) => m.alive).reduce((n, m) => n + m.salary, 0)),
    ammunition: Math.max(0, state.company.ammunition - Math.max(2, Math.round(players.length * 1.5))),
    medicine: Math.max(0, state.company.medicine - (outcome === 'pyrrhic_victory' || outcome === 'disaster' ? 3 : 1)),
    campaign_progress: Math.max(0, state.company.campaign_progress + Math.round(contract.strategic_value * rewardMultiplier / 4)),
    updated_at: isoNow()
  };

  const missionRun: MissionRun = {
    id: makeId('run'),
    company_id: state.company.id,
    contract_id: contract.id,
    outcome,
    reward_gold: reward,
    reputation_delta: Math.round(contract.reward_reputation * rewardMultiplier),
    log_json: [...log, { round: 100, text: `Objective ${objective.progress}/${objective.target}. Outcome: ${outcome.replaceAll('_', ' ')}. Reward: ${reward}g. Penalty: ${failurePenalty}g.`, type: 'summary' }],
    created_at: isoNow()
  };

  const contentRewards = awardNarrativeLoot(state, contract, region, outcome);

  const contracts = state.contracts.map((c) => (c.id === contract.id ? { ...c, status: 'resolved' as const, updated_at: isoNow() } : c));

  const chainSpawn = contract.chain_id && outcome.includes('victory');
  if (chainSpawn) {
    contracts.push({
      id: makeId('ctr_chain'),
      region_id: contract.region_id,
      faction_id: contract.faction_id,
      type: 'assassination',
      title: `Chain Step ${Number(contract.chain_step ?? 1) + 1}: Strike the Thorn Captain`,
      description: 'Your previous patrol exposed a command node. Strike before rivals seize the lead.',
      difficulty: contract.difficulty + 1,
      enemy_power: Math.round(contract.enemy_power * 1.25),
      risk_level: Math.min(5, contract.risk_level + 1),
      reward_gold: Math.round(contract.reward_gold * 1.4),
      reward_reputation: contract.reward_reputation + 4,
      deadline_days: Math.max(2, contract.deadline_days - 1),
      travel_deadline_day: state.day + Math.max(2, contract.deadline_days - 1),
      strategic_value: contract.strategic_value + 12,
      objective_type: 'eliminate',
      status: 'available',
      chain_id: contract.chain_id,
      chain_step: Number(contract.chain_step ?? 1) + 1,
      chain_branch: 'success',
      hidden_difficulty: contract.hidden_difficulty + 1,
      hidden_reward_gold: Math.round(contract.hidden_reward_gold * 1.45),
      hidden_enemy_archetypes: ['Hunter', 'Fanatic', 'Controller'],
      rumor_accuracy: Math.max(0.42, contract.rumor_accuracy - 0.05),
      created_at: isoNow(),
      updated_at: isoNow()
    });
  }

  if (contract.extraction_node_id && ['flawless_victory', 'costly_victory', 'pyrrhic_victory'].includes(outcome)) {
    contracts.push({
      id: makeId('ctr_extract'),
      region_id: contract.region_id,
      location_node_id: contract.extraction_node_id,
      faction_id: contract.faction_id,
      type: 'escort',
      title: `Extraction Run: ${contract.title}`,
      description: 'Secure wounded, loot and witnesses through the extraction corridor before rivals close it.',
      difficulty: Math.max(1, contract.difficulty),
      enemy_power: Math.round(contract.enemy_power * 0.8),
      risk_level: Math.max(1, contract.risk_level),
      reward_gold: Math.round(contract.reward_gold * 0.6),
      reward_reputation: Math.max(3, Math.round(contract.reward_reputation * 0.7)),
      deadline_days: 2,
      travel_deadline_day: state.day + 2,
      strategic_value: contract.strategic_value + 8,
      objective_type: 'escort',
      status: 'available',
      hidden_difficulty: Math.max(1, contract.hidden_difficulty),
      hidden_reward_gold: Math.round(contract.hidden_reward_gold * 0.65),
      hidden_enemy_archetypes: ['Hunter', 'Opportunist'],
      rumor_accuracy: Math.min(0.92, contract.rumor_accuracy + 0.08),
      created_at: isoNow(),
      updated_at: isoNow()
    });
  }

  return {
    state: {
      ...state,
      company,
      campaign_status:
        company.campaign_progress >= 220 ? 'dominating'
        : company.campaign_progress >= 110 ? 'ascendant'
        : company.gold <= 0 && state.mercenaries.filter((m) => m.alive).length <= 2 ? 'collapsed'
        : 'ongoing',
      contracts,
      mercenaries,
      injuries,
      memorial,
      mission_runs: [missionRun, ...state.mission_runs],
      region_fame: fame,
      stash: contentRewards.stash,
      library: contentRewards.library,
      chronicle: [
        ...contentRewards.notes,
        `${contract.title}: ${outcome.replaceAll('_', ' ')} in ${region.name}. Reward ${reward}g.`,
        ...state.chronicle
      ].slice(0, 80)
    },
    log: missionRun.log_json
  };
}

function selectPlayerTargets(targets: CombatantSnapshot[], actor: CombatantSnapshot) {
  const live = targets.filter((target) => !target.downed);
  const priorityPool = live.length > 0 ? live : targets;
  if (actor.class === 'Archer' || actor.class === 'Duelist') {
    const backline = priorityPool.filter((target) => target.position === 'back');
    if (backline.length > 0) return backline;
  }
  if (actor.class === 'Vanguard' || actor.class === 'Bruiser') {
    const frontline = priorityPool.filter((target) => target.position === 'front');
    if (frontline.length > 0) return frontline;
  }
  return priorityPool;
}

function resolvePlayerAbility(
  actor: CombatantSnapshot,
  units: CombatantSnapshot[],
  target: CombatantSnapshot,
  objective: ObjectiveState,
  log: MissionLogEntry[],
  round: number,
  contract: Contract
) {
  if (round % 3 !== 0) return null;

  switch (actor.class) {
    case 'Vanguard':
      actor.defense += 4;
      objective.progress += contract.objective_type === 'hold_line' ? 2 : 1;
      log.push({ round, text: `${actor.name} braces the line and stabilizes the formation.`, type: 'morale' });
      return { skipAttack: false };
    case 'Bruiser':
      target.defense = Math.max(0, target.defense - 4);
      log.push({ round, text: `${actor.name} smashes through ${target.name}'s guard.`, type: 'critical' });
      return { skipAttack: false };
    case 'Duelist':
      actor.speed += 2;
      log.push({ round, text: `${actor.name} slips to the flank for a killing angle.`, type: 'action' });
      return { skipAttack: false };
    case 'Archer':
      objective.progress += contract.objective_type === 'escort' || contract.objective_type === 'recover' ? 1 : 0;
      target.hp -= 5;
      log.push({ round, text: `${actor.name} pins ${target.name} and opens the route ahead.`, type: 'action' });
      return { skipAttack: false };
    case 'Tactician': {
      const allies = units.filter((unit) => unit.side === 'player' && unit.alive && !unit.downed);
      for (const ally of allies) ally.morale += 2;
      objective.progress += 1;
      log.push({ round, text: `${actor.name} redirects the squad and sharpens the objective push.`, type: 'morale' });
      return { skipAttack: false };
    }
    case 'Medic': {
      const wounded = units
        .filter((unit) => unit.side === 'player' && unit.alive && unit.hp < unit.maxHp)
        .sort((a, b) => a.hp - b.hp)[0];
      if (wounded) {
        wounded.hp = Math.min(wounded.maxHp, wounded.hp + 12);
        objective.progress += contract.objective_type === 'escort' ? 1 : 0;
        log.push({ round, text: `${actor.name} patches ${wounded.name} and keeps the advance alive.`, type: 'injury' });
        return { skipAttack: true };
      }
      return { skipAttack: false };
    }
    default:
      return null;
  }
}

function objectiveTickGain(players: CombatantSnapshot[], contract: Contract) {
  const alive = players.filter((player) => player.alive && !player.downed);
  const frontline = alive.filter((player) => player.position === 'front').length;
  const support = alive.filter((player) => player.isSupport).length;

  switch (contract.objective_type) {
    case 'hold_line':
      return frontline >= 2 ? 1 : 0;
    case 'escort':
      return support >= 1 ? 1 : 0;
    case 'breakthrough':
      return alive.some((player) => player.class === 'Duelist' || player.class === 'Archer') ? 1 : 0;
    case 'recover':
      return support >= 1 && frontline >= 1 ? 1 : 0;
    case 'eliminate':
    default:
      return 0;
  }
}
