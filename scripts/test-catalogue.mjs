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
