import { buildEnvelope, SAVE_VERSION, summarizeState, validateStateEnvelope } from '../lib/save.mjs';

export async function handleStateGet({ res, json, supabase, companyId }) {
  if (!supabase) return json(res, 503, { error: 'supabase not configured' });
  if (!companyId) return json(res, 400, { error: 'companyId required' });

  const { data, error } = await supabase
    .from('game_state')
    .select('state_json, save_version, checkpoint_day, campaign_status, summary_json, updated_at')
    .eq('company_id', companyId)
    .single();

  if (error) return json(res, 404, { error: error.message });
  return json(res, 200, {
    state: data.state_json,
    meta: {
      saveVersion: data.save_version ?? SAVE_VERSION,
      checkpointDay: data.checkpoint_day ?? null,
      campaignStatus: data.campaign_status ?? null,
      summary: data.summary_json ?? null,
      updatedAt: data.updated_at ?? null
    }
  });
}

export async function handleStateSummary({ res, json, supabase, companyId }) {
  if (!supabase) return json(res, 503, { error: 'supabase not configured' });
  if (!companyId) return json(res, 400, { error: 'companyId required' });

  const { data, error } = await supabase
    .from('game_state')
    .select('company_id, save_version, checkpoint_day, campaign_status, summary_json, updated_at')
    .eq('company_id', companyId)
    .single();

  if (error) return json(res, 404, { error: error.message });
  return json(res, 200, {
    companyId: data.company_id,
    saveVersion: data.save_version ?? SAVE_VERSION,
    checkpointDay: data.checkpoint_day ?? null,
    campaignStatus: data.campaign_status ?? null,
    summary: data.summary_json ?? null,
    updatedAt: data.updated_at ?? null
  });
}

export async function handleStateValidate({ req, res, json, parseBody }) {
  const body = await parseBody(req);
  const validation = validateStateEnvelope(body?.state_json ?? body);
  if (!validation.ok) return json(res, 400, validation);
  return json(res, 200, {
    ok: true,
    saveVersion: SAVE_VERSION,
    summary: summarizeState(validation.state)
  });
}

export async function handleStatePut({ req, res, json, parseBody, supabase }) {
  if (!supabase) return json(res, 503, { error: 'supabase not configured' });
  const body = await parseBody(req);
  const validation = validateStateEnvelope(body.state_json);
  if (!body.company_id || !validation.ok) return json(res, 400, { error: validation.ok ? 'invalid payload' : validation.error });

  const envelope = buildEnvelope(validation.state, body.state_json);
  const { error } = await supabase.from('game_state').upsert({
    company_id: body.company_id,
    state_json: envelope,
    save_version: SAVE_VERSION,
    checkpoint_day: envelope.checkpoint_day,
    campaign_status: envelope.campaign_status,
    summary_json: envelope.summary,
    updated_at: new Date().toISOString()
  }, { onConflict: 'company_id' });
  if (error) return json(res, 500, { error: error.message });

  return json(res, 200, {
    ok: true,
    saveVersion: SAVE_VERSION,
    checkpointDay: envelope.checkpoint_day,
    campaignStatus: envelope.campaign_status,
    summary: envelope.summary
  });
}
