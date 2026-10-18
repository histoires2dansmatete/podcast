/** Vérifications avant publication ; fonctionne avec Node.js seul. */
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import vm from 'node:vm';

const root = resolve('site');
const required = [
  'index.html', 'histoires.html', 'ecouter.html', 'qui-suis-je.html', 'confidentialite.html', '404.html',
  'config.js', 'robots.txt', '_headers',
  'assets/main.js', 'assets/catalogue.js', 'assets/style.css', 'assets/cameleon.svg', 'assets/favicon.ico', 'assets/logo.webp', 'data/histoires.json'
];
for (const filename of required) {
  const file = resolve(root, filename);
  assert.ok(file.startsWith(root + sep), `Chemin incorrect : ${filename}`);
  assert.ok((await stat(file)).isFile(), `Fichier manquant : ${filename}`);
}

const stories = JSON.parse(await readFile(resolve(root, 'data/histoires.json'), 'utf8'));
const htmlPages = ['index.html', 'histoires.html', 'ecouter.html', 'qui-suis-je.html', 'confidentialite.html', '404.html', ...stories.map(s => `histoires/${s.slug}/index.html`)];
for (const page of htmlPages) {
  const html = await readFile(resolve(root, page), 'utf8');
  assert.match(html, /<html[^>]+lang="fr"/, `${page} : attribut lang="fr" absent`);
  const attr = /\b(?:href|src|data-fallback)="([^"]+)"/g;
  let match;
  while ((match = attr.exec(html)) !== null) {
    const url = match[1];
    if (url === '/') continue; // La racine du site est une page valide.
    if (url.startsWith('#')) {
      assert.ok(html.includes(`id="${url.slice(1)}"`), `Ancre introuvable : ${url}`);
      continue;
    }
    if (/^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(url)) continue;
    const localPart = decodeURIComponent(url.split(/[?#]/)[0]);
    const target = resolve(dirname(resolve(root, page)), localPart);
    assert.ok(target.startsWith(root + sep), `Chemin hors du site : ${url}`);
    try {
      const fileStat = await stat(target);
      if (fileStat.isDirectory()) {
        assert.ok((await stat(resolve(target, 'index.html'))).isFile(), `${page} : dossier sans index ${url}`);
      } else assert.ok(fileStat.isFile(), `${page} : lien local absent ${url}`);
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`${page} : fichier local introuvable ${url}`);
      throw error;
    }
  }
}

// Contrôle des liens plateformes sans ajouter de fausses URL publiques.
const configuration = await readFile(resolve(root, 'config.js'), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(configuration, context, { timeout: 1000, filename: 'site/config.js' });
const platformLinks = context.window.PODCAST_CONFIG?.platforms;
assert.ok(platformLinks, 'La configuration des plateformes est absente.');
for (const key of ['spotify', 'apple', 'deezer', 'amazon']) {
  const link = platformLinks[key];
  assert.equal(typeof link, 'string', `${key} doit être une chaîne de caractères`);
  if (link) {
    assert.equal(new URL(link).protocol, 'https:', `${key} : le lien doit utiliser HTTPS`);
  }
}
console.log('✓ Fichiers, liens locaux, ancres et plateformes vérifiés.');

// V4 : SEO et corpus complet ; empêchons le retour accidentel à des fiches vides.
const sitemap = await readFile(resolve(root,'sitemap.xml'),'utf8');
assert.equal(stories.length,13,'Les 13 articles publiés du WordPress doivent être dans le catalogue.');
assert.equal((sitemap.match(/<url>/g)||[]).length,17,'Le sitemap doit comprendre 13 histoires et 4 pages principales.');
for(const story of stories){
 assert.ok(story.bodyHtml?.length>350,`${story.slug} : texte intégral absent`);
 const html=await readFile(resolve(root,'histoires',story.slug,'index.html'),'utf8');
 assert.match(html,/class="reading-body"/,`${story.slug} : récit non affiché`);
 assert.match(html,/<link rel="canonical" href="https:\/\//,`${story.slug} : URL canonique manquante`);
 assert.match(html,/<script type="application\/ld\+json">/,`${story.slug} : données structurées manquantes`);
 assert.ok(sitemap.includes(`/histoires/${story.slug}/`),`${story.slug} : absent du sitemap`);
}
console.log('✓ Corpus complet : 13 récits, 17 URLs sitemap, métadonnées et données structurées contrôlées.');
