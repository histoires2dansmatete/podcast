/** Régression : mise en page stable après plusieurs constructions successives. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applySocialLayout} from './layout.mjs';
const template=`<!doctype html><html><body>
<header><nav id="primary-nav"><a href="/">Accueil</a></nav></header>
<footer class="site-footer"><div class="container footer-top">Tout le site</div><div class="container footer-bottom">© 2026</div></footer>
</body></html>`;
const count=(s,c)=>(s.match(new RegExp(`class="[^"]*\\b${c}\\b[^"]*"`,'g'))||[]).length;
const single=applySocialLayout(template,'');
assert.equal(count(single,'footer-social-area'),1);
assert.equal(count(single,'header-socials'),1);
assert.equal(count(single,'footer-copyright'),1,'Le copyright doit former un seul paragraphe');
assert.equal(applySocialLayout(single,''),single,'Le layout doit être idempotent');
const repeated=single.replace('</div><div class="container footer-bottom">','</div>'+single.match(/<div class="container footer-social-area">[\s\S]*?<\/nav><\/div>/)[0]+'<div class="container footer-bottom">');
assert.equal(count(repeated,'footer-social-area'),2,'Fixture de duplication');
assert.equal(applySocialLayout(repeated,''),single,'Le layout doit réparer les doublons V7');
for(const page of ['index.html','histoires.html','qui-suis-je.html','ecouter.html','confidentialite.html']){
 const html=await readFile('site/'+page,'utf8');
 assert.equal(count(html,'footer-copyright'),1,`Copyright mal structuré : ${page}`);
 assert.match(html,/<div class="container footer-bottom"[^>]*>\s*<p class="footer-copyright">/);
}
const css=await readFile('site/assets/style.css','utf8');
assert.match(css,/\.footer-bottom\{display:block;text-align:center\}/);

assert.match(css,/\.listen-reading-art img\{[^}]*height:auto;aspect-ratio:auto;object-fit:contain/);
assert.match(css,/\.about-visual img\{[^}]*height:auto;max-height:[^}]*object-fit:contain/);
const icon=await readFile('site/assets/icons/apple-podcasts.svg','utf8');
assert.match(icon,/<circle cx="24"/,'Icône Apple Podcasts non remplacée');
console.log('✓ Layout : footer unique/idempotent, images portrait non recadrées, icône Apple Podcasts.');
