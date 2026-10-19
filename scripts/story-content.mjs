/** Sources d'histoires stables : les 13 articles WordPress et les ajouts éditoriaux. */
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';

export const slugOK = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
export const platformKeys = ['spotify','apple','deezer','amazon'];
export const localAudio = src => /^assets\/audio\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:mp3|m4a|ogg)$/i.test(src);
export const externalAudio = src => { try { const u=new URL(src);return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
export function validateAudioSrc(src) {
 if(typeof src !== 'string') throw Error('URL audio : une chaîne de caractères est attendue');
 if(src === '') return '';
 if(localAudio(src) && !src.split('/').some(x=>x==='.'||x==='..')) return src;
 if(externalAudio(src)) return src;
 throw Error(`Source MP3 non autorisée : ${src}`);
}
export function validateEpisodeConfig(item,slug){
 if(!item || typeof item !== 'object' || Array.isArray(item)) throw Error(`Configuration audio invalide : ${slug}`);
 const src=validateAudioSrc(item.src ?? '');
 const platforms=item.platforms??{};
 if(!platforms || typeof platforms !== 'object' || Array.isArray(platforms)) throw Error(`Plateformes invalides : ${slug}`);
 for(const key of Object.keys(platforms)) if(!platformKeys.includes(key)) throw Error(`Plateforme inconnue : ${key}`);
 for(const [key,url] of Object.entries(platforms)) if(typeof url !== 'string' || (url && !externalAudio(url))) throw Error(`Lien ${key} incorrect : ${slug}`);
 return {src,platforms};
}
export function validateNewStory(s){
 if(!s || !slugOK(s.slug)) throw Error('Identifiant de nouvelle histoire invalide');
 if(typeof s.title!=='string'|| !s.title.trim())throw Error(`${s.slug}: titre requis`);
 if(typeof s.description!=='string'||!s.description.trim())throw Error(`${s.slug}: résumé requis`);
 if(!Array.isArray(s.tags)||!s.tags.length||s.tags.some(t=>typeof t!=='string'||!t.trim()))throw Error(`${s.slug}: thèmes requis`);
 if(typeof s.date!=='string'||!/^(19|20)\d{2}-\d{2}-\d{2}$/.test(s.date)||Number.isNaN(Date.parse(s.date))||new Date(s.date+'T00:00:00Z').toISOString().slice(0,10)!==s.date) throw Error(`${s.slug}: date AAAA-MM-JJ valide requise`);
 if(typeof s.published!=='boolean')throw Error(`${s.slug}: published doit être true ou false`);
 if('bodyHtml' in s)throw Error(`${s.slug}: utiliser le fichier HTML séparé et non bodyHtml dans le JSON`);
 return s;
}
export async function readEditorialStories({dir=resolve('content/stories')}={}){
 const items=[];
 const files=(await readdir(dir)).filter(f=>f.endsWith('.json')).sort();
 for(const filename of files){
  const item=validateNewStory(JSON.parse(await readFile(resolve(dir,filename),'utf8')));
  if(filename!==`${item.slug}.json`)throw Error(`Nom de fichier incohérent : ${filename}`);
  const bodyHtml=await readFile(resolve(dir,`${item.slug}.html`),'utf8');
  if(item.published && bodyHtml.replace(/<[^>]*>/g,'').trim().length<100)throw Error(`${item.slug}: le texte de l'histoire publiée est trop court`);
  items.push({...item,bodyHtml});
 }
 return items;
}
export async function readAllStories({includeDrafts=false}={}){
 const originals=JSON.parse(await readFile(resolve('content/wordpress-stories.json'),'utf8'));
 if(!Array.isArray(originals))throw Error('Corpus WordPress invalide');
 const editorial=await readEditorialStories();
 const seen=new Set();
 for(const story of [...originals,...editorial]){
  if(!slugOK(story.slug)||seen.has(story.slug))throw Error(`Identifiant manquant, invalide ou déjà utilisé : ${story.slug}`);
  seen.add(story.slug);
 }
 return [...originals,...editorial.filter(s=>includeDrafts||s.published)];
}
export async function configureAudio(stories,{filename='content/audio.config.json',assetRoot='site'}={}){
 const {stat}=await import('node:fs/promises');
 const cfg=JSON.parse(await readFile(resolve(filename),'utf8'));
 if(!cfg.stories || typeof cfg.stories!=='object'||Array.isArray(cfg.stories))throw Error('Fichier audio.config.json invalide');
 const keys=new Set(stories.map(s=>s.slug));
 for(const slug of Object.keys(cfg.stories)) if(!slugOK(slug)||!keys.has(slug)){
  // Une histoire encore en brouillon est autorisée dans le catalogue MP3.
  const all=await readAllStories({includeDrafts:true});
  if(!all.some(s=>s.slug===slug))throw Error(`Audio configuré pour une histoire inconnue : ${slug}`);
 }
 for(const s of stories){
  const item=validateEpisodeConfig(cfg.stories[s.slug]??{src:'',platforms:{}},s.slug);
  if(localAudio(item.src)){
   const full=resolve(assetRoot,item.src);
   const info=await stat(full).catch(()=>null);
   if(!info?.isFile())throw Error(`${s.slug}: fichier MP3 absent : ${item.src}`);
   if(info.size>25*1024*1024)throw Error(`${s.slug}: MP3 local de plus de 25 Mio. Utiliser Cloudflare R2 avec une URL HTTPS.`);
  }
  s.audioUrl=item.src;
  s.platforms=item.platforms;
 }
 return stories;
}
