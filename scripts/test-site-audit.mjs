/** Audit du contrat public après build, complément des tests de liens/WordPress.
 * Utilise exclusivement les fichiers dist/ : ce sont ceux publiés sur Pages.
 */
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {readAllStories,localAudio,validateEpisodeConfig} from './story-content.mjs';

const site='https://histoires2dansmatete.fr';
const dist=resolve('dist');
const text=async path=>readFile(join(dist,path),'utf8');
const publicStories=await readAllStories();
const catalog=JSON.parse(await text('data/histoires.json'));
const config=JSON.parse(await readFile('content/audio.config.json','utf8'));
const sitemap=await text('sitemap.xml');
const rss=await text('histoires.xml');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const ids=new Set(publicStories.map(s=>s.slug));

assert.equal(catalog.length,publicStories.length,'Le catalogue public doit couvrir exactement les récits publiés.');
assert.equal(new Set(catalog.map(s=>s.slug)).size,catalog.length,'Identifiants publics en double');
assert.deepEqual(new Set(catalog.map(s=>s.slug)),ids,'Une histoire publiée manque ou un brouillon est exposé.');
assert.equal(urls.length,publicStories.length+4,'Le sitemap doit comprendre les 4 pages indexables et les histoires publiées.');
assert.equal(new Set(urls).size,urls.length,'URLs de sitemap dupliquées.');
assert.ok(urls.every(url=>url.startsWith(site+'/')),'Domaine canonique incorrect.');
assert.ok(!sitemap.includes('/admin/'),'La page admin ne doit pas figurer dans le sitemap.');

const pages=['index.html','histoires.html','ecouter.html','qui-suis-je.html','confidentialite.html'];
for(const path of pages){
 const html=await text(path);
 assert.match(html,/<html\b[^>]*lang="fr"/,`${path}: langue manquante`);
 assert.match(html,/<meta\b(?=[^>]*\bname="viewport")[^>]*>/,`${path}: viewport manquant`);
 assert.match(html,/<link\s+rel="canonical"\s+href="https:\/\//,`${path}: canonical absent`);
 assert.match(html,/href="\/assets\/style\.css"/,`${path}: CSS non absolu`);
 assert.match(html,/footer-social-area/,`${path}: footer social manquant`);
 assert.equal((html.match(/class="container footer-social-area"/g)||[]).length,1,`${path}: footer dupliqué`);
 assert.match(html,/www\.instagram\.com\/les_histoires_2_dans_ma_tete/,`${path}: Instagram manquant`);
 assert.match(html,/facebook\.com\/profile\.php\?id=61587115217827/,`${path}: Facebook manquant`);
 assert.match(html,/<script type="application\/ld\+json">/,`${path}: données structurées absentes`);
}
const list=await text('histoires.html');
assert.match(list,/assets\/catalogue\.js/, 'Le catalogue et ses filtres doivent rester sur la page histoires.');
const home=await text('index.html');
assert.doesNotMatch(home,/id="story-grid"/, 'La grille supprimée ne doit pas revenir sur l’accueil.');
assert.match(home,/section-heading/, 'La rubrique histoires doit rester présente sur l’accueil.');

for(const story of catalog){
 const page=`histoires/${story.slug}/index.html`;
 const html=await text(page);
 assert.match(html,/class="reading-body"/,`${story.slug}: texte intégral absent`);
 assert.ok(html.includes(story.description),`${story.slug}: résumé absent`);
 assert.ok(html.includes(`href="${site}/histoires/${story.slug}/"`),`${story.slug}: canonical incorrect`);
 const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert.equal(blocks.length,1,`${story.slug}: données structurées manquantes ou dupliquées`);
 const json=JSON.parse(blocks[0][1]);
 const schemas=Array.isArray(json)?json:[json];
 assert.ok(schemas.some(item=>item['@type']==='Article'),`${story.slug}: Schema Article absent`);
 assert.ok(urls.includes(`${site}/histoires/${story.slug}/`),`${story.slug}: absent du sitemap`);
 assert.ok(rss.includes(`${site}/histoires/${story.slug}/`),`${story.slug}: absent du RSS`);
 const episode=validateEpisodeConfig(config.stories?.[story.slug]??{src:'',platforms:{}},story.slug);
 if(episode.src){
  assert.match(html,/<audio\b[^>]*controls/,`${story.slug}: lecteur audio absent`);
  assert.ok(schemas.some(item=>item['@type']==='PodcastEpisode'),`${story.slug}: Schema PodcastEpisode absent`);
  if(localAudio(episode.src)){
   const file=join(dist,episode.src);
   assert.ok((await stat(file)).isFile(),`${story.slug}: fichier audio absent de dist`);
  }
 }else{
  assert.doesNotMatch(html,/<audio\b[^>]*controls/,`${story.slug}: lecteur activé sans MP3`);
  assert.ok(!schemas.some(item=>item['@type']==='PodcastEpisode'),`${story.slug}: faux épisode podcast dans Schema.org`);
 }
}
console.log(`✓ Audit dist : ${catalog.length} histoires, ${pages.length} pages générales, SEO, audio, footer, réseaux et sitemap/RSS.`);
