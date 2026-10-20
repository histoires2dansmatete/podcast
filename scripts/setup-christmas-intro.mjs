/** Ajoute uniquement l'objet introduction ; conserve les 25 parties et les autres réglages. */
import {readFile,writeFile} from 'node:fs/promises';
import {withChristmasIntroduction,validateChristmasConfig} from './christmas.mjs';
const path='content/noel.config.json';
const original=JSON.parse(await readFile(path,'utf8'));
const updated=withChristmasIntroduction(original);
validateChristmasConfig(updated);
if(updated===original){
 console.log('✓ Introduction déjà configurée : aucune modification du fichier.');
}else{
 await writeFile(path,JSON.stringify(updated,null,2)+'\n');
 console.log('✓ Bloc introduction ajouté dans content/noel.config.json ; les 25 épisodes ont été conservés.');
}
