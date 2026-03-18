import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadServerEnv() {
  const path = resolve(__dirname, '../.env');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const row = line.trim();
    if (!row || row.startsWith('#')) continue;
    const sep = row.indexOf('=');
    if (sep < 1) continue;
    const key = row.slice(0, sep).trim();
    const value = row.slice(sep + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
