/** Développement UNIQUEMENT : simulateur admin, séparé des Pages Functions et de Cloudflare Access.
 * Aucune variable LOCAL_ADMIN ne peut désactiver Access en production.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {adminHTML} from '../functions/_lib/admin-page.js';
import {publicStories,isStoryPath,removeXmlItems} from '../functions/_lib/story-state.js';
const statesFile=resolve(process.env.LOCAL_STATE_FILE||'.local/story-states.json');
const readStates=async()=>{try{return JSON.parse(await readFile(statesFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}};
async function writeStates(obj){await mkdir(resolve('.local'),{recursive:true});await writeFile(statesFile,JSON.stringify(obj,null,2)+'\n');}
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const plain=(res,message,status=200)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'});res.end(message);};
const allowed=async()=>JSON.parse(await readFile('site/data/histoires.json','utf8'));
const denied=states=>new Set(Object.entries(states).filter(([slug,enabled])=>enabled===false).map(([slug])=>slug));
function stats(days){
 const now=new Date(),from=new Date(now.getTime()-(days-1)*86400000).toISOString().slice(0,10);
 return {days,from,to:now.toISOString().slice(0,10),overview:{pageviews:0,sessions:0,audio_plays:0,platform_clicks:0},timeline:[],pages:[],referrers:[],countries:[],devices:[],browsers:[],interactions:[],note:'MODE LOCAL — aucun suivi de visites réelles. En production, les mesures consenties sont enregistrées dans Cloudflare D1.'};
}
export async function handleLocalRoute(req,res,path,{preview=false,port=5173,root}){
 // Contrôle Host : rejette les requêtes forgées, notamment via DNS rebinding.
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){
  plain(res,'Host non autorisé',403);return true;
 }
 const api=path.startsWith('/api/admin/'),admin=path==='/admin'||path==='/admin/';
 if(admin){
  if(req.method!=='GET'){plain(res,'Méthode non autorisée',405);return true;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
  res.end(adminHTML({local:true}));return true;
 }
 if(path==='/api/admin/stats'){
  if(req.method!=='GET'){plain(res,'Méthode non autorisée',405);return true;}
  const n=Number(new URL(req.url,'http://127.0.0.1').searchParams.get('days'));
  json(res,stats([7,30,90].includes(n)?n:30));return true;
 }
 if(path==='/api/admin/stories'){
  if(req.method==='GET'){
   const [stories,states]=await Promise.all([allowed(),readStates()]);
   json(res,{stories:stories.map(s=>({slug:s.slug,title:s.title,subtitle:s.subtitle||'',enabled:states[s.slug]!==false}))});return true;
  }
  if(req.method==='POST'){
   const origin=req.headers.origin;
   if(!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin)||req.headers['x-requested-with']!=='PodcastAdmin'){
    json(res,{error:'Origine non autorisée'},403);return true;
   }
   if(req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,{error:'Type invalide'},415);return true;}
   let content='';for await (const chunk of req){content+=chunk;if(content.length>512){json(res,{error:'Corps trop long'},413);return true;}}
   let input;try{input=JSON.parse(content)}catch{json(res,{error:'JSON invalide'},400);return true;}
   const stories=await allowed();
   if(typeof input?.enabled!=='boolean'||typeof input?.slug!=='string'||!stories.some(s=>s.slug===input.slug)){
    json(res,{error:'Histoire ou état invalide'},400);return true;
   }
   const states=await readStates();states[input.slug]=input.enabled;await writeStates(states);
   json(res,{ok:true,slug:input.slug,enabled:input.enabled});return true;
  }
  plain(res,'Méthode non autorisée',405);return true;
 }
 const slug=isStoryPath(path);
 const isData=path==='/data/histoires.json';const isXml=path==='/sitemap.xml'||path==='/histoires.xml';
 if(!slug&&!isData&&!isXml)return false;
 if(!['GET','HEAD'].includes(req.method)){plain(res,'Méthode non autorisée',405);return true;}
 const disabled=denied(await readStates());
 if(slug&&disabled.has(slug)){plain(res,'Histoire non publiée',404);return true;}
 if(isData){const stories=await allowed();json(res,publicStories(stories,disabled));return true;}
 if(isXml){const filename=resolve(root,path.slice(1));const xml=await readFile(filename,'utf8');
  res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'});
  res.end(removeXmlItems(xml,disabled,isXml&&path==='/sitemap.xml'?'url':'item'));return true;}
 return false;
}
