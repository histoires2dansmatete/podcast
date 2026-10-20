import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink,stat} from 'node:fs/promises';
import {christmasState,parisDay,christmasPath,christmasAudioDay,christmasIntroductionAudio,christmasDenied,christmasHeaders,christmasAccess} from '../../functions/_lib/christmas.js';
import {validateChristmasConfig,christmasHtml,withChristmasIntroduction} from '../../scripts/christmas.mjs';
import {localChristmasPreview} from '../../scripts/christmas-local-preview.mjs';
import {onRequest} from '../../functions/_middleware.js';
const utc=s=>new Date(s);

test('Ouverture Paris : 25 novembre 00:00 jusqu’au 26 décembre 23:59',()=>{
 assert.equal(christmasState(utc('2026-11-24T22:59:00Z')).open,false);
 assert.equal(christmasState(utc('2026-11-24T23:01:00Z')).open,true);
 assert.equal(christmasState(utc('2026-12-26T22:59:00Z')).open,true);
 assert.equal(christmasState(utc('2026-12-26T23:01:00Z')).open,false);
 assert.deepEqual(parisDay(utc('2026-11-24T23:01:00Z')),{year:2026,month:11,day:25});
});

test('Cases verrouillées avant décembre, libérées chaque jour jusqu’à Noël',()=>{
 assert.equal(christmasState(utc('2026-11-30T12:00:00Z')).unlocked,0);
 assert.equal(christmasState(utc('2026-12-01T13:00:00Z')).unlocked,1);
 assert.equal(christmasState(utc('2026-12-24T13:00:00Z')).unlocked,24);
 assert.equal(christmasState(utc('2026-12-25T13:00:00Z')).unlocked,25);
 assert.equal(christmasState(utc('2026-12-26T13:00:00Z')).unlocked,25);
});

test('Les deux variantes d’URL du calendrier et les MP3 numérotés sont protégés',()=>{
 for(const path of ['/noel/','/noel/index.html','/noel','/noel/extra.html'])assert.equal(christmasPath(path),true);
 assert.equal(christmasPath('/histoires.html'),false);
 assert.equal(christmasAudioDay('/assets/audio/noel/25.mp3'),25);
 assert.equal(christmasAudioDay('/assets/audio/noel/01.mp3'),1);
 assert.equal(christmasAudioDay('/assets/audio/noel/26.mp3'),null);
 assert.equal(christmasDenied().status,404);
 assert.equal(christmasHeaders(new Response('ok')).headers.get('Cache-Control'),'private, no-store, max-age=0');
});

test('Middleware Pages : refuse la page hors saison avant la lecture D1',async()=>{
 const fn=await readFile('functions/_middleware.js','utf8');
 assert.ok(fn.indexOf('if(seasonalAccess!==null)')<fn.indexOf('disabledStories(context.env)'));
 assert.match(fn,/return christmasHeaders\(await context.next\(\)\)/);
 assert.match(fn,/return christmasDenied\(\)/);
 assert.equal(christmasAccess('/noel/',utc('2026-10-19T18:00:00Z')),false);
 assert.equal(christmasAccess('/noel/index.html',utc('2026-11-25T13:00:00Z')),true);
 assert.equal(christmasAccess('/noel/',utc('2026-12-27T01:00:00Z')),false);
 assert.equal(christmasAccess('/assets/audio/noel/01.mp3',utc('2026-11-28T12:00:00Z')),false);
 assert.equal(christmasAccess('/assets/audio/noel/01.mp3',utc('2026-12-01T12:00:00Z')),true);
 assert.equal(christmasAccess('/assets/audio/noel/02.mp3',utc('2026-12-01T12:00:00Z')),false);
 assert.equal(christmasAccess('/assets/audio/noel/%30%32.mp3',utc('2026-12-01T12:00:00Z')),false);
 assert.equal(christmasAccess('/assets/audio/noel/private.mp3',utc('2026-12-01T12:00:00Z')),false);
 assert.equal(christmasAccess('/histoires.html',utc('2026-12-01T12:00:00Z')),null);
});

test('Configuration : 25 parties uniques, chaînes sûres, URLs MP3 HTTPS ou nom local exact',async()=>{
 const config=JSON.parse(await readFile('content/noel.config.json','utf8'));
 assert.equal(validateChristmasConfig(config).episodes.length,25);
 const clone=()=>structuredClone(config);
 let invalid=clone();invalid.episodes.pop();assert.throws(()=>validateChristmasConfig(invalid),/25 épisodes/);
 invalid=clone();invalid.episodes[1].day=1;assert.throws(()=>validateChristmasConfig(invalid),/uniques/);
 invalid=clone();invalid.episodes[0].src='javascript:alert(1)';assert.throws(()=>validateChristmasConfig(invalid),/HTTPS/);
 invalid=clone();invalid.episodes[0].src='assets/audio/noel/../02.mp3';assert.throws(()=>validateChristmasConfig(invalid),/HTTPS/);
 invalid=clone();invalid.episodes[0].src='https://example.com/part01.mp3';assert.doesNotThrow(()=>validateChristmasConfig(invalid));
 invalid=clone();invalid.episodes[0].src='http://example.com/part01.mp3';assert.throws(()=>validateChristmasConfig(invalid),/HTTPS/);
});

