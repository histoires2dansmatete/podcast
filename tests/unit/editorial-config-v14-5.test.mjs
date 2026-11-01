import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyShowPlatforms,validateShowPlatforms} from '../../scripts/platform-links.mjs';
import {applyDefaultVisibility,validateVisibilityConfig} from '../../scripts/visibility.mjs';
import {disabledStories,publicStories} from '../../functions/_lib/story-state.js';
import {renderCarousel,validateCarouselConfig} from '../../scripts/carousel.mjs';
import {validateChristmasPlatformUrl,christmasHtml} from '../../scripts/christmas.mjs';
const stories=[{slug:'premiere',title:'Première',image:'assets/stories/premiere.svg',audioUrl:'',platforms:{}},{slug:'seconde',title:'Seconde',image:'assets/stories/seconde.svg',audioUrl:'',platforms:{}}];

test('Les liens d’émission activent accueil et Où écouter sans HTML arbitraire',()=>{
 const input={platforms:{spotify:'https://open.spotify.com/show/abcdef',apple:'',deezer:'',amazon:''}};
 const template='<a class="platform-card" data-platform="spotify" aria-disabled="true"><span class="platform-status">À venir</span></a>';
 const changed=applyShowPlatforms(template,input);
 assert.match(changed,/href="https:\/\/open.spotify.com\/show\/abcdef"/);
 assert.match(changed,/rel="noopener noreferrer"/);
 assert.match(changed,/>Écouter ↗<\/span>/);
 assert.equal(applyShowPlatforms(changed,input),changed);
 const removed=applyShowPlatforms(changed,{platforms:{spotify:''}});
 assert.doesNotMatch(removed,/href=/);
 assert.match(removed,/aria-disabled="true"/);
 for(const src of ['javascript:alert(1)','http://example.org/x','https://user:pass@example.org/x','https://example.org/" onmouseover="alert(1)']){
  assert.throws(()=>validateShowPlatforms({platforms:{spotify:src}}));
 }
 assert.throws(()=>validateShowPlatforms({platforms:{tiktok:'https://example.org'}}),/inconnue/);
});

test('Visibilité JSON par défaut, override D1 prioritaire et filtrage public',async()=>{
 const catalog=applyDefaultVisibility(stories,{stories:{premiere:false,seconde:true}});
 assert.equal(catalog[0].visibleByDefault,false);
 assert.equal(catalog[1].visibleByDefault,true);
 const env={ANALYTICS_DB:{prepare(query){assert.match(query,/SELECT slug, enabled FROM story_states/);return {all:async()=>({results:[{slug:'premiere',enabled:1},{slug:'seconde',enabled:0}]})}}}};
 const disabled=await disabledStories(env,catalog);
 assert.deepEqual([...disabled],['seconde']);
 const publicList=publicStories(catalog,disabled);
 assert.deepEqual(publicList.map(s=>s.slug),['premiere']);
 assert.ok(!('visibleByDefault' in publicList[0]));
 const emptyEnv={ANALYTICS_DB:{prepare:()=>({all:async()=>({results:[]})})}};
 assert.deepEqual([...await disabledStories(emptyEnv,catalog)],['premiere']);
 await assert.rejects(disabledStories({},catalog),/D1/);
 assert.throws(()=>validateVisibilityConfig({stories:{inconnue:false}},stories),/inconnue/);
 assert.throws(()=>validateVisibilityConfig({stories:{premiere:'false'}},stories),/true ou false/);
});

test('Le teaser saisonnier possède une vraie image locale et reste masqué hors saison',async()=>{
 const c={rotationSeconds:5,stories:[{slug:'premiere'}],christmasTeaser:{enabled:true,position:2,image:'assets/images/noel-teaser.svg',label:'Noël en famille',color:'#285047'}};
 assert.doesNotThrow(()=>validateCarouselConfig(c,stories));
 const html=renderCarousel(c,stories);
 assert.match(html,/data-special="noel"[^>]*hidden/);
 assert.match(html,/assets\/images\/noel-teaser\.svg/);
 assert.match(html,/aria-disabled="true"/);
 assert.equal((html.match(/data-cover="/g)||[]).length,2);
 const file=await readFile('site/assets/images/noel-teaser.svg','utf8');assert.match(file,/<svg/);
 assert.throws(()=>validateCarouselConfig({...c,christmasTeaser:{...c.christmasTeaser,image:'../../secret.svg'}},stories),/image locale/);
 assert.throws(()=>validateCarouselConfig({...c,christmasTeaser:{...c.christmasTeaser,position:8}},stories),/position/);
 const javascript=await readFile('site/assets/main.js','utf8');assert.match(javascript,/christmasCover\.hidden/);assert.match(javascript,/month===11/);assert.match(javascript,/Ouverture le 25 novembre/);
});

test('Noël : chaque case peut proposer son MP3 et un lien HTTPS vers un épisode',async()=>{
 assert.equal(validateChristmasPlatformUrl(''), '');
 assert.equal(validateChristmasPlatformUrl('https://open.spotify.com/episode/abc'),'https://open.spotify.com/episode/abc');
 for(const value of ['javascript:alert(1)','http://example.com/x','https://x:pass@example.com/x','https://example.com/\" onload=\"a'])assert.throws(()=>validateChristmasPlatformUrl(value));
 const config=JSON.parse(await readFile('content/noel.config.json','utf8'));
 config.episodes[0].platformUrl='https://open.spotify.com/episode/ep1';
 config.introduction.platformUrl='https://open.spotify.com/episode/intro';
 const html=await christmasHtml(config,await readFile('content/noel.template.html','utf8'));
 assert.match(html,/Écouter l’introduction sur la plateforme/);
 assert.match(html,/https:\/\/open.spotify.com\/episode\/ep1/);
 const script=await readFile('site/assets/christmas.js','utf8');assert.match(script,/episode\.platformUrl/);
});
