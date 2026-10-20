import {christmasAccess,christmasDenied,christmasHeaders} from './_lib/christmas.js';
import {disabledStories,publicStories,removeXmlItems,isStoryPath,statesHeaders} from './_lib/story-state.js';
import {loadAudioOverrides,mergeAudio} from './_lib/audio-overrides.js';
const unavailable=()=>new Response('Bibliothèque temporairement indisponible : base de données non configurée.',{status:503,headers:{...statesHeaders,'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex'}});
/** Cloudflare Pages : toute publication est filtrée côté serveur, même si on connaît l'URL. */
export async function onRequest(context){
 const path=new URL(context.request.url).pathname;
 const seasonalAccess=christmasAccess(path);
 if(seasonalAccess!==null){
  if(!seasonalAccess)return christmasDenied();
  return christmasHeaders(await context.next());
 }
 const storySlug=isStoryPath(path);
 const gated=storySlug || ['/data/histoires.json','/sitemap.xml','/histoires.xml'].includes(path);
 if(!gated)return context.next();
 let disabled;
 try {disabled=await disabledStories(context.env);}catch(e){console.error('Publication D1 :',e.message);return unavailable();}
 if(storySlug && disabled.has(storySlug))return new Response('Histoire non publiée.',{status:404,headers:{...statesHeaders,'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex,nofollow'}});
 if(storySlug){const res=await context.next();const headers=new Headers(res.headers);headers.set('Cache-Control','no-store');return new Response(res.body,{status:res.status,headers});}
 // Lecture de l'asset brut via ASSETS (évite la route publique, permet la modification runtime).
 const resource=await context.env.ASSETS.fetch(context.request);
 if(!resource.ok)return resource;
 if(path==='/data/histoires.json'){
   const all=await resource.json();
   let active=all;
   try { active=mergeAudio(all,await loadAudioOverrides(context.env)); }catch(error){
     // Anciennes bases non migrées : le catalogue et le site existants restent utilisables.
     console.warn('Audio D1 :',error.message);
   }
   return Response.json(publicStories(active,disabled),{headers:statesHeaders});
 }
 const xml=await resource.text();
 return new Response(removeXmlItems(xml,disabled,path==='/sitemap.xml'?'url':'item'),{headers:{...statesHeaders,'Content-Type':path==='/sitemap.xml'?'application/xml; charset=utf-8':'application/rss+xml; charset=utf-8'}});
}
