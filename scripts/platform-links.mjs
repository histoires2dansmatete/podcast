/** Liens des plateformes de l'émission (indépendants des liens par épisode). */
import {readFile} from 'node:fs/promises';
import {escapeHtml} from './stories.mjs';
export const providers=['spotify','youtube'];
export function validateShowPlatforms(config){
 if(!config||typeof config!=='object'||Array.isArray(config)||!config.platforms||typeof config.platforms!=='object'||Array.isArray(config.platforms))throw Error('Plateformes de l’émission : objet platforms requis');
 for(const key of Object.keys(config.platforms))if(!providers.includes(key))throw Error(`Plateforme inconnue : ${key}`);
 for(const key of providers){
  const value=config.platforms[key]??'';
  if(typeof value!=='string'||value.length>2048||/[\u0000-\u001f\u007f<>"'\\]/.test(value))throw Error(`Lien de l’émission invalide : ${key}`);
  if(value){let url;try{url=new URL(value);}catch{throw Error(`URL invalide : ${key}`)}
   if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw Error(`URL HTTPS obligatoire : ${key}`);
  }
 }
 return config;
}
export function applyShowPlatforms(html,config){
 validateShowPlatforms(config);
 let result=html;
 for(const provider of providers){
  const url=config.platforms[provider]||'';
  // Remplacement ciblé de la carte de la plateforme : conserve son icône et son texte.
  const pattern=new RegExp(`<a\\b[^>]*\\bdata-platform="${provider}"[^>]*>[\\s\\S]*?<\\/a>`,'g');
  result=result.replace(pattern,card=>{
    let updated=card.replace(/^<a\b[^>]*>/,start=>{
      let clean=start.replace(/\s(?:href|target|rel|aria-disabled)="[^"]*"/g,'');
      return clean.replace(/>$/,url?` href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">`:' aria-disabled="true">');
    });
    // La plateforme n'est annoncée active que si son lien a été déclaré.
    updated=updated.replace(/(<span class="platform-status">)[\s\S]*?(<\/span>)/,`$1${url?'Écouter ↗':'À venir'}$2`);
    return updated;
  });
 }
 return result;
}
export async function configuredShowPlatforms(file='content/platforms.config.json'){
 return validateShowPlatforms(JSON.parse(await readFile(file,'utf8')));
}
