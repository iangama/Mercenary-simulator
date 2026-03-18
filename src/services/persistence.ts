import type { GlobalGameState } from '../types/game';
import { createSeedState } from '../seed/seedState';
import { supabase } from '../lib/supabase/client';

const KEY = 'mercenary-company-state-v2';
const LEGACY_KEY = 'mercenary-company-state-v1';
const SAVE_VERSION = 2;
const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.PROD ? '/api' : undefined))?.replace(/\/$/, '');

interface SaveEnvelope {
  version: number;
  saved_at: string;
  campaign_status: GlobalGameState['campaign_status'];
  checkpoint_day: number;
  summary: {
    company_name: string;
    gold: number;
    supplies: number;
    location_node_id: string;
  };
  state: GlobalGameState;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function unwrapSaveEnvelope(raw: unknown): Partial<GlobalGameState> {
  if (isObject(raw) && isObject(raw.state)) return raw.state as Partial<GlobalGameState>;
  if (isObject(raw)) return raw as Partial<GlobalGameState>;
  return {};
}

function buildSaveEnvelope(state: GlobalGameState): SaveEnvelope {
  return {
    version: SAVE_VERSION,
    saved_at: new Date().toISOString(),
    campaign_status: state.campaign_status,
    checkpoint_day: state.day,
    summary: {
      company_name: state.company.name,
      gold: state.company.gold,
      supplies: state.company.supplies,
      location_node_id: state.company_node_id
    },
    state
  };
}

function hydrateState(candidate: Partial<GlobalGameState>): GlobalGameState {
  const seed = createSeedState();
  const candidateCompany = candidate.company
    ? {
        ...candidate.company,
        permits: (candidate.company.permits ?? []).map((permit) => (permit === 'fac_iron_oath' ? 'reg_sunscar' : permit))
      }
    : undefined;
  return {
    ...seed,
    ...candidate,
    company: { ...seed.company, ...(candidateCompany ?? {}) },
    mercenaries: (candidate.mercenaries ?? seed.mercenaries).map((mercenary, index) => ({
      ...seed.mercenaries[index % seed.mercenaries.length],
      ...mercenary,
      origin: mercenary.origin ?? 'frontier_peasant',
      loyalty: mercenary.loyalty ?? 50,
      ambition: mercenary.ambition ?? 50,
      camaraderie: mercenary.camaraderie ?? 50,
      stress: mercenary.stress ?? 0
    })),
    library: (candidate.library ?? seed.library).map((entry, index) => ({
      ...seed.library[index % Math.max(1, seed.library.length)],
      ...entry
    })),
    landmarks: (candidate.landmarks ?? seed.landmarks).map((landmark, index) => ({
      ...seed.landmarks[index % Math.max(1, seed.landmarks.length)],
      ...landmark,
      discovered: landmark.discovered ?? false,
      activated: landmark.activated ?? false
    })),
    map_nodes: candidate.map_nodes?.length ? candidate.map_nodes : seed.map_nodes,
    map_routes: (candidate.map_routes?.length ? candidate.map_routes : seed.map_routes).map((route) => ({
      ...route,
      hidden: route.hidden ?? false,
      discovered: route.hidden ? route.discovered ?? false : true
    })),
    company_node_id: candidate.company_node_id ?? seed.company_node_id,
    active_travel: candidate.active_travel ?? null,
    travel_order: candidate.travel_order ?? null,
    active_interception: candidate.active_interception ?? null,
    active_site_operation: candidate.active_site_operation ?? null,
    active_journey_incident: candidate.active_journey_incident ?? null,
    season: candidate.season ?? seed.season,
    weather: candidate.weather ?? seed.weather,
    campaign_status: candidate.campaign_status ?? seed.campaign_status,
    forward_posts: (candidate.forward_posts ?? seed.forward_posts).map((post) => ({
      ...post,
      stash_medicine: post.stash_medicine ?? 0,
      stash_ammunition: post.stash_ammunition ?? 0,
      level: post.level ?? 1,
      integrity: post.integrity ?? 100,
      specialty: post.specialty ?? 'supply'
    }))
  };
}

export function hydratePersistedState(candidate: Partial<GlobalGameState>) {
  return hydrateState(candidate);
}

export function buildPersistedEnvelope(state: GlobalGameState) {
  return buildSaveEnvelope(state);
}

function compactStateForLocalSave(state: GlobalGameState): GlobalGameState {
  return {
    ...state,
    chronicle: state.chronicle.slice(0, 40),
    memorial: state.memorial.slice(0, 40),
    mission_runs: state.mission_runs.slice(0, 8).map((run) => ({
      ...run,
      log_json: run.log_json.slice(0, 20)
    }))
  };
}

function emergencyStateForLocalSave(state: GlobalGameState): GlobalGameState {
  return {
    ...state,
    chronicle: state.chronicle.slice(0, 20),
    memorial: state.memorial.slice(0, 20),
    mission_runs: state.mission_runs.slice(0, 3).map((run) => ({
      ...run,
      log_json: []
    }))
  };
}

export function loadLocalState(): GlobalGameState {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return createSeedState();
    return hydrateState(unwrapSaveEnvelope(JSON.parse(raw)));
  } catch {
    return createSeedState();
  }
}

export function saveLocalState(state: GlobalGameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(buildSaveEnvelope(state)));
    return;
  } catch {
    try {
      localStorage.setItem(KEY, JSON.stringify(buildSaveEnvelope(compactStateForLocalSave(state))));
      return;
    } catch {
      try {
        localStorage.setItem(KEY, JSON.stringify(buildSaveEnvelope(emergencyStateForLocalSave(state))));
      } catch {
        // Ignore storage failures so the UI keeps running even when the browser quota is exhausted.
      }
    }
  }
}

export async function pullRemoteState(companyId: string) {
  if (API_BASE_URL) {
    const response = await fetch(`${API_BASE_URL}/state?companyId=${encodeURIComponent(companyId)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { state?: unknown };
    return data.state ? hydrateState(unwrapSaveEnvelope(data.state)) : null;
  }

  const { data } = await supabase
    .from('game_state')
    .select('state_json, save_version')
    .eq('company_id', companyId)
    .single();
  if (!data?.state_json) return null;
  return hydrateState(unwrapSaveEnvelope(data.state_json));
}

export async function pushRemoteState(state: GlobalGameState) {
  const envelope = buildSaveEnvelope(state);
  if (API_BASE_URL) {
    await fetch(`${API_BASE_URL}/state`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        company_id: state.company.id,
        state_json: envelope
      })
    });
    return;
  }

  const payload = {
    company_id: state.company.id,
    state_json: envelope,
    save_version: SAVE_VERSION,
    checkpoint_day: state.day,
    campaign_status: state.campaign_status,
    summary_json: envelope.summary,
    updated_at: new Date().toISOString()
  };
  await supabase.from('game_state').upsert(payload, { onConflict: 'company_id' });
}
