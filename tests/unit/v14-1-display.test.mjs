import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {adminHTML} from '../../functions/_lib/admin-page.js';

test('Bibliothèque : aucune suspension du rendu au défilement et vignettes stabilisées',async()=>{
 const css=await readFile('site/assets/style.css','utf8');
 const js=await readFile('site/assets/catalogue.js','utf8');
 assert.match(css,/\.catalogue-grid \.catalogue-card\{content-visibility:visible;contain-intrinsic-size:none/);
 assert.match(css,/\.catalogue-grid \.catalogue-card:hover\{transform:none/);
 assert.match(css,/\.catalogue-grid \.catalogue-card \.story-image img\{position:absolute;inset:0/);
 assert.match(js,/img.loading=index<6\?'eager':'lazy'/);
 assert.match(js,/grid.replaceChildren\(\.\.\.rendered.map/);
 assert.doesNotMatch(js,/requestAnimationFrame|IntersectionObserver/);
});

test('Admin : l’ordre éditorial est publication, audio, création puis statistiques',()=>{
 const html=adminHTML();
 const ids=['admin-publication','admin-audio','admin-creation','admin-statistics'];
 const positions=ids.map(id=>html.indexOf(`id="${id}"`));
 assert.ok(positions.every(p=>p>0));
 assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
 for(const id of ids)assert.match(html,new RegExp(`href="#${id}"`));
 for(const required of ['days','views','sessions','plays','clicks','timeline','admin-story-list','refresh-stories','audio-story','admin-audio-form','audio-reset','new-title','new-body','admin-new-story-form','note']) {
  assert.equal((html.match(new RegExp(`id="${required}"`,'g'))||[]).length,1,required);
 }
 assert.match(html,/<details class="admin-story-details">/);
 assert.match(html,/<details class="admin-metrics-details">/);
 assert.match(html,/<fieldset class="admin-platform-fieldset">/);
 assert.match(html,/<form class="admin-logout" action="\/api\/admin\/logout" method="POST">/);
});

test('Admin : mode local conserve les mêmes actions et affiche un contexte distinct',()=>{
 const html=adminHTML({local:true});
 assert.match(html,/Mode local · accès protégé/);
 assert.match(html,/admin-section-nav/);
 assert.match(html,/id="admin-audio-form"/);
});
