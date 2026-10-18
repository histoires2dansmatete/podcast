/** Sessions privées pour l'administration Pages Functions.
 * Jamais de mot de passe en client, jamais de secret par défaut.
 * ADMIN_PASSWORD_HASH = pbkdf2_sha256$iterations$salt$hash
 * ADMIN_SESSION_SECRET = clé aléatoire de 32 octets (base64url).
 */
const utf8 = new TextEncoder();
const cookieName = 'h2_admin_session';
const ttlSeconds = 8 * 60 * 60;
const noCache = {'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex,nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export const noStore = noCache;
export const privateCsp = "default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
export function privateResponse(message,status=401){return new Response(message,{status,headers:{...noCache,'Content-Type':'text/plain; charset=utf-8'}})}
const binToB64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64ToBin = b64 => Uint8Array.from(atob(b64.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-b64.length%4)%4)),c=>c.charCodeAt(0));
export async function passwordHash(password,{salt=crypto.getRandomValues(new Uint8Array(16)),iterations=240000}={}) {
 if(typeof password!=='string'||password.length<12||password.length>256)throw Error('Choisissez un mot de passe de 12 à 256 caractères.');
 const key=await crypto.subtle.importKey('raw',utf8.encode(password),'PBKDF2',false,['deriveBits']);
 const value=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256));
 return `pbkdf2_sha256$${iterations}$${binToB64(salt)}$${binToB64(value)}`;
}
export function isConfigured(env){return /^pbkdf2_sha256\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test(String(env.ADMIN_PASSWORD_HASH||'')) && String(env.ADMIN_SESSION_SECRET||'').length>=40;}
export async function verifyPassword(password,stored){
 try {
  const [algorithm,n,salt,digest]=String(stored).split('$');
  const iterations=Number(n),saltBytes=b64ToBin(salt),expected=b64ToBin(digest);
  if(algorithm!=='pbkdf2_sha256'||!Number.isInteger(iterations)||iterations<200000||iterations>1000000||saltBytes.length<16||expected.length!==32||typeof password!=='string'||password.length>256)return false;
  const key=await crypto.subtle.importKey('raw',utf8.encode(password),'PBKDF2',false,['deriveBits']);
  const result=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:saltBytes,iterations},key,256));
  let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=result[i]^expected[i];return mismatch===0;
 }catch{return false;}
}
async function sign(data,secret){
 const key=await crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return binToB64(new Uint8Array(await crypto.subtle.sign('HMAC',key,utf8.encode(data))));
}
export async function createSession(secret,now=Date.now()){
 const payload=`v1.${Math.floor(now/1000)+ttlSeconds}.${binToB64(crypto.getRandomValues(new Uint8Array(18)))}`;
 return `${payload}.${await sign(payload,secret)}`;
}
export async function validSession(token,secret,now=Date.now()){
 if(typeof token!=='string'||token.length>300)return false;
 const chunks=token.split('.');if(chunks.length!==4||chunks[0]!=='v1'||!/^[0-9]{10}$/.test(chunks[1])||!/^[-_a-zA-Z0-9]+$/.test(chunks[2]))return false;
 const expiration=Number(chunks[1]);const current=Math.floor(now/1000);
 if(expiration<=current||expiration>current+ttlSeconds)return false;
 try{
  const key=await crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('HMAC',key,b64ToBin(chunks[3]),utf8.encode(chunks.slice(0,3).join('.')));
 }catch{return false;}
}
export function getCookie(request){const raw=request.headers.get('cookie')||'';const part=raw.split(';').map(s=>s.trim()).find(x=>x.startsWith(cookieName+'='));return part?part.slice(cookieName.length+1):'';}
export function cookieHeader(token,request){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttlSeconds}${secure}`;}
export function clearCookie(request){return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function authorize(context){
 if(!isConfigured(context.env))return privateResponse('Administration non configurée : configurez ADMIN_PASSWORD_HASH et ADMIN_SESSION_SECRET.',503);
 return await validSession(getCookie(context.request),context.env.ADMIN_SESSION_SECRET)?null:privateResponse('Authentification requise.',401);
}
export function sameOrigin(request){return request.headers.get('Origin')===new URL(request.url).origin && request.headers.get('Sec-Fetch-Site')!=='cross-site';}
/** Jeton de formulaire signé : alternative sûre si le navigateur local n’envoie pas Origin. */
export async function createLoginFormToken(secret,now=Date.now()){
 const expires=Math.floor(now/1000)+20*60;
 const nonce=binToB64(crypto.getRandomValues(new Uint8Array(18)));
 const payload=`f1.${expires}.${nonce}`;
 return `${payload}.${await sign(payload,secret)}`;
}
export async function validLoginFormToken(token,secret,now=Date.now()){
 if(typeof token!=='string'||token.length>240)return false;
 const chunks=token.split('.');
 if(chunks.length!==4||chunks[0]!=='f1'||!/^[0-9]{10}$/.test(chunks[1])||!/^[-_a-zA-Z0-9]+$/.test(chunks[2]))return false;
 const current=Math.floor(now/1000),expiration=Number(chunks[1]);
 if(expiration<=current||expiration>current+20*60)return false;
 try{
  const key=await crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('HMAC',key,b64ToBin(chunks[3]),utf8.encode(chunks.slice(0,3).join('.')));
 }catch{return false;}
}
/** Validation du POST de connexion (local ET Cloudflare Pages).
 * - Origin explicite et identique à l'URL : OK.
 * - Origin manquant ou « null » : exige un jeton de formulaire HMAC court,
 *   livré uniquement par /admin/ (aucun secret exposé au navigateur).
 * - Origin étranger ou Sec-Fetch-Site: cross-site : TOUJOURS refusé.
 * On ne fait pas confiance aux en-têtes X-Forwarded-* fournis par le client.
 */
export async function loginOriginAllowed(request,csrfToken,secret,{local=false}={}){
 if(sameOrigin(request))return true;
 const origin=request.headers.get('Origin');
 const fetchSite=request.headers.get('Sec-Fetch-Site');
 if(fetchSite==='cross-site'||(origin&&origin!=='null'))return false;
 const url=new URL(request.url);
 if(local){
  if(url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname))return false;
 }else if(url.protocol!=='https:')return false;
 return validLoginFormToken(csrfToken,secret);
}
export function localLoginOriginAllowed(request,csrfToken,secret){
 return loginOriginAllowed(request,csrfToken,secret,{local:true});
}
export function loginHTML({error=false,local=false,csrfToken=""}={}){
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Connexion · Administration privée</title><link rel="icon" href="/assets/favicon.ico"><link rel="stylesheet" href="/assets/admin.css"></head><body class="admin-login"><main class="login-card"><a class="login-back" href="/">← Retour aux histoires</a><img class="login-logo" src="/assets/logo.webp" alt="" width="72" height="72"><p class="eyebrow">ESPACE PRIVÉ</p><h1>Bienvenue dans votre espace</h1><p>Entrez votre mot de passe pour consulter les statistiques et gérer la publication des histoires.</p>${error?'<p class="login-error" role="alert">Mot de passe incorrect ou trop de tentatives. Réessayez dans quelques minutes.</p>':''}<form action="/api/admin/login" method="POST">${csrfToken?`<input type="hidden" name="csrf" value="${csrfToken}">`:""}<label for="password">Mot de passe administrateur</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus minlength="1" maxlength="256"><button type="submit">Se connecter →</button></form><small>${local?'Administration locale : mêmes protections que la production.':'Accès strictement réservé à l’éditrice.'}</small></main></body></html>`;
}
export function htmlHeaders(){return {...noCache,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':privateCsp};}
