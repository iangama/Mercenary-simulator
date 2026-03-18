import { buildCtx, allowOptions } from './_shared.mjs';
import { handleHealth } from '../server/src/routes/health.mjs';

export default async function handler(req, res) {
  if (allowOptions(req, res)) return;
  return handleHealth(buildCtx(req, res));
}
