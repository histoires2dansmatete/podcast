/** Tests d'intégration : site public Cloudflare et véritable login HTTP local. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {request as httpRequest} from 'node:http';
import {onRequest} from '../functions/_middleware.js';
import {onRequestGet as adminStories} from '../functions/api/admin/stories.js';
import {passwordHash} from '../functions/_lib/access.js';
const catalogue=JSON.parse(await readFile('site/data/histoires.json','utf8'));
const slug=catalogue[0].slug;
function mockEnv(disabled){return {
 ANALYTICS_DB:{prepare(query){return {async all(){assert.match(query,/story_states/);return {results:[...disabled].map(slug=>({slug}))};}}}},
 ASSETS:{async fetch(request){const pathname=new URL(request.url).pathname;const name=pathname==='/data/histoires.json'?'site/data/histoires.json':pathname==='/sitemap.xml'?'site/sitemap.xml':'site/histoires.xml';return new Response(await readFile(name),{status:200});}}
};}
async function cloud(path,disabled,env=mockEnv(disabled)){return onRequest({request:new Request('https://histoires2dansmatete.fr'+path),env,next:async()=>new Response('STATIC',{status:200})});}
const off=new Set([slug]);
assert.equal((await cloud(`/histoires/${slug}/`,off)).status,404);
assert.equal((await cloud(`/histoires/${slug}/index.html`,off)).status,404);
assert.equal((await cloud(`/histoires/${slug}/`,new Set())).status,200);
assert.equal((await (await cloud('/data/histoires.json',off)).json()).length,catalogue.length-1);
assert.ok(!(await (await cloud('/sitemap.xml',off)).text()).includes(`/histoires/${slug}/`));
assert.ok(!(await (await cloud('/histoires.xml',off)).text()).includes(`/histoires/${slug}/`));
assert.equal((await cloud(`/histoires/${slug}/`,new Set(),{})).status,503);
assert.equal((await adminStories({env:mockEnv(off),request:new Request('https://histoires2dansmatete.fr/api/admin/stories')})).status,503);
console.log('✓ Cloudflare : pages masquées protégées, sitemap/flux/catalogue filtrés, D1 obligatoire.');
const stateFile='.local/test-story-states.json';await rm(stateFile,{force:true});
const temporary=createServer();await new Promise(r=>temporary.listen(0,'127.0.0.1',r));const port=temporary.address().port;await new Promise(r=>temporary.close(r));
const password='unMotDePasseFort!2026';
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:String(port),LOCAL_STATE_FILE:stateFile,ADMIN_PASSWORD_HASH:await passwordHash(password),ADMIN_SESSION_SECRET:randomBytes(32).toString('base64url')},stdio:['ignore','pipe','pipe']});
let error='';server.stderr.on('data',d=>error+=d.toString());const url='http://127.0.0.1:'+port;
try{
 let started=false;
 for(let i=0;i<70;i++){if(server.exitCode!==null)break;try{const r=await fetch(url+'/admin/',{signal:AbortSignal.timeout(300)});if(r.ok){started=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(started,'Serveur local non démarré '+error);
 const signin=await (await fetch(url+'/admin/')).text();assert.match(signin,/Mot de passe administrateur/);assert.doesNotMatch(signin,/Gérer la bibliothèque/);
 assert.equal((await fetch(url+'/api/admin/stories')).status,401);
 assert.equal((await fetch(url+'/api/admin/stats')).status,401);
 const wrong=await fetch(url+'/api/admin/login',{method:'POST',redirect:'manual',headers:{Origin:url,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:'incorrect'})});assert.equal(wrong.status,303);assert.equal(wrong.headers.get('location'),'/admin/?erreur=1');
 const login=await fetch(url+'/api/admin/login',{method:'POST',redirect:'manual',headers:{Origin:url,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password})});assert.equal(login.status,303);
 // Reproduit la navigation depuis http://localhost:5173 (et pas 127.0.0.1).
 // Node se connecte à 127 pour éviter que localhost soit résolu en IPv6 (::1),
 // mais transmet le Host et l'Origin exacts du navigateur.
 const localhost='http://localhost:'+port;
 const formHeaders={Host:'localhost:'+port,Origin:localhost,'Content-Type':'application/x-www-form-urlencoded'};
 // fetch() de Node force Host sur l'URL réseau : http.request permet de tester
 // fidèlement un navigateur qui envoie Host: localhost tout en parlant à 127.0.0.1.
 const testPost=(headers)=>new Promise((resolve,reject)=>{
  const post=new URLSearchParams({password}).toString();
  const r=httpRequest({hostname:'127.0.0.1',port,path:'/api/admin/login',method:'POST',headers:{...headers,'Content-Length':Buffer.byteLength(post)}},res=>{
   res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}));
  });r.on('error',reject);r.end(post);
 });
 const localLogin=await testPost(formHeaders);
 assert.equal(localLogin.status,303,'Le formulaire localhost ne doit pas être bloqué par le contrôle Origin');
 assert.match(localLogin.headers['set-cookie'].join(';'),/h2_admin_session=/);
 const crossOrigin=await testPost({...formHeaders,Origin:'https://ailleurs.exemple'});
 assert.equal(crossOrigin.status,403,'Une origine étrangère doit toujours être bloquée');
 const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(cookie,/h2_admin_session=/);
 const options={headers:{Cookie:cookie}};
 assert.match(await (await fetch(url+'/admin/',options)).text(),/Gérer la bibliothèque/);
 assert.equal((await (await fetch(url+'/api/admin/stats',options)).json()).overview.pageviews,0);
 assert.equal((await (await fetch(url+'/api/admin/stories',options)).json()).stories.length,13);
 async function toggle(enabled,cookieValue=cookie,origin=url){return fetch(url+'/api/admin/stories',{method:'POST',headers:{Cookie:cookieValue,Origin:origin,'Content-Type':'application/json','X-Requested-With':'PodcastAdmin'},body:JSON.stringify({slug,enabled})});}
 assert.equal((await toggle(false,'')).status,401);
 assert.equal((await toggle(false,cookie,'https://evil.example')).status,403);
 assert.equal((await toggle(false)).status,200);
 assert.equal((await fetch(url+'/histoires/'+slug+'/')).status,404);
 assert.equal((await (await fetch(url+'/data/histoires.json')).json()).length,12);
 assert.ok(!(await (await fetch(url+'/sitemap.xml')).text()).includes(`/histoires/${slug}/`));
 assert.equal((await toggle(true)).status,200);
 assert.equal((await fetch(url+'/histoires/'+slug+'/')).status,200);
 const signout=await fetch(url+'/api/admin/logout',{method:'POST',redirect:'manual',headers:{Cookie:cookie,Origin:url}});assert.equal(signout.status,303);assert.match(signout.headers.get('set-cookie'),/Max-Age=0/);
 console.log('✓ Local HTTP : connexion depuis localhost ET 127.0.0.1, rejet des origines étrangères, publication et déconnexion.');
}finally{server.kill();await new Promise(r=>server.once('exit',r));await rm(stateFile,{force:true});}