test('Génération sécurisée de 25 portes, initialement fermées, et lecteurs en différé',async()=>{
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));
 const tpl=await readFile('content/noel.template.html','utf8');
 const html=await christmasHtml(cfg,tpl);
 assert.equal((html.match(/class="christmas-door"/g)||[]).length,25);
 assert.equal((html.match(/disabled aria-label="Case/g)||[]).length,25);
 assert.match(html,/data-day="25"/);
 assert.doesNotMatch(html,/<audio\b/);
 assert.match(html,/content="noindex,nofollow"/);
 const attack=structuredClone(cfg);attack.episodes[0].title='</script><img src=x onerror=alert(1)>';
 const safe=await christmasHtml(attack,tpl);
 assert.doesNotMatch(safe,/<img src=x onerror/);
 assert.match(safe,/\\u003c\/script>/);
});

test('La route saisonnière reste dans le manifeste Cloudflare Pages',async()=>{
 const routes=JSON.parse(await readFile('site/_routes.json','utf8'));
 for(const p of ['/noel/*','/noel','/assets/audio/noel/*'])assert.ok(routes.include.includes(p));
 const files=await Promise.all(['site/assets/christmas.css','site/assets/christmas.js'].map(f=>readFile(f,'utf8')));
 assert.match(files[1],/Europe\/Paris/);
 assert.match(files[1],/audio\.controls=true/);
 assert.match(files[0],/max-width:480px/);
});


test('Aperçu local : ?preview=1 déverrouille la page et les MP3 sans variable d’environnement',async()=>{
 assert.equal(localChristmasPreview('/noel/?preview=1'),true);
 assert.equal(localChristmasPreview('/noel/index.html?preview=1'),true);
 assert.equal(localChristmasPreview('/assets/audio/noel/01.mp3?preview=1'),true);
 assert.equal(localChristmasPreview('/assets/audio/noel/25.mp3?preview=1'),true);
 assert.equal(localChristmasPreview('/noel/'),false);
 assert.equal(localChristmasPreview('/assets/audio/noel/01.mp3'),false);
 assert.equal(localChristmasPreview('/noel/?preview=0'),false);
 assert.equal(localChristmasPreview('/histoires.html?preview=1'),false);
 assert.equal(localChristmasPreview('/noel/?preview=1',{hostname:'podcast-7ck.pages.dev'}),false);
 assert.equal(localChristmasPreview('/assets/audio/noel/01.mp3?preview=1',{hostname:'podcast-7ck.pages.dev'}),false);
 assert.equal(localChristmasPreview('/noel/',{enabled:true}),true);
 const javascript=await readFile('site/assets/christmas.js','utf8');
 assert.match(javascript,/localPreview\?'\?preview=1'/);
 const server=await readFile('scripts/server.mjs','utf8');
 assert.match(server,/localChristmasPreview\(requestUrl/);
});


test('Cloudflare n’utilise aucun déverrouillage ?preview=1',async()=>{
 const middleware=await readFile('functions/_middleware.js','utf8');
 assert.match(middleware,/christmasAccess\(path\)/);
 assert.doesNotMatch(middleware,/localChristmasPreview|CHRISTMAS_PREVIEW|searchParams\.get\(['"]preview/);
 assert.equal(christmasAccess('/noel/',utc('2026-10-20T12:00:00Z')),false);
 assert.equal(christmasAccess('/assets/audio/noel/01.mp3',utc('2026-10-20T12:00:00Z')),false);
});


test('La préface apparaît sous le hero, sans mention du fuseau dans le texte visible',async()=>{
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));
 const tpl=await readFile('content/noel.template.html','utf8');
 const html=await christmasHtml(cfg,tpl);
 const hero=html.indexOf('class="christmas-hero"');
 const intro=html.indexOf('class="christmas-prologue"');
 const calendar=html.indexOf('class="christmas-calendar"');
 assert.ok(hero>=0&&intro>hero&&calendar>intro);
 assert.match(html,/id="christmas-prologue-title">Avant d’ouvrir la première porte/);
 assert.match(html,/class="christmas-prologue-placeholder"/);
 assert.doesNotMatch(html,/Heure de Paris|heure de Paris/);
 assert.equal((html.match(/class="christmas-door"/g)||[]).length,25);
});

test('Introduction : texte libre échappé, paragraphes conservés, et MP3 HTTPS avec lecteur',async()=>{
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));
 const tpl=await readFile('content/noel.template.html','utf8');
 cfg.introduction.title='<img src=x onerror=alert(1)>';
 cfg.introduction.text='Un premier paragraphe.\n\n<script>alert(1)</script>\nune seconde ligne.';
 cfg.introduction.src='https://media.example.org/noel/introduction.mp3';
 const html=await christmasHtml(cfg,tpl);
 assert.match(html,/class="christmas-prologue-text"><p>Un premier paragraphe.<\/p><p>&lt;script&gt;alert\(1\)&lt;\/script&gt;<br>une seconde ligne.<\/p>/);
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
 assert.doesNotMatch(html,/<img src=x onerror/);
 assert.match(html,/id="christmas-intro-audio" controls preload="none" data-src="https:\/\/media.example.org\/noel\/introduction.mp3"/);
 assert.doesNotMatch(html,/class="christmas-prologue-placeholder"/);
});

test('Introduction : refus des URL dangereuses et contenu obligatoire',async()=>{
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));
 const clone=()=>structuredClone(cfg);
 let bad=clone();delete bad.introduction;assert.doesNotThrow(()=>validateChristmasConfig(bad));
 bad=clone();bad.introduction.text='';assert.throws(()=>validateChristmasConfig(bad),/texte introduction/);
 for(const src of ['javascript:alert(1)','http://example.org/intro.mp3','assets/audio/noel/../02.mp3','assets/audio/noel/01.mp3','https://example.com/file.mp3#fragment']){
  bad=clone();bad.introduction.src=src;
  assert.throws(()=>validateChristmasConfig(bad),/MP3 introduction/);
 }
 bad=clone();bad.introduction.src='assets/audio/noel/introduction.mp3';
 assert.doesNotThrow(()=>validateChristmasConfig(bad));
});

