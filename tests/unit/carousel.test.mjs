import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCarouselConfig,renderCarousel,insertCarousel,isPodcastAvailable} from '../../scripts/carousel.mjs';
import {normalizeRegressionContent} from '../../scripts/regression-contract.mjs';

const stories=[
 {slug:'premiere-histoire',title:'Première histoire',image:'assets/stories/premiere-histoire.svg',audioUrl:'',platforms:{}},
 {slug:'une-autre-histoire',title:'Une autre histoire',image:'assets/images/optimized/autre.webp',audioUrl:'assets/audio/autre.mp3',platforms:{}},
 {slug:'une-troisieme-histoire',title:'Troisième histoire',image:'assets/stories/une-troisieme-histoire.svg',audioUrl:'',platforms:{spotify:'https://open.spotify.com/episode/abcd'}}
];
const cfg={rotationSeconds:4.6,stories:[{slug:'premiere-histoire',label:'Première',color:'#674871'},{slug:'une-autre-histoire',color:'#234567'},{slug:'une-troisieme-histoire'}]};
const markup=()=>renderCarousel(cfg,stories);

test('Le choix et l’ordre des couvertures suivent uniquement le fichier éditorial',()=>{
 const html=markup();
 assert.deepEqual([...html.matchAll(/data-story-slug="([^"]+)"/g)].map(m=>m[1]),cfg.stories.map(s=>s.slug));
 assert.match(html,/--cover-color:#234567/);
 assert.match(html,/class="cover-bottom"><span>Première<\/span>/);
 assert.equal((html.match(/class="cover-card /g)||[]).length,3);
});

test('Le badge distingue MP3, plateformes et épisodes à venir',()=>{
 const html=markup();
 assert.equal((html.match(/data-podcast-status="available"/g)||[]).length,2);
 assert.equal((html.match(/data-podcast-status="upcoming"/g)||[]).length,1);
 assert.match(html,/♫ Podcast disponible/);
 assert.match(html,/◷ Podcast à venir/);
 assert.equal(isPodcastAvailable(stories[0]),false);
 assert.equal(isPodcastAvailable(stories[1]),true);
 assert.equal(isPodcastAvailable(stories[2]),true);
});

test('Les slugs inconnus ou privés, les doublons et les options dangereuses échouent',()=>{
 const edit=entries=>({...cfg,stories:entries});
 assert.throws(()=>validateCarouselConfig(edit([{slug:'inconnue'}]),stories),/absente ou en brouillon/);
 assert.throws(()=>validateCarouselConfig(edit([{slug:'premiere-histoire'},{slug:'premiere-histoire'}]),stories),/doublon/);
 assert.throws(()=>validateCarouselConfig(edit([]),stories),/entre 1 et 12/);
 assert.throws(()=>validateCarouselConfig({...cfg,rotationSeconds:0},stories),/rotationSeconds/);
 assert.throws(()=>validateCarouselConfig(edit([{slug:'premiere-histoire',color:'red; background: url(evil)'}]),stories),/couleur/);
 assert.throws(()=>validateCarouselConfig(edit([{slug:'premiere-histoire',label:'x'.repeat(80)}]),stories),/label/);
});

test('Le titre configurable est échappé et ne peut injecter du HTML',()=>{
 const html=renderCarousel({rotationSeconds:5,stories:[{slug:'premiere-histoire',label:'<script>alert(1)</script>'}]},stories);
 assert.ok(!html.includes('<script>'));
 assert.match(html,/&lt;script&gt;/);
});

test('Une seule couverture désactive les commandes, la génération est idempotente',()=>{
 const config={rotationSeconds:5,stories:[{slug:'une-autre-histoire'}]};
 const source=`<div class="hero-art" aria-label="Couvertures"><div class="art-backdrop"><!-- CAROUSEL-START -->\n<!-- CAROUSEL-END --></div><div aria-label="Le podcast arrive bientôt" class="floating-sticker"><span>Le podcast</span><strong>arrive !</strong></div><div aria-label="Faire défiler les couvertures" class="cover-controls"><span class="cover-index">1 / 6</span></div></div>`;
 const first=insertCarousel(source,config,stories);
 assert.match(first,/class="cover-controls" data-rotation-ms="5000" hidden/);
 assert.match(first,/<span>À écouter<\/span><strong>ici !<\/strong>/);
 assert.equal(first,insertCarousel(first,config,stories));
});

test('Le contrat de régression ignore les cartes générées, pas la structure restante',()=>{
 const template=`<section><h2>Accueil</h2><!-- CAROUSEL-START -->test<!-- CAROUSEL-END --><p>Fin</p></section>`;
 const modified=template.replace('test',markup());
 assert.equal(normalizeRegressionContent('site/index.html',template),normalizeRegressionContent('site/index.html',modified));
 assert.notEqual(normalizeRegressionContent('site/index.html',template),normalizeRegressionContent('site/index.html',modified.replace('<p>Fin</p>','<p>Autre texte</p>')));
});

test('La configuration fournie cible des histoires réellement publiées',async()=>{
 const config=JSON.parse(await readFile('content/carousel.config.json','utf8'));
 const catalog=JSON.parse(await readFile('content/wordpress-stories.json','utf8'));
 assert.ok(validateCarouselConfig(config,catalog));
});


test('Le CSS distingue visuellement les statuts et masque les commandes si nécessaire',async()=>{
 const css=await readFile('site/assets/style.css','utf8');
 assert.match(css,/\.cover-status-available\{[^}]*background:#e4f7df/);
 assert.match(css,/\.cover-status-upcoming\{[^}]*background:#fff6e4/);
 assert.match(css,/\.cover-controls\[hidden\]\{display:none\}/);
});

test('Le script navigateur suit le nombre réel de cartes et la vitesse configurée',async()=>{
 const source=await readFile('site/assets/main.js','utf8');
 assert.match(source,/dataset\.rotationMs/);
 assert.match(source,/visible\.length<2/);
 assert.match(source,/dataset\.podcastStatus/);
 assert.doesNotMatch(source,/setInterval\([^;]*,4600\)/);
});


test('Changer le statut du premier épisode ou la cadence ne casse pas la non-régression',()=>{
 const cfg={rotationSeconds:4,stories:[{slug:'premiere-histoire'}]};
 const ready={...cfg,stories:[{slug:'une-autre-histoire'}]};
 const source=`<div class="hero-art"><div class="art-backdrop"><!-- CAROUSEL-START --><!-- CAROUSEL-END --></div><div aria-label="Le podcast arrive bientôt" class="floating-sticker"><span>Le podcast</span><strong>arrive !</strong></div><div aria-label="Faire défiler les couvertures" class="cover-controls"><span aria-live="polite" class="cover-index">1 / 6</span></div></div>`;
 const a=insertCarousel(source,cfg,stories);
 const b=insertCarousel(a,ready,stories);
 assert.match(b,/data-rotation-ms="4000" hidden/);
 assert.match(b,/1 \/ 1/);
 assert.equal(normalizeRegressionContent('site/index.html',a),normalizeRegressionContent('site/index.html',b));
});

test('L’autocollant du podcast disponible tient dans son cercle, y compris sur mobile',async()=>{
 const ready=insertCarousel(`<div class="art-backdrop"><!-- CAROUSEL-START --><!-- CAROUSEL-END --></div><div aria-label="Le podcast arrive bientôt" class="floating-sticker"><span>Le podcast</span><strong>arrive !</strong></div>`,{rotationSeconds:5,stories:[{slug:'une-autre-histoire'}]},stories);
 assert.match(ready,/<span>À écouter<\/span><strong>ici !<\/strong>/);
 assert.doesNotMatch(ready,/maintenant !/);
 const js=await readFile('site/assets/main.js','utf8');
 const css=await readFile('site/assets/style.css','utf8');
 assert.match(js,/ready\?'ici !':'arrive !'/);
 assert.match(css,/\.floating-sticker\{[^}]*display:flex;flex-direction:column;align-items:center;justify-content:center/);
 assert.match(css,/\.floating-sticker\[data-status="available"\]\{[^}]*background:#624666/);
 assert.match(css,/\.floating-sticker\[data-status="upcoming"\]\{[^}]*background:#fff7e9/);
 assert.match(css,/\.floating-sticker\[data-status="available"\] \.sticker-burst\{[^}]*top:-15px/);
 assert.match(css,/\.floating-sticker\[data-status="upcoming"\] \.sticker-burst\{display:none/);
 assert.match(css,/@media\(max-width:480px\)[^\n]*\.floating-sticker\[data-status="available"\]\{width:103px;height:63px/);
 assert.match(css,/@media\(max-width:480px\)[^\n]*\.floating-sticker\[data-status="upcoming"\]\{width:108px;height:59px/);
});
