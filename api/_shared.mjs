import { loadServerEnv } from '../server/src/env.mjs';
import { json, parseBody, parseForm } from '../server/src/lib/http.mjs';
import { createSupabaseServiceClient } from '../server/src/lib/supabase.mjs';

loadServerEnv();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

function toNodeLikeReq(req) {
  if (typeof req.on === 'function') return req;

  req.on = (event, handler) => {
    if (event === 'data') {
      Promise.resolve(req.body ?? req.text?.() ?? '').then((body) => {
        const raw =
          typeof body === 'string'
            ? body
            : body instanceof Uint8Array
              ? Buffer.from(body).toString('utf8')
              : body && typeof body === 'object'
                ? JSON.stringify(body)
                : '';
        if (raw) handler(raw);
      });
    }
    if (event === 'end') {
      Promise.resolve().then(() => handler());
    }
    return req;
  };

  return req;
}

export function buildCtx(req, res) {
  const nodeReq = toNodeLikeReq(req);
  const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const respondJson = (targetRes, code, body) => json(targetRes, code, body, corsOrigin);

  return {
    req: nodeReq,
    res,
    url,
    json: respondJson,
    parseBody,
    parseForm,
    stripeSecretKey: STRIPE_SECRET_KEY,
    stripeConfigured: Boolean(STRIPE_SECRET_KEY),
    supabase: createSupabaseServiceClient()
  };
}

export function allowOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  json(res, 200, { ok: true }, process.env.CORS_ORIGIN || '*');
  return true;
}
