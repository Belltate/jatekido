// Helyi webszerver a telefonos app kipróbálásához: `npm run web`, majd http://127.0.0.1:8080
// (A service worker csak http(s)-en működik, file://-ról nem.) Csak ezen a gépen érhető el.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const file = join(ROOT, normalize(path === '/' ? '/index.html' : path).replace(/^[/\\]+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Nincs ilyen fájl');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`A telefonos app: http://127.0.0.1:${PORT}  (leállítás: Ctrl+C)`));
