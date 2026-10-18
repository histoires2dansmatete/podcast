/** Serveur local sur 127.0.0.1, avec authentification identique aux Functions. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {adminHTML} from '../functions/_lib/admin-page.js';
import {authorize,loginHTML,htmlHeaders,noStore} from '../functions/_lib/access.js';
import {login,logout} from '../functions/_lib/login.js';
import {publicStories,isStoryPath,removeXmlItems} from '../functions/_lib/story-state.js';
const statesFile=resolve(process.env.LOCAL_STATE_FILE||'.local/story-states.json');
const readStates=async()=>{try{return JSON.parse(await readFile(statesFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}};
async function writeStates(obj){await mkdir(dirname(statesFile),{recursive:true});await writeFile(statesFile,JSON.stringify(obj,null,2)+'\n');}
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...noStore});res.end(JSON.stringify(data));};
const plain=(res,message,status=200)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8',...noStore});res.end(message);};
const allStories=async()=>JSON.parse(await readFile('site/data/histoires.json','utf8'));
const denied=states=>new Set(Object.entries(states).filter(([,enabled])=>enabled===false).map(([slug])=>slug));
async function respond(res,response){res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}
async function toWebRequest(req,port){
 // Le Host a été vérifié par handleLocalRoute : on le conserve pour que
 // request.url et l'en-tête Origin du navigateur restent identiques.
 // En V7, forcer 127.0.0.1 rejetait la connexion depuis localhost.
 const url='http://'+req.headers.host+req.url;
 const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
 let body;
 if(req.method==='POST'){const chunks=[];let count=0;for await(const chunk of req){count+=chunk.length;if(count>2048)throw Error('Corps trop volumineux');chunks.push(chunk);}body=Buffer.concat(chunks);}
 return new Request(url,{method:req.method,headers,body});
}
function stats(days){const now=new Date();return {days,from:new Date(now.getTime()-(days-1)*86400000).toISOString().slice(0,10),to:now.toISOString().slice(0,10),overview:{pageviews:0,sessions:0,audio_plays:0,platform_clicks:0},timeline:[],pages:[],referrers:[],countries:[],devices:[],browsers:[],interactions:[],note:'MODE LOCAL — aucun suivi de visites réelles. Les données Cloudflare ne sont pas disponibles ici.'};}
export async function handleLocalRoute(req,res,path,{preview=false,port=5173,root}){
 if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){plain(res,'Host non autorisé',403);return true;}
 const privatePath=path==='/admin'||path==='/admin/'||path.startsWith('/api/admin/');
 if(privatePath){
  let request;try{request=await toWebRequest(req,port);}catch{plain(res,'Requête trop volumineuse',413);return true;}
  const context={request,env:process.env};
  if(path==='/api/admin/login'){
   if(req.method!=='POST'){plain(res,'Méthode non autorisée',405);return true;}
   await respond(res,await login(context,{local:true}));return true;
  }
  const rejected=await authorize(context);
  if(path==='/admin'||path==='/admin/'){
   if(req.method!=='GET'){plain(res,'Méthode non autorisée',405);return true;}
   if(rejected?.status===503){await respond(res,rejected);return true;}
   const html=rejected?loginHTML({error:new URL(request.url).searchParams.has('erreur'),local:true}):adminHTML({local:true});
   await respond(res,new Response(html,{headers:htmlHeaders()}));return true;
  }
  if(rejected){await respond(res,rejected);return true;}
  if(path==='/api/admin/logout'){
   if(req.method!=='POST'){plain(res,'Méthode non autorisée',405);return true;}
   await respond(res,await logout(context));return true;
  }
  if(path==='/api/admin/stats'){
   if(req.method!=='GET'){plain(res,'Méthode non autorisée',405);return true;}
   const n=Number(new URL(request.url).searchParams.get('days'));
   json(res,stats([7,30,90].includes(n)?n:30));return true;
  }
  if(path==='/api/admin/stories'){
   if(req.method==='GET'){
    const [stories,states]=await Promise.all([allStories(),readStates()]);
    json(res,{stories:stories.map(s=>({slug:s.slug,title:s.title,subtitle:s.subtitle||'',enabled:states[s.slug]!==false}))});return true;
   }
   if(req.method==='POST'){
    if(!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)||req.headers['x-requested-with']!=='PodcastAdmin') {json(res,{error:'Origine non autorisée'},403);return true;}
    if(req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,{error:'Type invalide'},415);return true;}
    let input;try{input=JSON.parse(await request.text())}catch{json(res,{error:'JSON invalide'},400);return true;}
    const stories=await allStories();
    if(typeof input?.enabled!=='boolean'||typeof input?.slug!=='string'||!stories.some(s=>s.slug===input.slug)){json(res,{error:'Histoire ou état invalide'},400);return true;}
    const states=await readStates();states[input.slug]=input.enabled;await writeStates(states);
    json(res,{ok:true,slug:input.slug,enabled:input.enabled});return true;
   }
   plain(res,'Méthode non autorisée',405);return true;
  }
  plain(res,'Page introuvable',404);return true;
 }
 const slug=isStoryPath(path),isData=path==='/data/histoires.json',isXml=['/sitemap.xml','/histoires.xml'].includes(path);
 if(!slug&&!isData&&!isXml)return false;
 if(!['GET','HEAD'].includes(req.method)){plain(res,'Méthode non autorisée',405);return true;}
 const disabled=denied(await readStates());
 if(slug&&disabled.has(slug)){plain(res,'Histoire non publiée',404);return true;}
 if(isData){json(res,publicStories(await allStories(),disabled));return true;}
 if(isXml){const xml=await readFile(resolve(root,path.slice(1)),'utf8');res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'});res.end(removeXmlItems(xml,disabled,path==='/sitemap.xml'?'url':'item'));return true;}
 return false;
}
