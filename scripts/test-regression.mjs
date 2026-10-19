/** Empreintes de la charte graphique et des pages structurantes.
 * Les URLs d'illustrations issues du catalogue ne sont pas figées : leurs
 * ressources et chemins font l'objet de contrôles séparés.
 * `npm run test:regression:update` uniquement après examen d'un vrai changement
 * volontaire de HTML/CSS.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {normalizeRegressionContent} from './regression-contract.mjs';

const paths=['site/assets/style.css','site/index.html','site/histoires.html','site/ecouter.html','site/qui-suis-je.html','site/confidentialite.html'];
const hash=s=>createHash('sha256').update(s).digest('hex');
const snap={};
for(const path of paths){
  const content=await readFile(path,'utf8');
  snap[path]=hash(normalizeRegressionContent(path,content));
}
const file='tests/snapshots/site-contract.json';
if(process.argv.includes('--update')){
  await writeFile(file,JSON.stringify({note:'Empreintes de structure HTML/CSS, indépendantes des illustrations configurées. Toute mise à jour doit être relue.',files:snap},null,2)+'\n');
  console.log('✓ Empreintes de régression mises à jour (à relire avant git commit).');
}else{
  const baseline=JSON.parse(await readFile(file,'utf8')).files;
  for(const path of paths){
    assert.equal(snap[path],baseline[path],`${path} : structure HTML/CSS modifiée (hors images configurées et SEO). Inspectez git diff -- ${path} avant d'utiliser npm run test:regression:update.`);
  }
  console.log('✓ Non-régression : CSS et structure de 5 pages inchangés (images configurables ignorées).');
}
