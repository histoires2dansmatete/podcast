/** Migration non destructive des plateformes : Spotify + YouTube.
 * Ne réécrit que les cartes concernées et les clés de configuration concernées.
 * Les textes éditoriaux et tous les MP3 sont préservés.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const retired=new Set(['apple','deezer','amazon']);
const readOptional=async file=>{try{return await readFile(file,'utf8')}catch(error){if(error.code==='ENOENT')return null;throw error;}};
function keepActive(values){
 const cleaned={};
 for(const [key,value] of Object.entries(values))if(!retired.has(key))cleaned[key]=value;
 return cleaned;
}
const youtubeCards={
 'index.html':'<a class="platform-card" data-platform="youtube" aria-disabled="true"><span aria-hidden="true" class="platform-icon youtube"><img src="assets/icons/youtube.svg" alt="" class="brand-icon" loading="lazy"></span><span class="platform-copy"><strong>YouTube</strong><small>Vidéos &amp; podcasts</small></span><span class="platform-status">À venir</span></a>',
 'ecouter.html':'<a class="listen-platform" data-platform="youtube" aria-disabled="true"><span class="listen-platform-symbol listen-youtube" aria-hidden="true"><img src="assets/icons/youtube.svg" alt="" class="brand-icon" loading="lazy"></span><span class="listen-platform-body"><strong>YouTube</strong><small>Écoutez les épisodes depuis notre chaîne YouTube.</small></span><span class="platform-status">À venir</span></a>'
};
export function replaceRetiredCards(html,page){
 if(!youtubeCards[page])return html;
 let changed=html;
 const card=/<a\b[^>]*\bdata-platform="(apple|deezer|amazon)"[^>]*>[\s\S]*?<\/a>\s*/g;
 let replaced=false;
 const already=/<a\b[^>]*\bdata-platform="youtube"/.test(changed);
 changed=changed.replace(card,(_full,provider)=>{
  if(!already&&!replaced){replaced=true;return youtubeCards[page]+'\n';}
  return '';
 });
 if(!already&&!replaced){
  // Cas d'une page n'ayant conservé que Spotify.
  changed=changed.replace(/(<a\b[^>]*\bdata-platform="spotify"[^>]*>[\s\S]*?<\/a>)/,`$1\n${youtubeCards[page]}`);
 }
 return changed;
}
export async function ensureYoutubePlatforms(root='.'){
 const edits=[];
 const maybeWrite=async(file,old,next)=>{if(old!==next){await writeFile(join(root,file),next);edits.push(file);}};
 for(const page of ['index.html','ecouter.html']){
  const file=`site/${page}`;
  const before=await readOptional(join(root,file));
  if(before!==null)await maybeWrite(file,before,replaceRetiredCards(before,page));
 }
 const showPath='content/platforms.config.json';
 const showText=await readOptional(join(root,showPath));
 if(showText!==null){
  const config=JSON.parse(showText);
  if(config.platforms&&typeof config.platforms==='object'&&!Array.isArray(config.platforms)){
   const next={...keepActive(config.platforms)};
   // Ordre cohérent avec la présentation publique.
   config.platforms={spotify:next.spotify??'',youtube:next.youtube??'',...Object.fromEntries(Object.entries(next).filter(([k])=>!['spotify','youtube'].includes(k)))};
   if(JSON.stringify(config.platforms)!==JSON.stringify(JSON.parse(showText).platforms))
    await maybeWrite(showPath,showText,JSON.stringify(config,null,2)+'\n');
  }
 }
 const audioPath='content/audio.config.json';
 const audioText=await readOptional(join(root,audioPath));
 if(audioText!==null){
  const audio=JSON.parse(audioText);let modified=false;
  for(const story of Object.values(audio.stories||{})){
   if(!story||typeof story!=='object'||Array.isArray(story)||!story.platforms||typeof story.platforms!=='object'||Array.isArray(story.platforms))continue;
   const cleaned=keepActive(story.platforms);
   if(Object.keys(cleaned).length!==Object.keys(story.platforms).length){story.platforms=cleaned;modified=true;}
  }
  if(modified)await maybeWrite(audioPath,audioText,JSON.stringify(audio,null,2)+'\n');
 }
 return edits;
}
