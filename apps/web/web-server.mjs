// Tiny Node static file server for the Material Retail web app on Fly.io.
// Serves the Vite build output from /app/dist, and reverse-proxies /api/*
// to the api Fly service over the internal network.
//
// Why not nginx? Nginx would mean another base image and 100MB of layers.
// A 100-line Node server is fine for a take-home and lets the proxy logic
// live alongside the build output.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

const PORT = Number(process.env.PORT ?? 8080);
// Where to proxy /api/* traffic. On Fly, sibling apps are reachable at
// <app-name>.internal on port 4000. Override with API_TARGET env for staging.
const API_TARGET = process.env.API_TARGET ?? 'http://material-retail-dante-api.internal:4000';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function mimeFor(p) {
  const ext = path.extname(p).toLowerCase();
  return MIME[ext] ?? 'application/octet-stream';
}

async function serveStatic(req, res) {
  // Strip query string, decode, normalize. SPA fallback: if the requested path
  // has no extension and doesn't resolve to a real file, serve index.html so
  // React Router handles the route.
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(DIST, urlPath);
  // Prevent path traversal — clamp anything outside DIST.
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) throw new Error('is-dir');
  } catch {
    filePath = path.join(DIST, 'index.html');
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mimeFor(filePath),
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=300',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
}

function proxyApi(req, res) {
  // Forward /api/* → API_TARGET/api/* preserving method, headers, and body.
  const target = new URL(req.url, API_TARGET);
  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: target.pathname + target.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('API proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Upstream API unreachable' }));
  });
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`web listening on :${PORT} (dist=${DIST}, api=${API_TARGET})`);
});