test('Introduction MP3 locale : protège la ressource hors saison, l’autorise pendant novembre-décembre',()=>{
 const p='/assets/audio/noel/introduction.mp3';
 assert.equal(christmasIntroductionAudio(p),true);
 assert.equal(christmasIntroductionAudio('/assets/audio/noel/01.mp3'),false);
 assert.equal(christmasAccess(p,utc('2026-10-20T12:00:00Z')),false);
 assert.equal(christmasAccess(p,utc('2026-11-25T12:00:00Z')),true);
 assert.equal(christmasAccess(p,utc('2026-12-26T12:00:00Z')),true);
 assert.equal(christmasAccess(p,utc('2026-12-27T12:00:00Z')),false);
 assert.equal(localChristmasPreview(p+'?preview=1'),true);
 assert.equal(localChristmasPreview(p),false);
 assert.equal(localChristmasPreview(p+'?preview=1',{hostname:'podcast-7ck.pages.dev'}),false);
});

test('Le générateur vérifie la présence du MP3 local sans modifier les 25 autres parties',async()=>{
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));
 const tpl=await readFile('content/noel.template.html','utf8');
 cfg.introduction.src='assets/audio/noel/introduction.mp3';
 const file='site/assets/audio/noel/introduction.mp3';
 let exists=true;
 try{await stat(file);}catch{exists=false;}
 if(!exists)await assert.rejects(christmasHtml(cfg,tpl),/MP3 absent du projet/);
 let created=false;
 try{
  if(!exists){await writeFile(file,Buffer.from('ID3-test-de-fonctionnement'));created=true;}
  const html=await christmasHtml(cfg,tpl);
  assert.match(html,/data-src="assets\/audio\/noel\/introduction.mp3"/);
  assert.equal((html.match(/class="christmas-door"/g)||[]).length,25);
 }finally{if(created)await unlink(file);}
});

test('JS lecteur introduction : prévisualisation et exclusion des lectures simultanées',async()=>{
 const js=await readFile('site/assets/christmas.js','utf8');
 assert.match(js,/document.getElementById\('christmas-intro-audio'\)/);
 assert.match(js,/introductionAudio.src=source.startsWith/);
 assert.match(js,/localPreview\?'\?preview=1'/);
 assert.match(js,/introductionAudio\?\.pause\(\)/);
 assert.match(js,/introductionAudio.addEventListener\('play'/);
 const server=await readFile('scripts/server.mjs','utf8');
 assert.match(server,/'\.mp3': 'audio\/mpeg'/);
});


test('Migration : conserve les 25 épisodes et les liens existants, n’écrase jamais une introduction existante',async()=>{
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));
 const original=structuredClone(cfg);
 delete original.introduction;
 original.episodes[0].src='https://media.example.org/noel/01.mp3';
 const modified=withChristmasIntroduction(original);
 assert.equal(modified.episodes[0].src,'https://media.example.org/noel/01.mp3');
 assert.equal(modified.episodes,original.episodes);
 assert.equal(modified.introduction.src,'');
 assert.doesNotThrow(()=>validateChristmasConfig(modified));
 assert.equal(withChristmasIntroduction(modified),modified);
 const tpl=await readFile('content/noel.template.html','utf8');
 const backward=await christmasHtml(original,tpl);
 assert.match(backward,/class="christmas-prologue"/);
 assert.match(backward,/class="christmas-prologue-placeholder"/);
 const manifest=JSON.parse(await readFile('package.json','utf8'));
 assert.equal(manifest.scripts['noel:intro:setup'],'node scripts/setup-christmas-intro.mjs');
});
