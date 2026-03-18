import { SAVE_VERSION } from '../lib/save.mjs';

export async function handleHealth({ res, json, stripeConfigured, supabase }) {
  return json(res, 200, {
    ok: true,
    stripeConfigured,
    supabaseConfigured: Boolean(supabase),
    saveVersion: SAVE_VERSION
  });
}
