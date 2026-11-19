import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {christmasPlatformLinks,christmasHtml,validateChristmasConfig} from '../../scripts/christmas.mjs';

const load=async()=>JSON.parse(await readFile('content/noel.config.json','utf8'));
const template=()=>readFile('content/noel.template.html','utf8');
const spotify='https://open.spotify.com/episode/noel-sp';
const youtube='https://www.youtube.com/watch?v=xyz123';

test('Noël : Spotify et YouTube indépendants pour l’introduction et chacune des 25 cases',async()=>{
 const config=await load();
 config.introduction={...config.introduction,src:'',platforms:{spotify,youtube}};
 config.episodes[0]={...config.episodes[0],src:'',platforms:{spotify,youtube}};
 assert.doesNotThrow(()=>validateChristmasConfig(config));
 const html=await christmasHtml(config,await template());
 assert.match(html,/Écouter l’introduction sur Spotify/);
 assert.match(html,/Écouter l’introduction sur YouTube/);
 assert.match(html,/href="https:\/\/open\.spotify\.com\/episode\/noel-sp"/);
 assert.match(html,/href="https:\/\/www\.youtube\.com\/watch\?v=xyz123"/);
 assert.doesNotMatch(html,/L’enregistrement d’introduction sera bientôt disponible/);
 const data=JSON.parse(html.match(/<script id="christmas-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.episodes.length,25);
 assert.equal(data.episodes[0].platforms.spotify,spotify);
 assert.equal(data.episodes[0].platforms.youtube,youtube);
 assert.deepEqual(data.episodes[1].platforms,christmasPlatformLinks(config.episodes[1]));
});

test('Noël : une seule plateforme renseignée fonctionne, aucune plateforme affiche attente',async()=>{
 const cfg=await load();
 cfg.introduction={...cfg.introduction,src:'',platforms:{spotify:'',youtube}};
 cfg.episodes[0]={...cfg.episodes[0],src:'',platforms:{spotify:'',youtube}};
 const html=await christmasHtml(cfg,await template());
 const prologue=html.split('<section class="christmas-calendar"')[0];
 assert.match(prologue,/Écouter l’introduction sur YouTube/);
 assert.doesNotMatch(prologue,/Écouter l’introduction sur Spotify/);
 assert.doesNotMatch(prologue,/class="christmas-prologue-placeholder"/);
 cfg.introduction.platforms={spotify:'',youtube:''};
 const empty=await christmasHtml(cfg,await template());
 assert.match(empty,/class="christmas-prologue-placeholder"/);
});

test('Noël : anciens platformUrl Spotify et YouTube reconnus, nouvelle config prioritaire',()=>{
 assert.equal(christmasPlatformLinks({platformUrl:spotify}).spotify,spotify);
 assert.equal(christmasPlatformLinks({platformUrl:youtube}).youtube,youtube);
 assert.equal(christmasPlatformLinks({platforms:{spotify:'',youtube},platformUrl:spotify}).spotify,'');
 assert.equal(christmasPlatformLinks({platforms:{spotify,youtube:''},platformUrl:youtube}).youtube,'');
 assert.equal(christmasPlatformLinks({platformUrl:'https://podcasts.example.com/episode/1'}).legacy,'https://podcasts.example.com/episode/1');
});

test('Noël : plateformes invalides rejetées sans injection de HTML ni protocole dangereux',async()=>{
 const config=await load();
 for(const malicious of ['javascript:alert(1)','http://youtube.com/watch?v=hi','https://user:pass@youtube.com/a','https://youtube.com/a" onclick="alert(1)','https://example.org/<svg>']){
  for(const provider of ['spotify','youtube']){
   const bad=structuredClone(config);bad.episodes[0].platforms={[provider]:malicious};
   assert.throws(()=>validateChristmasConfig(bad),/lien plateforme|HTTPS/);
  }
 }
 for(const platforms of [{deezer:'https://example.org/x'},[],null,'wrong']){
  const bad=structuredClone(config);bad.introduction.platforms=platforms;
  assert.throws(()=>validateChristmasConfig(bad),/platforms|plateforme/);
 }
 const injection=structuredClone(config);injection.episodes[0].title='</script><svg onload=alert(1)>';injection.episodes[0].platforms={spotify,youtube};
 const safe=await christmasHtml(injection,await template());
 assert.doesNotMatch(safe,/<svg onload=alert/);
 assert.match(safe,/\\u003c\/script>/);
});

test('Noël : migration non destructive et idempotente des anciennes URL vers Spotify/YouTube',async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'h2-noel-platforms-'));
 try{
  await mkdir(join(tmp,'content'),{recursive:true});
  const config=await load();delete config.introduction.platforms;delete config.episodes[0].platforms;
  config.introduction.platformUrl=spotify;config.introduction.src='https://media.example.org/intro.mp3';
  config.episodes[0].platformUrl=youtube;config.episodes[0].src='https://media.example.org/01.mp3';
  await writeFile(join(tmp,'content/noel.config.json'),JSON.stringify(config,null,2));
  await writeFile(join(tmp,'content/carousel.config.json'),JSON.stringify({stories:[{slug:'mon-histoire'}],christmasTeaser:{enabled:true}}));
  await writeFile(join(tmp,'content/platforms.config.json'),JSON.stringify({platforms:{spotify:'',youtube:''}}));
  await writeFile(join(tmp,'content/visibility.config.json'),JSON.stringify({stories:{}}));
  const execute=()=>spawnSync(process.execPath,[resolve('scripts/setup-content-config.mjs')],{cwd:tmp,encoding:'utf8'});
  const one=execute();assert.equal(one.status,0,one.stderr);
  const path=join(tmp,'content/noel.config.json');const once=await readFile(path,'utf8');
  const migrated=JSON.parse(once);
  assert.equal(migrated.introduction.platforms.spotify,spotify);
  assert.equal(migrated.episodes[0].platforms.youtube,youtube);
  assert.equal(migrated.introduction.platformUrl,spotify);
  assert.equal(migrated.episodes[0].platformUrl,youtube);
  assert.equal(migrated.introduction.src,'https://media.example.org/intro.mp3');
  assert.equal(migrated.episodes[0].src,'https://media.example.org/01.mp3');
  const two=execute();assert.equal(two.status,0,two.stderr);
  assert.equal(await readFile(path,'utf8'),once);
 }finally{await rm(tmp,{recursive:true,force:true})}
});

test('Noël : les liens des cases sont créés au clic et seulement quand la case est déverrouillée',async()=>{
 const js=await readFile('site/assets/christmas.js','utf8');
 assert.match(js,/if\(!allowed\)return;/);
 assert.match(js,/episode\.platforms/);
 assert.match(js,/\['spotify','Spotify'\]/);
 assert.match(js,/\['youtube','YouTube'\]/);
 assert.match(js,/links\.append\(link\)/);
 const css=await readFile('site/assets/christmas.css','utf8');
 assert.match(css,/christmas-platform-links/);
 assert.match(css,/christmas-platform-link--spotify/);
 assert.match(css,/christmas-platform-link--youtube/);
});
