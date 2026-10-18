import {isConfigured,verifyPassword,createSession,cookieHeader,clearCookie,noStore,privateResponse,sameOrigin} from './access.js';
const windowSeconds=15*60;
const attemptsMax=5;
const localAttempts=new Map();
const redirect=(to,extra={})=>new Response(null,{status:303,headers:{...noStore,Location:to,...extra}});
const sessionKey=async(ip,secret)=>{
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const raw=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip));
 return Array.from(new Uint8Array(raw)).slice(0,16).map(v=>v.toString(16).padStart(2,'0')).join('');
};
async function canAttempt(env,key,{local=false}={}){
 const now=Math.floor(Date.now()/1000);
 if(local){const record=localAttempts.get(key);return !record||record.until<now||record.count<attemptsMax;}
 if(!env.ANALYTICS_DB)throw Error('D1 non configurée pour le contrôle des tentatives');
 const row=await env.ANALYTICS_DB.prepare('SELECT failures,expires_at FROM admin_login_limits WHERE bucket=?').bind(key).first();
 return !row||Number(row.expires_at)<=now||Number(row.failures)<attemptsMax;
}
async function remember(env,key,successful,{local=false}={}){
 const now=Math.floor(Date.now()/1000);
 if(local){if(successful){localAttempts.delete(key);return;}const record=localAttempts.get(key);const current=record?.until>now?record.count:0;localAttempts.set(key,{count:current+1,until:record?.until>now?record.until:now+windowSeconds});return;}
 if(successful){await env.ANALYTICS_DB.prepare('DELETE FROM admin_login_limits WHERE bucket=?').bind(key).run();return;}
 await env.ANALYTICS_DB.prepare('INSERT INTO admin_login_limits (bucket,failures,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET failures=CASE WHEN expires_at<=? THEN 1 ELSE failures+1 END,expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END').bind(key,now+windowSeconds,now,now,now+windowSeconds).run();
}
export async function login(context,{local=false}={}){
 const {request,env}=context;
 if(!isConfigured(env))return privateResponse('Administration non configurée.',503);
 if(!sameOrigin(request))return privateResponse('Origine non autorisée.',403);
 if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(request.headers.get('Content-Type')||''))return privateResponse('Formulaire requis.',415);
 if(Number(request.headers.get('content-length')||0)>1024)return privateResponse('Requête trop volumineuse.',413);
 let raw;try{raw=await request.text();}catch{return privateResponse('Requête invalide.',400)}
 if(raw.length>1024)return privateResponse('Requête trop volumineuse.',413);
 const password=new URLSearchParams(raw).get('password')||'';
 const ip=local?'localhost':request.headers.get('cf-connecting-ip')||'unknown';
 const key=await sessionKey(ip,env.ADMIN_SESSION_SECRET);
 try{
  if(!(await canAttempt(env,key,{local})))return privateResponse('Trop de tentatives. Réessayez dans 15 minutes.',429);
  const ok=await verifyPassword(password,env.ADMIN_PASSWORD_HASH);
  await remember(env,key,ok,{local});
  if(!ok)return redirect('/admin/?erreur=1');
  const token=await createSession(env.ADMIN_SESSION_SECRET);
  return redirect('/admin/',{'Set-Cookie':cookieHeader(token,request)});
 }catch(error){console.error('Connexion administration :',error.message);return privateResponse('Authentification momentanément indisponible.',503);}
}
export async function logout(context){
 if(!sameOrigin(context.request))return privateResponse('Origine non autorisée.',403);
 return redirect('/admin/',{'Set-Cookie':clearCookie(context.request)});
}
