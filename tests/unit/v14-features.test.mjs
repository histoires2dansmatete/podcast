import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {applyPodcastCopy} from '../../scripts/podcast-copy.mjs';
import {normalizeRegressionContent} from '../../scripts/regression-contract.mjs';

const story={slug:'exemple',audioUrl:'',platforms:{}};
test('L’accueil suit le nombre de podcasts et revient à zéro sans dérive après plusieurs générations',async()=>{
 let html=await readFile('site/index.html','utf8');
 const empty=applyPodcastCopy(html,[story],'index.html');
 const ready=applyPodcastCopy(empty,[{...story,audioUrl:'https://cdn.example.org/podcast.mp3'}],'index.html');
 assert.match(ready,/Et aussi<\/em>/);assert.match(ready,/1 épisode audio/);assert.match(ready,/la magie est là/);
 assert.equal(normalizeRegressionContent('site/index.html',empty),normalizeRegressionContent('site/index.html',ready));
 const reverted=applyPodcastCopy(ready,[story],'index.html');
 assert.match(reverted,/Et bientôt<\/em>/);assert.match(reverted,/Le podcast est en préparation/);
 assert.equal(normalizeRegressionContent('site/index.html',empty),normalizeRegressionContent('site/index.html',reverted));
 assert.equal(applyPodcastCopy(reverted,[story],'index.html'),reverted);
});

test('Le catalogue filtre immédiatement les histoires avec audio, sans recharger les images',async()=>{
 const src=await readFile('site/assets/catalogue.js','utf8');
 class El {
  constructor(){this.children=[];this.listeners={};this.hidden=false;this.value='';this.attributes={};this.style={};this.textContent='';this.classList={toggle:()=>{}};}
  append(...items){this.children.push(...items)}replaceChildren(...items){this.children=items}setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,fn){this.listeners[k]=fn}fire(k){this.listeners[k]?.()}
 }
 const ids=['catalogue-grid','story-search','story-theme','catalogue-count','catalogue-empty'];
 const elems=Object.fromEntries(ids.map(id=>[id,new El()]));
 const buttons=['all','audio','reading'].map(kind=>{const el=new El();el.dataset={audioFilter:kind};return el});
 const stories=[
  {slug:'un',title:'Histoire lue',tags:['Nature'],audioUrl:'https://cdn.example.org/one.mp3',image:'assets/stories/un.svg'},
  {slug:'deux',title:'Histoire audio ailleurs',tags:['Nature'],platforms:{spotify:'https://open.spotify.com/episode/2'}},
  {slug:'trois',title:'Histoire sans audio',tags:['Nature'],audioUrl:'',platforms:{}}
 ];
 vm.runInNewContext(src,{document:{getElementById:id=>elems[id],querySelectorAll:()=>buttons,createElement:()=>new El()},fetch:async()=>({ok:true,json:async()=>stories}),console});
 for(let n=0;n<15 && elems['catalogue-grid'].children.length<3;n++)await new Promise(resolve=>setTimeout(resolve,0));
 const cards=elems['catalogue-grid'].children;assert.equal(cards.length,3);
 buttons[1].fire('click');assert.deepEqual(cards.map(c=>c.hidden),[false,false,true]);
 assert.equal(buttons[1].attributes['aria-pressed'],'true');
 buttons[2].fire('click');assert.deepEqual(cards.map(c=>c.hidden),[true,true,false]);
 buttons[0].fire('click');assert.deepEqual(cards.map(c=>c.hidden),[false,false,false]);
});

test('Le site expose les commandes audio et partage accessibles et protège le mobile',async()=>{
 const css=await readFile('site/assets/style.css','utf8');
 const js=await readFile('site/assets/main.js','utf8');
 assert.match(css,/\.audio-filter\{/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.story-card:not\(\.catalogue-card\)\{content-visibility:auto/);
 assert.match(css,/\.catalogue-grid \.catalogue-card\{content-visibility:visible/);
 assert.match(js,/navigator\.share/);assert.match(js,/navigator\.clipboard/);
 assert.match(js,/touchstart/);assert.match(js,/touchend/);
 assert.match(js,/data-audio-back/);assert.match(js,/data-audio-forward/);
});
