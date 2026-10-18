/** Images locales, pilotées uniquement par assets/images.config.json. */
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
const root=resolve('site');
const pathOK=(path)=>/^assets\/images\/[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|svg|avif)$/i.test(path);
export async function configuredImages(){
 const config=JSON.parse(await readFile(resolve(root,'assets/images.config.json'),'utf8'));
 if(!config.stories||!config.globals) throw Error('Configuration des images invalide');
 return config;
}
export async function imageFor(story,config){
 const wanted=config.stories[story.slug];
 if(!wanted)return story.image;
 if(!pathOK(wanted))throw Error(`Chemin d'image non autorisé pour ${story.slug}: ${wanted}`);
 const full=resolve(root,wanted);
 if(!full.startsWith(root+sep))throw Error('Chemin en dehors du site');
 try{if((await stat(full)).isFile())return wanted;}catch(e){if(e.code!=='ENOENT')throw e;}
 return `assets/stories/${story.slug}.svg`;
}

export async function globalImageFor(key,config){
 const fallback='assets/logo.webp';
 const wanted=config.globals?.[key]||fallback;
 if(wanted===fallback)return fallback;
 if(!pathOK(wanted))throw Error(`Chemin d'image globale non autorisé : ${key}`);
 try{if((await stat(resolve(root,wanted))).isFile())return wanted;}catch(e){if(e.code!=='ENOENT')throw e;}
 return fallback;
}
