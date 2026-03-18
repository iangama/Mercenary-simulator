import { buildCtx, allowOptions } from '../_shared.mjs';
import { handleStateSummary } from '../../server/src/routes/state.mjs';

export default async function handler(req, res) {
  if (allowOptions(req, res)) return;
  const ctx = buildCtx(req, res);
  if (req.method !== 'GET') return ctx.json(res, 405, { error: 'method not allowed' });
  return handleStateSummary({ ...ctx, companyId: ctx.url.searchParams.get('companyId') });
}
