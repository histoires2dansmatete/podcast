/** Illustrations locales insérées entre les paragraphes, sans altérer le corpus. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {optimizedImageFor} from './images.mjs';
import {isLocalImagePath} from './local-image-path.mjs';

const CONFIG = 'content/inline-images.config.json';

export async function configuredInlineImages(){
  const config=JSON.parse(await readFile(resolve(CONFIG),'utf8'));
  if(!config.stories || typeof config.stories!=='object' || Array.isArray(config.stories))
    throw new Error('Configuration des images dans les récits invalide');
  return config.stories;
}

export function validateInlineImage(image){
  if(!image || !Number.isSafeInteger(image.afterParagraph) || image.afterParagraph<1)
    throw new Error('afterParagraph doit être un entier positif');
  if(typeof image.src!=='string' || !image.src.startsWith('assets/images/') || !isLocalImagePath(image.src))
    throw new Error('Image du récit : chemin local assets/images/ obligatoire');
  if(typeof image.alt!=='string' || !image.alt.trim())
    throw new Error('Image du récit : texte alternatif obligatoire');
}

/** La version WebP de scripts/optimize-images.mjs est retenue en priorité. */
export async function inlineImagesFor(slug,config){
  const items=config[slug]||[];
  if(!Array.isArray(items))throw new Error(`${slug}: images du récit invalides`);
  const result=[];
  for(const item of items){
    validateInlineImage(item);
    const src=await optimizedImageFor(item.src);
    if(src)result.push({afterParagraph:item.afterParagraph,src,alt:item.alt});
    else console.warn(`ℹ ${slug} : image dans le récit absente (${item.src}). Copiez-la dans site/${item.src} pour l'afficher.`);
  }
  return result;
}
