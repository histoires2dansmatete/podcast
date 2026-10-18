import {authorize,noStore} from '../../_lib/access.js';
import {SLUG_RE,disabledStories} from '../../_lib/story-state.js';
const respond=(data,status=200)=>Response.json(data,{status,headers:noStore});
async function allSlugs(context){
 const res=await context.env.ASSETS.fetch(new URL('/data/histoires.json',context.request.url));
 if(!res.ok)throw Error('Catalogue inaccessible');
 const data=await res.json();
 return Array.isArray(data)?data.map(s=>({slug:s.slug,title:s.title,subtitle:s.subtitle||''})):[];
}
export async function onRequestGet(context){
 const denied=await authorize(context);if(denied)return denied;
 try{
  const [stories,disabled]=await Promise.all([allSlugs(context),disabledStories(context.env)]);
  return respond({stories:stories.map(s=>({...s,enabled:!disabled.has(s.slug)}))});
 }catch(e){console.error(e);return respond({error:'Base D1 ou catalogue indisponible.'},503);}
}
export async function onRequestPost(context){
 const denied=await authorize(context);if(denied)return denied;
 const r=context.request,origin=new URL(r.url).origin;
 if(r.headers.get('Origin')!==origin || r.headers.get('Sec-Fetch-Site')==='cross-site')return respond({error:'Origine refusée'},403);
 if(r.headers.get('Content-Type')?.split(';')[0]!=='application/json'||r.headers.get('X-Requested-With')!=='PodcastAdmin')return respond({error:'Requête invalide'},415);
 if(Number(r.headers.get('content-length')||0)>512)return respond({error:'Requête trop longue'},413);
 let body;try{body=await r.json()}catch{return respond({error:'JSON invalide'},400)}
 if(!body||typeof body.slug!=='string'||!SLUG_RE.test(body.slug)||typeof body.enabled!=='boolean')return respond({error:'Identifiant ou état invalide'},400);
 try{
  const stories=await allSlugs(context);
  if(!stories.some(s=>s.slug===body.slug))return respond({error:'Histoire inconnue'},404);
  if(!context.env.ANALYTICS_DB)return respond({error:'D1 non configurée'},503);
  await context.env.ANALYTICS_DB.prepare('INSERT INTO story_states(slug,enabled,updated_at) VALUES(?,?,datetime(\'now\')) ON CONFLICT(slug) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at').bind(body.slug,body.enabled?1:0).run();
  return respond({ok:true,slug:body.slug,enabled:body.enabled});
 }catch(e){console.error('Admin publication :',e.message);return respond({error:'Mise à jour impossible dans D1'},503);}
}
