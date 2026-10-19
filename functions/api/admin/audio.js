import {authorize,noStore,sameOrigin} from '../../_lib/access.js';
import {loadAudioOverrides,mergeAudio,validateAudioUpdate} from '../../_lib/audio-overrides.js';
const json=(body,status=200)=>Response.json(body,{status,headers:noStore});
async function baseStories(context){
 const res=await context.env.ASSETS.fetch(new URL('/data/histoires.json',context.request.url));
 if(!res.ok)throw Error('Catalogue inaccessible');
 const items=await res.json();if(!Array.isArray(items))throw Error('Catalogue invalide');
 return items;
}
export async function onRequestGet(context){
 const rejected=await authorize(context);if(rejected)return rejected;
 try{
  const [stories,overrides]=await Promise.all([baseStories(context),loadAudioOverrides(context.env)]);
  return json({stories:mergeAudio(stories,overrides).map(s=>({slug:s.slug,title:s.title,src:s.audioUrl||'',platforms:s.platforms||{},custom:overrides.has(s.slug)}))});
 }catch(e){console.error('Admin audio lecture:',e.message);return json({error:'Migration D1 manquante : appliquez db/schema.sql'},503)}
}
export async function onRequestPost(context){
 const rejected=await authorize(context);if(rejected)return rejected;
 const req=context.request;
 if(!sameOrigin(req))return json({error:'Origine non autorisée'},403);
 if(req.headers.get('X-Requested-With')!=='PodcastAdmin'||req.headers.get('Content-Type')?.split(';')[0]!=='application/json')return json({error:'Type de requête invalide'},415);
 if(Number(req.headers.get('content-length')||0)>9000)return json({error:'Requête trop grande'},413);
 let input;try{const text=await req.text();if(text.length>9000)return json({error:'Requête trop grande'},413);input=validateAudioUpdate(JSON.parse(text));}catch(e){return json({error:e.message||'Données invalides'},400)}
 try{
  const stories=await baseStories(context);
  if(!stories.some(s=>s.slug===input.slug))return json({error:'Histoire inconnue'},404);
  if(!context.env.ANALYTICS_DB)return json({error:'Base D1 non configurée'},503);
  await context.env.ANALYTICS_DB.prepare('INSERT INTO story_audio_overrides(slug,audio_url,platforms_json,updated_at) VALUES(?,?,?,datetime(\'now\')) ON CONFLICT(slug) DO UPDATE SET audio_url=excluded.audio_url,platforms_json=excluded.platforms_json,updated_at=excluded.updated_at').bind(input.slug,input.src,JSON.stringify(input.platforms)).run();
  return json({ok:true,slug:input.slug});
 }catch(e){console.error('Admin audio écriture:',e.message);return json({error:'Enregistrement D1 impossible : migration à vérifier'},503)}
}
export async function onRequestDelete(context){
 const rejected=await authorize(context);if(rejected)return rejected;
 const req=context.request;if(!sameOrigin(req))return json({error:'Origine non autorisée'},403);
 if(req.headers.get('X-Requested-With')!=='PodcastAdmin'||req.headers.get('Content-Type')?.split(';')[0]!=='application/json')return json({error:'Type de requête invalide'},415);
 let input;try{const text=await req.text();if(text.length>500)return json({error:'Requête trop grande'},413);input=JSON.parse(text)}catch{return json({error:'Requête invalide'},400)}
 if(!input||typeof input.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug))return json({error:'Identifiant invalide'},400);
 try{
  if(!context.env.ANALYTICS_DB)return json({error:'Base D1 non configurée'},503);
  await context.env.ANALYTICS_DB.prepare('DELETE FROM story_audio_overrides WHERE slug=?').bind(input.slug).run();
  return json({ok:true});
 }catch{return json({error:'Suppression D1 impossible'},503)}
}
