/**
 * Serveur de développement sans dépendances externes.
 * npm run dev     -> http://localhost:5173, recharge la page après chaque sauvegarde
 * npm run preview -> http://localhost:4173, sert exactement le dossier dist/
 */
import http from 'node:http';
import {handleLocalRoute} from './local-admin.mjs';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const preview = process.argv.includes('--preview');
const root = resolve(preview ? 'dist' : 'site');
const host = '127.0.0.1';
const port = Number(process.env.PORT || (preview ? 4173 : 5173));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2'
};
const clients = new Set();
const reloadSnippet = `\n<script>\n  // Injecté uniquement par le serveur de développement, jamais dans dist/.\n  const source = new EventSource('/__dev/events');\n  source.onmessage = () => window.location.reload();\n</script>\n`;

try {
  if (!(await stat(root)).isDirectory()) throw Error('Dossier absent');
} catch {
  console.error(`Le dossier ${preview ? 'dist/' : 'site/'} est absent. ${preview ? 'Lancez d’abord npm run build.' : ''}`);
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  if (!['GET','HEAD','POST'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
  } catch {
    res.writeHead(400); res.end('Adresse invalide'); return;
  }

  if (!preview && pathname === '/__dev/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(': connecté\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  try {
    if(await handleLocalRoute(req,res,pathname,{preview,port,root}))return;
  }catch(error){console.error('Route locale :',error);res.writeHead(500);res.end('Erreur locale');return;}
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end('Méthode interdite');return;}

  const candidate = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    res.writeHead(403); res.end('Accès refusé'); return;
  }

  let file = candidate;
  let status = 200;
  try {
    const details = await stat(file);
    if (details.isDirectory()) file = resolve(file, 'index.html');
    else if (!details.isFile()) throw new Error('Fichier non accessible');
    await stat(file);
  } catch {
    file = resolve(root, '404.html');
    status = 404;
  }

  try {
    const contentType = types[extname(file)] || 'application/octet-stream';
    let body = await readFile(file);
    if (!preview && contentType.startsWith('text/html')) {
      body = Buffer.from(body.toString('utf8').replace('</body>', `${reloadSnippet}</body>`));
    }
    res.writeHead(status, {
      'Content-Type': contentType,
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error(error);
    res.writeHead(500); res.end('Erreur de lecture');
  }
});

if (!preview) {
  let pending;
  try {
    watch(root, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      clearTimeout(pending);
      pending = setTimeout(() => {
        for (const client of clients) {
          try { client.write('data: recharge\n\n'); } catch { clients.delete(client); }
        }
      }, 120);
    });
  } catch {
    console.warn('Le rechargement automatique n’est pas disponible : actualisez manuellement.');
  }
}

server.on('error', error => {
  console.error(`Impossible d’ouvrir le port ${port} : ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`${preview ? 'Aperçu du build' : 'Développement (rechargement automatique)'} : http://localhost:${port}`);
  console.log('Pour arrêter : Ctrl + C');
});
