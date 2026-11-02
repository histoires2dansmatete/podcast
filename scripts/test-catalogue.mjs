/** Vérifie le rendu navigateur du catalogue avec images WebP dans optimized/. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  constructor(tag='div') {this.tagName=tag;this.children=[];this.style={};this.listeners={};this.value='';this.hidden=false;}
  append(...children) {this.children.push(...children);}
  replaceChildren(...children) {this.children=[...children];}
  setAttribute(key,value) {this[key]=value;}
  addEventListener(name,fn) {this.listeners[name]=fn;}
  emit(name) {this.listeners[name]?.();}
}
const ids=['catalogue-grid','story-search','story-theme','catalogue-count','catalogue-empty'];
const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
const stories=[
  {slug:'bas-les-masques',title:'Bas les masques',image:'assets/images/optimized/micro2-1.webp',tags:['Différence']},
  {slug:'flemme',title:'Flemme',image:'assets/stories/flemme.svg',tags:['Amitié']},
  {slug:'la-disparition',title:'La disparition',image:'assets/images/optimized/serie/portrait.webp',tags:['Courage']},
  {slug:'non-valide',title:'Chemin invalide',image:'assets/images/optimized/../secret.png',tags:['Attention']},
];
const context={
  document:{getElementById:id=>nodes[id],createElement:tag=>new Element(tag),querySelectorAll:()=>[]},
  fetch:async()=>({ok:true,json:async()=>stories}),
};
vm.runInNewContext(await readFile('site/assets/catalogue.js','utf8'),context,{filename:'site/assets/catalogue.js'});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(nodes['catalogue-grid'].children.length,stories.length,'Toutes les histoires doivent être rendues');
const [optimized,classic,nested,unsafe]=nodes['catalogue-grid'].children;
const cover=card=>card.children[0];
const image=card=>cover(card).children.find(node=>node.tagName==='img');
assert.equal(image(optimized)?.src,'/assets/images/optimized/micro2-1.webp','La bibliothèque doit utiliser les WebP optimisés');
assert.equal(image(classic)?.src,'/assets/stories/flemme.svg','Les couvertures SVG doivent continuer à fonctionner');
assert.equal(image(nested)?.src,'/assets/images/optimized/serie/portrait.webp','Les sous-dossiers optimisés doivent fonctionner');
assert.equal(image(unsafe),undefined,'Les chemins relatifs dangereux doivent être rejetés');
image(optimized).emit('error');
assert.equal(image(optimized).src,'/assets/stories/bas-les-masques.svg','L’image de secours doit être utilisée après une erreur de chargement');
console.log('✓ Catalogue navigateur : WebP optimized/, sous-dossiers, SVG et repli sûrs.');

// La bibliothèque doit proposer l'histoire de Noël uniquement si la page est ouverte.
const buildSeasonalContext=(iso,schedule,search='')=>{
 const localNodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
 const FrozenDate=class extends Date {constructor(...args){super(...(args.length?args:[iso]));} static now(){return new Date(iso).getTime();}};
 const c={
  Date:FrozenDate,URLSearchParams,location:{hostname:'histoires2dansmatete.fr',search},
  document:{getElementById:id=>localNodes[id],createElement:tag=>new Element(tag),querySelectorAll:()=>[]},
  fetch:async url=>({ok:true,json:async()=>url==='/data/histoires.json'?stories:{
   title:'Le mystère de Noël',subtitle:'25 épisodes',description:'Une aventure audio',
   image:'assets/images/noel-teaser.svg',hasPodcast:true,schedule
  }})
 };
 return {c,localNodes};
};
const season={teaserStart:'11-01',calendarStart:'11-01',firstEpisode:'12-01',calendarEnd:'12-26'};
for(const [day,expected] of [['2026-11-01T15:00:00Z',true],['2026-10-31T15:00:00Z',false],['2026-12-27T12:00:00Z',false]]){
 const {c,localNodes}=buildSeasonalContext(day,season);
 vm.runInNewContext(await readFile('site/assets/catalogue.js','utf8'),c,{filename:'site/assets/catalogue.js'});
 await new Promise(resolve=>setImmediate(resolve));
 const cards=localNodes['catalogue-grid'].children;
 assert.equal(cards.length,stories.length+(expected?1:0),`Entrée Noël conditionnelle au ${day}`);
 if(expected){
  assert.match(cards[0].className,/catalogue-card-christmas/);
  assert.equal(cards[0].children[0].href,'/noel/');
  assert.equal(cards[0].children[0].children.find(x=>x.tagName==='img')?.src,'/assets/images/noel-teaser.svg');
  const filters=localNodes['story-theme'].children;
  assert.ok(filters.some(option=>option.value==='Noël'));
 }
}
console.log('✓ Bibliothèque : accès à Noël uniquement pendant la saison configurée.');
