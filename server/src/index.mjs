import { createServer } from 'node:http';
import { loadServerEnv } from './env.mjs';
import { json, parseBody, parseForm } from './lib/http.mjs';
import { createSupabaseServiceClient } from './lib/supabase.mjs';
import { handleHealth } from './routes/health.mjs';
import { handleStateGet, handleStatePut, handleStateSummary, handleStateValidate } from './routes/state.mjs';
import { handleStripeCheckout } from './routes/stripe.mjs';

loadServerEnv();

const PORT = Number(process.env.PORT || 8787);
const CORS = process.env.CORS_ORIGIN || '*';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const supabase = createSupabaseServiceClient();

const respondJson = (res, code, body) => json(res, code, body, CORS);

createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'OPTIONS') return respondJson(res, 200, { ok: true });

  const ctx = {
    req,
    res,
    url,
    json: respondJson,
    parseBody,
    parseForm,
    stripeSecretKey: STRIPE_SECRET_KEY,
    stripeConfigured: Boolean(STRIPE_SECRET_KEY),
    supabase
  };

  if (url.pathname === '/health') return handleHealth(ctx);
  if (url.pathname === '/stripe/create-checkout-session' && req.method === 'POST') return handleStripeCheckout(ctx);
  if (url.pathname === '/state' && req.method === 'GET') return handleStateGet({ ...ctx, companyId: url.searchParams.get('companyId') });
  if (url.pathname === '/state/summary' && req.method === 'GET') return handleStateSummary({ ...ctx, companyId: url.searchParams.get('companyId') });
  if (url.pathname === '/state/validate' && req.method === 'POST') return handleStateValidate(ctx);
  if (url.pathname === '/state' && req.method === 'PUT') return handleStatePut(ctx);

  return respondJson(res, 404, { error: 'not found' });
}).listen(PORT, () => {
  console.log(JSON.stringify({ message: 'server_started', port: PORT }));
});
