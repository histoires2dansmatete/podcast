import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {safeExternalURL,validateAudioUpdate,mergeAudio} from '../../functions/_lib/audio-overrides.js';
import {createSession,passwordHash} from '../../functions/_lib/access.js';
import {onRequestGet,onRequestPost,onRequestDelete} from '../../functions/api/admin/audio.js';

const base='https://podcast-7ck.pages.dev';
const stories=[{slug:'notre-histoire',title:'Notre histoire',audioUrl:'',platforms:{}},{slug:'une-autre',title:'Une autre histoire',audioUrl:'assets/audio/intro.mp3',platforms:{}}];
const seed={slug:'notre-histoire',src:'https://audio.example.org/ours.mp3',platforms:{spotify:'https://open.spotify.com/episode/123'}};
const headers={'Content-Type':'application/json','X-Requested-With':'PodcastAdmin','Origin':base};
const fakeDB=()=>{
 const items=new Map();
 return {items,prepare(sql){let params=[];return {
  bind(...v){params=v;return this},
  async all(){if(sql.includes('story_audio_overrides'))return {results:[...items].map(([slug,obj])=>({slug,audio_url:obj.src,platforms_json:JSON.stringify(obj.platforms)}))};throw Error('Unexpected query: '+sql)},
  async run(){if(sql.startsWith('INSERT'))items.set(params[0],{src:params[1],platforms:JSON.parse(params[2])});else if(sql.startsWith('DELETE'))items.delete(params[0]);else throw Error('Unexpected write: '+sql);return {success:true}}
 }} }
};

test('Seules les URLs HTTPS valides sont acceptées, sans code actif ni protocole interne',()=>{
 for(const url of ['javascript:alert(1)','http://insecure.test/a.mp3','data:text/html,hello','https://u:p@example.org/','https://example.org/\n','https://example.org/<script>'])assert.throws(()=>safeExternalURL(url));
 assert.equal(safeExternalURL('https://audio.example.org/ours.mp3'),'https://audio.example.org/ours.mp3');
 assert.deepEqual(validateAudioUpdate(seed).slug,seed.slug);
 assert.throws(()=>validateAudioUpdate({...seed,platforms:{evil:'https://example.org'}}));
 assert.throws(()=>validateAudioUpdate({...seed,src:'assets/audio/test.mp3'}),'L’édition en ligne n’accepte pas de fichier local');
 assert.throws(()=>validateAudioUpdate({...seed,src:'http://other.org'}));
});

test('Les surcharges D1 ne modifient pas les histoires d’origine ni les textes',()=>{
 const overlay=new Map([['notre-histoire',{src:seed.src,platforms:seed.platforms}]]);
 const out=mergeAudio(stories,overlay);
 assert.equal(out[0].audioUrl,seed.src);assert.equal(out[1].audioUrl,'assets/audio/intro.mp3');assert.equal(stories[0].audioUrl,'');
 assert.equal(mergeAudio(stories,new Map([['notre-histoire',{src:'javascript:bad()',platforms:{}}]]))[0].audioUrl,'');
});

test('API audio : authentification, protection CSRF, validation, écriture, lecture et restauration',async()=>{
 const env={ADMIN_PASSWORD_HASH:await passwordHash('a sufficiently secure password'),ADMIN_SESSION_SECRET:randomBytes(32).toString('base64url'),ANALYTICS_DB:fakeDB(),ASSETS:{fetch:async()=>Response.json(stories)}};
 const token=await createSession(env.ADMIN_SESSION_SECRET);
 const req=(method,body,extra={})=>new Request(base+'/api/admin/audio',{method,headers:{...headers,Cookie:`h2_admin_session=${token}`,...extra},body:method==='GET'?undefined:JSON.stringify(body)});
 const ctx=request=>({env,request});
 assert.equal((await onRequestGet(ctx(new Request(base+'/api/admin/audio')))).status,401);
 assert.equal((await onRequestPost(ctx(req('POST',seed,{Origin:'https://other.example'})))).status,403);
 assert.equal((await onRequestPost(ctx(req('POST',{...seed,src:'http://bad.example'})))).status,400);
 assert.equal((await onRequestPost(ctx(req('POST',{...seed,slug:'unknown'})))).status,404);
 assert.equal((await onRequestPost(ctx(req('POST',seed)))).status,200);
 assert.equal(env.ANALYTICS_DB.items.size,1);
 const list=await onRequestGet(ctx(req('GET')));assert.equal(list.status,200);
 const rows=(await list.json()).stories;assert.equal(rows[0].src,seed.src);assert.equal(rows[0].custom,true);
 assert.equal((await onRequestDelete(ctx(req('DELETE',{slug:seed.slug},{Origin:'https://other.example'})))).status,403);
 assert.equal((await onRequestDelete(ctx(req('DELETE',{slug:seed.slug})))).status,200);
 assert.equal(env.ANALYTICS_DB.items.size,0);
 assert.equal((await onRequestGet(ctx(req('GET')))).status,200);
 assert.equal((await onRequestGet({env:{...env,ANALYTICS_DB:null},request:req('GET')})).status,503);
});
