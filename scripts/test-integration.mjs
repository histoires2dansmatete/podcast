/** Tests d'intégration : gating Cloudflare simulé ET serveur HTTP local réel. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {onRequest} from '../functions/_middleware.js';
import {onRequestGet as adminStories} from '../functions/api/admin/stories.js';
const catalogue=JSON.parse(await readFile('site/data/histoires.json','utf8'));
const slug=catalogue[0].slug;
function mockEnv(disabled){return {
 ANALYTICS_DB:{prepare(query){return {async all(){assert.match(query,/story_states/);return {results:[...disabled].map(slug=>({slug}))};}}}},
 ASSETS:{async fetch(request){const pathname=new URL(request.url).pathname;const name=pathname==='/data/histoires.json'?'site/data/histoires.json':pathname==='/sitemap.xml'?'site/sitemap.xml':'site/histoires.xml';return new Response(await readFile(name),{status:200});}}
};}
async function cloud(path,disabled,env=mockEnv(disabled)){
 const context={request:new Request('https://histoires2dansmatete.fr'+path),env,next:async()=>new Response('STATIC',{status:200})};
 return onRequest(context);
}
const off=new Set([slug]);
assert.equal((await cloud(`/histoires/${slug}/`,off)).status,404,'Cloudflare doit refuser une histoire désactivée');
assert.equal((await cloud(`/histoires/${slug}/index.html`,off)).status,404,'Pas de bypass via index.html');
assert.equal((await cloud(`/histoires/${slug}/`,new Set())).status,200);
const filtered=await (await cloud('/data/histoires.json',off)).json();
assert.equal(filtered.length,catalogue.length-1);assert.ok(filtered.every(x=>x.slug!==slug&&!Object.hasOwn(x,'bodyHtml')));
const sitemap=await (await cloud('/sitemap.xml',off)).text();
assert.ok(!sitemap.includes(`/histoires/${slug}/`));
const rss=await (await cloud('/histoires.xml',off)).text();assert.ok(!rss.includes(`/histoires/${slug}/`));
assert.equal((await cloud(`/histoires/${slug}/`,new Set(),{})).status,503,'D1 absente = aucun récit exposé');
assert.equal((await adminStories({env:mockEnv(off),request:new Request('https://histoires2dansmatete.fr/api/admin/stories')})).status,503,'Admin doit imposer Access');
console.log('✓ Middleware Cloudflare : 404, sitemap/RSS/catalogue filtrés et D1 indispensable.');
// Test HTTP avec un véritable serveur local : aucune connaissance préalable d'un état JSON.
const stateFile='.local/test-story-states.json';await rm(stateFile,{force:true});
const temporary=createServer();await new Promise(r=>temporary.listen(0,'127.0.0.1',r));const port=temporary.address().port;await new Promise(r=>temporary.close(r));
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...process.env,PORT:String(port),LOCAL_STATE_FILE:stateFile},stdio:['ignore','pipe','pipe']});
let error='';server.stderr.on('data',d=>error+=d.toString());
const url='http://127.0.0.1:'+port;
try{
 let started=false;
 for(let i=0;i<60;i++){
  if(server.exitCode!==null)break;
  try{const r=await fetch(url+'/admin/',{signal:AbortSignal.timeout(300)});if(r.ok){started=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,90));
 }
 assert.ok(started,'Serveur local non démarré '+error);
 const admin=await (await fetch(url+'/admin/')).text();assert.match(admin,/Mode local/);assert.match(admin,/Gérer la bibliothèque/);
 const stats=await (await fetch(url+'/api/admin/stats')).json();assert.equal(stats.overview.pageviews,0);assert.match(stats.note,/MODE LOCAL/);
 const states=await (await fetch(url+'/api/admin/stories')).json();assert.equal(states.stories.length,13);assert.ok(states.stories.every(s=>s.enabled));
 async function toggle(enabled){return fetch(url+'/api/admin/stories',{method:'POST',headers:{Origin:url,'Content-Type':'application/json','X-Requested-With':'PodcastAdmin'},body:JSON.stringify({slug,enabled})});}
 const bad=await fetch(url+'/api/admin/stories',{method:'POST',headers:{Origin:'https://malicious.example','Content-Type':'application/json','X-Requested-With':'PodcastAdmin'},body:JSON.stringify({slug,enabled:false})});assert.equal(bad.status,403);
 assert.equal((await toggle(false)).status,200);
 assert.equal((await fetch(url+'/histoires/'+slug+'/')).status,404);
 const list=await (await fetch(url+'/data/histoires.json')).json();assert.equal(list.length,12);
 assert.ok(!(await (await fetch(url+'/sitemap.xml')).text()).includes(`/histoires/${slug}/`));
 assert.equal((await toggle(true)).status,200);
 assert.equal((await fetch(url+'/histoires/'+slug+'/')).status,200);
 console.log('✓ HTTP local : admin accessible, statistiques locales explicites, toggle sécurisé, 404 et sitemap recalculé.');
}finally{server.kill();await new Promise(r=>server.once('exit',r));await rm(stateFile,{force:true});}
