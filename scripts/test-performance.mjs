/** Contrôles de performance statiques, hors métriques réseau réelles. */
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {optimizedImageFor} from './images.mjs';
const html=await readFile('dist/index.html','utf8');
assert.match(html,/decoding="async"/,'Les images ont decoding=async dans le rendu final');
assert.match(html,/loading="lazy"/,'Les images secondaires sont chargées progressivement');
const css=await stat('dist/assets/style.css');
assert.ok(css.size<60000,'Le CSS principal doit rester raisonnable');
const cover=await optimizedImageFor('assets/images/about_me.png');
assert.ok(cover===null || /^assets\/images\//.test(cover), 'Le chemin renvoyé reste à l’intérieur des images.');
const contents=await readFile('scripts/optimize-images.py','utf8');
assert.match(contents,/ImageOps\.exif_transpose/,'L’orientation EXIF est prise en compte');
assert.match(contents,/source_root\.rglob/,'Toutes les sous-arborescences sont traitées');
console.log(`✓ Performance : chargement différé des images secondaires, CSS ${Math.round(css.size/1024)} Ko, optimiseurs disponibles.`);
