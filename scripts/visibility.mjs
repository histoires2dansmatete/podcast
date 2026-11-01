/** Visibilité éditoriale par défaut, modifiable depuis /admin/ (priorité D1). */
import {readFile} from 'node:fs/promises';
import {slugOK} from './story-content.mjs';
export function validateVisibilityConfig(config,stories){
 if(!config||typeof config!=='object'||Array.isArray(config)||!config.stories||typeof config.stories!=='object'||Array.isArray(config.stories))throw Error('Visibilité : objet stories requis');
 const known=new Set(stories.map(s=>s.slug));
 for(const [slug,value] of Object.entries(config.stories)){
  if(!slugOK(slug)||!known.has(slug))throw Error(`Visibilité : histoire inconnue : ${slug}`);
  if(typeof value!=='boolean')throw Error(`Visibilité : ${slug} doit être true ou false`);
 }
 return config;
}
export function applyDefaultVisibility(stories,config){
 validateVisibilityConfig(config,stories);
 return stories.map(s=>({...s,visibleByDefault:config.stories[s.slug]!==false}));
}
export async function configuredVisibility(stories,file='content/visibility.config.json'){
 return applyDefaultVisibility(stories,JSON.parse(await readFile(file,'utf8')));
}
