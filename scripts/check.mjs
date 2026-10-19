/** Vérifications avant publication ; fonctionne avec Node.js seul. */
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import vm from 'node:vm';
import { isLocalImagePath } from './local-image-path.mjs';

const root = resolve('site');
const required = [
  'index.html', 'histoires.html', 'ecouter.html', 'qui-suis-je.html', 'confidentialite.html', '404.html',
  'config.js', 'robots.txt', '_headers', '_redirects',
  'assets/main.js', 'assets/images.config.json', 'assets/catalogue.js', 'assets/style.css', 'assets/cameleon.svg', 'assets/favicon.ico', 'assets/logo.webp', 'data/histoires.json'
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
assert.ok(stories.length>=13,'Les 13 articles publiés du WordPress doivent rester dans le catalogue.');
assert.equal((sitemap.match(/<url>/g)||[]).length,stories.length+4,'Le sitemap doit comprendre toutes les histoires et 4 pages principales.');
for(const story of stories){
 assert.ok(story.bodyHtml?.length>350,`${story.slug} : texte intégral absent`);
 const html=await readFile(resolve(root,'histoires',story.slug,'index.html'),'utf8');
 assert.match(html,/class="reading-body"/,`${story.slug} : récit non affiché`);
 assert.match(html,/<link rel="canonical" href="https:\/\//,`${story.slug} : URL canonique manquante`);
 assert.match(html,/<script type="application\/ld\+json">/,`${story.slug} : données structurées manquantes`);
 assert.ok(sitemap.includes(`/histoires/${story.slug}/`),`${story.slug} : absent du sitemap`);
}
console.log(`✓ Corpus complet : ${stories.length} récits, ${stories.length+4} URLs sitemap contrôlées.`);

// V5 : vérifie l'autonomie des illustrations, le domaine, et l'index épuré.
const home=await readFile(resolve(root,'index.html'),'utf8');
assert.ok(!home.includes('id="story-grid"'), 'La story-grid ne doit plus être sur l’accueil.');
assert.match(home,/class="section-heading"/, 'L’en-tête de la rubrique doit rester.');
assert.match(home,/href="histoires.html"/, 'La bibliothèque doit rester accessible.');
for(const s of stories){
 assert.ok(Array.isArray(s.tags) && s.tags.length>0,`${s.slug}: thèmes absents`);
 assert.ok(isLocalImagePath(s.image), `${s.slug}: couverture non locale (${s.image})`);
 assert.ok((await stat(resolve(root,s.image))).isFile(),`${s.slug}: couverture locale manquante`);
}
for (const file of ['index.html','histoires.html','ecouter.html','qui-suis-je.html','confidentialite.html','data/histoires.json',...stories.map(s=>`histoires/${s.slug}/index.html`)]) {
 const content=await readFile(resolve(root,file),'utf8');
 assert.ok(!content.includes('https://podcast.histoires2dansmatete.fr'),`${file}: ancien sous-domaine`);
 assert.ok(!content.includes('https://histoires2dansmatete.fr/wp-content/'),`${file}: dépendance WordPress`);
 assert.ok(!/ancien blog|blog d.origine|sur le blog|Le blog ↗/i.test(content),`${file}: ancien blog encore évoqué`);
}
assert.match(sitemap,/https:\/\/histoires2dansmatete\.fr\/histoires\//);
console.log('✓ V5 : domaine final, couvertures locales, absence de liens WordPress, accueil sans grille.');

// V6 : intégrité des assets configurés et présence des liens officiels
const imgConf=JSON.parse(await readFile(resolve(root,'assets/images.config.json'),'utf8'));
assert.ok(stories.every(s=>imgConf.stories[s.slug]),'Toutes les histoires publiées doivent avoir une image configurée');
for(const key of ['logo','aboutVisual','bioImage','listenArt'])assert.ok(imgConf.globals[key],`Image globale ${key} non configurée`);
for(const s of stories)assert.ok(imgConf.stories[s.slug],`Image non configurée pour ${s.slug}`);
for(const icon of ['instagram','facebook','spotify','apple-podcasts','deezer','amazon'])assert.ok((await stat(resolve(root,`assets/icons/${icon}.svg`))).isFile(),`Icône ${icon} manquante`);
for(const page of htmlPages.filter(p=>p!=='404.html')){
 const content=await readFile(resolve(root,page),'utf8');
 assert.ok(content.includes('https://www.instagram.com/les_histoires_2_dans_ma_tete/'),`${page}: Instagram absent`);
 assert.ok(content.includes('https://www.facebook.com/profile.php?id=61587115217827'),`${page}: Facebook absent`);
}
for(const page of htmlPages.filter(p=>p!=='404.html')){
 const content=await readFile(resolve(root,page),'utf8');
 assert.match(content,/class="header-socials"/,`${page}: icônes des réseaux absentes du header`);
 assert.equal((content.match(/class="container footer-social-area"/g)||[]).length,1,`${page}: footer-social-area doit être présent une seule fois`);
}
for(const [file,classname,key] of [['index.html','about-visual','aboutVisual'],['qui-suis-je.html','bio-image','bioImage'],['ecouter.html','listen-reading-art','listenArt']]){
 const html=await readFile(resolve(root,file),'utf8');
 const {globalImageFor,configuredImages}=await import('./images.mjs');
 const expected=await globalImageFor(key,await configuredImages());
 const regex=new RegExp(`<div class="${classname}">[\\s\\S]*?<img\\b[^>]*\\bsrc="${expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`);
 assert.match(html,regex,`${file}: image globale non issue du JSON ${key}`);
}
console.log('✓ V7 : les images bio/accueil/écoute, le header et le footer sont pilotés et vérifiés.');
