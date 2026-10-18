/** Aide à vérifier que les visuels (non inclus dans l'export XML) sont commités. */
import {readFile,stat} from 'node:fs/promises';
const config=JSON.parse(await readFile('site/assets/images.config.json','utf8'));
const rows=[...Object.entries(config.globals).filter(([,value])=>value.startsWith('assets/images/')),...Object.entries(config.stories)];
let absent=0;
const unique=new Set();
for(const [name,path] of rows){
 if(unique.has(path))continue;
 unique.add(path);
 if(!(await stat(`site/${path}`).catch(()=>null))?.isFile()){
  console.warn(`⚠ Image originale absente : ${path} (utilisée pour ${name}).`);
  absent++;
 }
}
console.log(`Illustrations originales : ${unique.size-absent}/${unique.size} présentes. Les fichiers manquants seront remplacés par une couverture de secours.`);
if(absent && process.argv.includes('--strict'))process.exitCode=1;
