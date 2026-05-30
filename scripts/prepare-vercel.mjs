/**
 * Post-build script: Converts the Nitro/lovable build output (dist/)
 * into Vercel's Build Output API v3 format (.vercel/output/).
 *
 * Nitro's vercel preset normally generates .vercel/output/ directly,
 * but @lovable.dev/vite-tanstack-config redirects it to dist/.
 * This script bridges the gap.
 */

import { mkdirSync, cpSync, writeFileSync, renameSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const outputDir = resolve(root, '.vercel/output');
const staticDir = resolve(outputDir, 'static');
const funcDir   = resolve(outputDir, 'functions/__server.func');

// ── 1. Static files (dist/client → .vercel/output/static) ────────────────
mkdirSync(staticDir, { recursive: true });
cpSync(resolve(root, 'dist/client'), staticDir, { recursive: true });

// ── 2. Copy server bundle (dist/server → funcDir) ─────────────────────────
mkdirSync(funcDir, { recursive: true });
cpSync(resolve(root, 'dist/server'), funcDir, { recursive: true });

// ── 3. Rename original Nitro entry so the adapter can import it ───────────
renameSync(resolve(funcDir, 'index.mjs'), resolve(funcDir, '_vercel_entry.mjs'));

// ── 4. Write adapter: Vercel Node.js (req,res) → Nitro fetch handler ───────
writeFileSync(resolve(funcDir, 'index.mjs'), `
import { Readable } from 'node:stream';

let _handler;
async function getHandler() {
  if (!_handler) {
    const mod = await import('./_vercel_entry.mjs');
    _handler = mod.default; // vercel_web { fetch(req, context) }
  }
  return _handler;
}

export default async function handler(req, res) {
  const serverHandler = await getHandler();

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers.host || 'localhost';
  const url   = \`\${proto}://\${host}\${req.url}\`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
    else if (value) headers.set(key, value);
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method || 'GET');
  const request = new Request(url, {
    method: req.method || 'GET',
    headers,
    ...(hasBody ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
  });

  const response = await serverHandler.fetch(request, {});

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (response.body) {
    const reader = response.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      return pump();
    };
    await pump();
  } else {
    res.end();
  }
}
`.trimStart());

// ── 5. Function config (.vc-config.json) ─────────────────────────────────
writeFileSync(resolve(funcDir, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  shouldAddSourcemapSupport: false,
}, null, 2));

// ── 6. Vercel output config ───────────────────────────────────────────────
writeFileSync(resolve(outputDir, 'config.json'), JSON.stringify({
  version: 3,
  routes: [
    {
      src: '/assets/.+',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    { handle: 'filesystem' },
    { src: '/.*', dest: '/__server' },
  ],
}, null, 2));

console.log('✅  Vercel Build Output API structure created at .vercel/output/');
