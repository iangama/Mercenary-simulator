import { buildCtx, allowOptions } from '../_shared.mjs';
import { handleStripeCheckout } from '../../server/src/routes/stripe.mjs';

export default async function handler(req, res) {
  if (allowOptions(req, res)) return;
  const ctx = buildCtx(req, res);
  if (req.method !== 'POST') return ctx.json(res, 405, { error: 'method not allowed' });
  return handleStripeCheckout(ctx);
}
