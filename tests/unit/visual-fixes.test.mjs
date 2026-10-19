import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {renderReadingWithImages,sanitizeStoryHTML} from '../../scripts/stories.mjs';
import {inlineImagesFor,validateInlineImage} from '../../scripts/inline-images.mjs';

const src=async file=>readFile(file,'utf8');

test('L’illustration est insérée après le deuxième paragraphe, sans modifier le récit',()=>{
 const raw='<p>Premier paragraphe.</p><p>Mot laissé sur la table.</p><p>Troisième paragraphe.</p>';
 const image={afterParagraph:2,src:'assets/images/04-Flash-2.jpg',alt:'Mot de Flash'};
 const result=renderReadingWithImages(sanitizeStoryHTML(raw),[image]);
 assert.match(result,/<\/p><figure class="reading-illustration"><img src="\.\.\/\.\.\/assets\/images\/04-Flash-2\.jpg"/);
 assert.equal(result.replace(/<figure class="reading-illustration">[\s\S]*?<\/figure>/g,''),sanitizeStoryHTML(raw));
 assert.ok(result.indexOf('Mot laissé sur la table.')<result.indexOf('reading-illustration'));
 assert.ok(result.indexOf('reading-illustration')<result.indexOf('Troisième paragraphe.'));
});

test('Une illustration externe, un chemin traversant ou un alt manquant est rejeté',()=>{
 for(const src of ['https://evil.example/image.jpg','assets/images/../../env','assets/stories/hero.svg']){
  assert.throws(()=>validateInlineImage({afterParagraph:1,src,alt:'image'}));
 }
 assert.throws(()=>validateInlineImage({afterParagraph:0,src:'assets/images/photo.jpg',alt:'photo'}));
 assert.throws(()=>validateInlineImage({afterParagraph:1,src:'assets/images/photo.jpg',alt:''}));
 assert.throws(()=>renderReadingWithImages('<p>un paragraphe</p>',[{afterParagraph:4,src:'assets/images/photo.jpg',alt:'photo'}]));
 const img={afterParagraph:1,src:'assets/images/photo.jpg',alt:'" onerror="alert(1)'};
 const safe=renderReadingWithImages('<p>Texte</p>',[img]);
 assert.match(safe,/alt="&quot; onerror=&quot;alert\(1\)"/);
 assert.doesNotMatch(safe,/"\s+onerror=/);
});

test('Les illustrations internes utilisent automatiquement une variante WebP locale',async()=>{
 const path='site/assets/images/_test-h2-inline.jpg';
 const opt='site/assets/images/optimized/_test-h2-inline.webp';
 await mkdir('site/assets/images/optimized',{recursive:true});
 try{
  await writeFile(path,'original');await writeFile(opt,'webp');
  const images=await inlineImagesFor('test',{test:[{afterParagraph:1,src:'assets/images/_test-h2-inline.jpg',alt:'Une illustration'}]});
  assert.equal(images[0].src,'assets/images/optimized/_test-h2-inline.webp');
 }finally{await rm(path,{force:true});await rm(opt,{force:true});}
});

test('Les six retouches demandées restent en place sur l’accueil',async()=>{
 const html=await src('site/index.html'),css=await src('site/assets/style.css');
 assert.doesNotMatch(html,/<span aria-hidden="true" class="mini-hearts">[^<]*<i>/);
 assert.match(html,/class="mini-hearts">♥<\/span>/);
 assert.match(html,/M3 36 C27 38 39 7 74 9/);
 assert.match(css,/\.cover-controls\{[^}]*bottom:-34px/);
 assert.match(css,/\.listen-layout\{position:relative;z-index:1/);
 assert.match(css,/\.listen-sparkle\{position:absolute;z-index:0;pointer-events:none/);
 assert.match(css,/\.closing-box>div\{position:relative;z-index:1/);
});

test('Le filtre du catalogue conserve les cartes et les images en mémoire',async()=>{
 const source=await src('site/assets/catalogue.js');
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.hidden=false;this.value='';this.attributes={};this.style={};this.calls=0;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.calls++;this.children=nodes;}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(type,listener){this.listeners[type]=listener;}
  emit(type){this.listeners[type]?.();}
 }
 const dom=Object.fromEntries(['catalogue-grid','story-search','story-theme','catalogue-count','catalogue-empty'].map(id=>[id,new Element()]));
 const stories=[
  {slug:'ours',title:'Petit ourson',description:'Un ourson courageux',tags:['Courage'],image:'assets/images/optimized/ours.webp'},
  {slug:'amis',title:'Deux amis',description:'Une amitié fidèle',tags:['Amitié'],image:'assets/images/optimized/amis.webp'}
 ];
 runInNewContext(source,{
  document:{getElementById:id=>dom[id],createElement:tag=>new Element(tag)},
  fetch:async()=>({ok:true,json:async()=>stories}),
  console
 });
 for(let i=0;i<15 && dom['catalogue-grid'].children.length===0;i++)await new Promise(r=>setTimeout(r,0));
 const grid=dom['catalogue-grid'];
 assert.equal(grid.children.length,2);
 assert.equal(grid.calls,1);
 const first=grid.children[0],second=grid.children[1];
 dom['story-search'].value='ours';dom['story-search'].emit('input');
 assert.equal(grid.calls,1,'Ne pas remonter/recharger les cartes à chaque recherche');
 assert.equal(grid.children[0],first);
 assert.equal(grid.children[1],second);
 assert.equal(first.hidden,false);assert.equal(second.hidden,true);
 dom['story-search'].value='';dom['story-search'].emit('input');
 assert.equal(second.hidden,false);assert.equal(grid.calls,1);
 dom['story-theme'].value='Amitié';dom['story-theme'].emit('change');
 assert.equal(first.hidden,true);assert.equal(second.hidden,false);
 assert.equal(grid.calls,1);
});
