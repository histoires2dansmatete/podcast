/** Pure shared validation for private, database-backed audio links (no uploads). */
export const audioProviders=['spotify','apple','deezer','amazon'];
export function safeExternalURL(value){
 if(value==='')return '';
 if(typeof value!=='string'||value.length>2048||/[\u0000-\u001f\u007f<>"'\\]/.test(value))throw Error('URL HTTPS invalide');
 let u;try{u=new URL(value)}catch{throw Error('URL HTTPS invalide')}
 if(u.protocol!=='https:'||!u.hostname||u.username||u.password)throw Error('Une URL HTTPS publique est requise');
 return u.href;
}
export function validateAudioUpdate(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!Object.keys(data).every(k=>['slug','src','platforms'].includes(k)))throw Error('Données audio invalides');
 if(typeof data.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))throw Error('Identifiant invalide');
 if(typeof data.src!=='string')throw Error('Lien MP3 requis (vide si à venir)');
 if(!data.platforms||typeof data.platforms!=='object'||Array.isArray(data.platforms))throw Error('Plateformes invalides');
 if(Object.keys(data.platforms).some(k=>!audioProviders.includes(k)))throw Error('Plateforme inconnue');
 const platforms={};for(const k of audioProviders){const value=data.platforms[k]??'';if(typeof value!=='string')throw Error('Lien plateforme invalide');platforms[k]=safeExternalURL(value);}
 // Depuis l'admin on ne permet que les fichiers déjà hébergés en HTTPS (R2 ou similaire).
 // Les fichiers locaux sont ajoutés via Git et audio.config.json.
 return {slug:data.slug,src:safeExternalURL(data.src),platforms};
}
export async function loadAudioOverrides(env){
 const db=env?.ANALYTICS_DB;if(!db)throw Error('Base D1 manquante');
 const rows=await db.prepare('SELECT slug,audio_url,platforms_json FROM story_audio_overrides').all();
 const map=new Map();for(const row of rows.results||[]){
  try{map.set(row.slug,{src:row.audio_url,platforms:JSON.parse(row.platforms_json)})}catch{ /* invalid stored JSON ignored */ }
 }
 return map;
}
export function mergeAudio(stories,map){return stories.map(story=>{
 const override=map.get(story.slug);if(!override)return story;
 try{const v=validateAudioUpdate({slug:story.slug,...override});return {...story,audioUrl:v.src,platforms:v.platforms};}catch{return story;}
});}
