/**
 * Diagnostic non authentifiant pour comparer les deux secrets d'administration
 * entre le poste local et un déploiement Cloudflare Pages.
 * Aucun mot de passe, hash ou secret n'est transmis ; uniquement une preuve
 * HMAC-SHA256 temporaire calculée avec la clé locale et liée au hash local.
 * Cette preuve ne crée jamais de session.
 */
import {isConfigured} from './access.js';
const encoder=new TextEncoder();
const ttl=120_000;
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unbase64url=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
const message=(hash,timestamp,nonce)=>`histoires-admin-config-check-v1:${timestamp}:${nonce}:${hash}`;
async function hmacKey(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function createProof(env,now=Date.now()){
 if(!isConfigured(env))throw Error('Secrets locaux absents ou invalides');
 const timestamp=Math.floor(now/1000);
 const nonce=b64url(crypto.getRandomValues(new Uint8Array(24)));
 const signature=await crypto.subtle.sign('HMAC',await hmacKey(env.ADMIN_SESSION_SECRET),encoder.encode(message(env.ADMIN_PASSWORD_HASH,timestamp,nonce)));
 return {timestamp,nonce,proof:b64url(new Uint8Array(signature))};
}
export async function verifyProof(env,input,now=Date.now()){
 if(!isConfigured(env)||!input||typeof input!=='object')return false;
 const {timestamp,nonce,proof}=input;
 if(!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp*1000)>ttl||typeof nonce!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(nonce)||typeof proof!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(proof))return false;
 try{return await crypto.subtle.verify('HMAC',await hmacKey(env.ADMIN_SESSION_SECRET),unbase64url(proof),encoder.encode(message(env.ADMIN_PASSWORD_HASH,timestamp,nonce)));}catch{return false;}
}
