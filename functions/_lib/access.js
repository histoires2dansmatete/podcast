/** Authentification serveur à l'aide d'un JWT Cloudflare Access SIGNÉ. Pas de bypass. */
let cachedKeys=null;
let expiresAt=0;
const denied = (status,message) => new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
const fromBase64 = v => Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-v.length%4)%4)), c=>c.charCodeAt(0));
function jsonPart(chunk){return JSON.parse(new TextDecoder().decode(fromBase64(chunk)));}
export async function authorize(context){
 const team=String(context.env.ACCESS_TEAM_DOMAIN||'').toLowerCase().replace(/^https:\/\//,'').replace(/\/$/,'');
 const aud=String(context.env.ACCESS_AUD||'');
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)||!aud)return denied(503,'Administration non configurée : paramétrez ACCESS_TEAM_DOMAIN et ACCESS_AUD.');
 const raw=context.request.headers.get('Cf-Access-Jwt-Assertion')||'';
 if(!raw)return denied(401,'Authentification Cloudflare Access requise.');
 try {
  const chunks=raw.split('.');if(chunks.length!==3||chunks.some(x=>!x))throw Error('JWT invalide');
  const [header,payload]=[jsonPart(chunks[0]),jsonPart(chunks[1])];
  if(header.alg!=='RS256'||!header.kid)throw Error('Algorithme ou kid invalide');
  const now=Math.floor(Date.now()/1000);
  if(payload.iss!==`https://${team}`||!(Array.isArray(payload.aud)?payload.aud.includes(aud):payload.aud===aud)||typeof payload.exp!=='number'||payload.exp<=now||typeof payload.iat!=='number'||payload.iat>now+60||(payload.nbf && payload.nbf>now+60))throw Error('Claims invalides');
  if(!cachedKeys||expiresAt<Date.now()){
   const response=await fetch(`https://${team}/cdn-cgi/access/certs`,{signal:AbortSignal.timeout(3500)});
   if(!response.ok)throw Error('Certificats Access indisponibles');
   const jwks=await response.json();cachedKeys=jwks.keys||[];expiresAt=Date.now()+3600000;
  }
  const jwk=cachedKeys.find(k=>k.kid===header.kid && k.kty==='RSA');if(!jwk)throw Error('Clé inconnue');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signature=fromBase64(chunks[2]);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,new TextEncoder().encode(chunks[0]+'.'+chunks[1]));
  if(!valid)throw Error('Signature invalide');
  return null;
 }catch(error){console.warn('Access JWT refusé :',error.message);return denied(403,'Accès refusé.');}
}
export const noStore={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
