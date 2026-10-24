import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { handleApi } from './api';

const production = process.argv.includes('--production'), root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be an integer from 1024 to 65535.');
const server = createServer();
const vite = production ? null : await (await import('vite')).createServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
server.on('request', async (req, res) => {
  try {
    if (await handleApi(req, res)) return;
    if (vite) return vite.middlewares(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const base = resolve(root, 'dist');
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
    let file = resolve(base, `.${pathname}`);
    if (!file.startsWith(base + sep) && file !== base) { res.writeHead(403); res.end(); return; }
    const exists = await stat(file).catch(() => null);
    if (!exists?.isFile()) {
      if (extname(pathname)) { res.writeHead(404); res.end('Not found'); return; }
      file = resolve(base, 'index.html');
    }
    res.setHeader('Content-Type', `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('GeoVoice could not serve this request. Check that npm run build has completed.');
  }
});
server.on('error', error => { console.error(`GeoVoice: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`GeoVoice ${production ? 'production' : 'development'}: http://127.0.0.1:${port}`));
async function shutdown() { await vite?.close(); server.close(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
