export const json = (res, code, body, corsOrigin) => {
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': corsOrigin,
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization'
  });
  res.end(JSON.stringify(body));
};

export const parseBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

export const parseForm = (obj, prefix = null, out = new URLSearchParams()) => {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => parseForm(item, `${key}[${i}]`, out));
      continue;
    }
    if (typeof v === 'object') {
      parseForm(v, key, out);
      continue;
    }
    out.append(key, String(v));
  }
  return out;
};
