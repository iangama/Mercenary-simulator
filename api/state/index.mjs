import { buildCtx, allowOptions } from '../_shared.mjs';
import { handleStateGet, handleStatePut } from '../../server/src/routes/state.mjs';

export default async function handler(req, res) {
  if (allowOptions(req, res)) return;
  const ctx = buildCtx(req, res);

  if (req.method === 'GET') {
    return handleStateGet({ ...ctx, companyId: ctx.url.searchParams.get('companyId') });
  }

  if (req.method === 'PUT') {
    return handleStatePut(ctx);
  }

  return ctx.json(res, 405, { error: 'method not allowed' });
}
