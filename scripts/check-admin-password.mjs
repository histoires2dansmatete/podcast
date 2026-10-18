/** Vérifie hors ligne le mot de passe SAISI contre le hash EXACT de .env.local, sans l'afficher. */
import {readFile} from 'node:fs/promises';
import {stdin,stdout} from 'node:process';
import {verifyPassword,isConfigured} from '../functions/_lib/access.js';
if(!stdin.isTTY||!stdin.setRawMode){console.error('Utilisez cette commande dans un vrai terminal interactif pour masquer le mot de passe.');process.exit(2)}
const raw=await readFile('.env.local','utf8').catch(()=>{throw Error('.env.local est absent.');});
const env=Object.fromEntries(raw.split(/\r?\n/).map(s=>s.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]));
if(!isConfigured(env)){console.error('✗ Secrets .env.local absents ou mal formés.');process.exit(2)}
stdout.write('Saisissez le mot de passe administrateur (masqué) : ');
stdin.setRawMode(true);stdin.resume();
let pw='';
try {
 pw=await new Promise((resolve,reject)=>{
  function onData(chunk){for(const ch of chunk.toString('utf8')){
   if(ch==='\r'||ch==='\n'){stdin.off('data',onData);stdout.write('\n');resolve(pw);return;}
   if(ch==='\u0003'){stdin.off('data',onData);reject(Error('Annulé'));return;}
   if(ch==='\u007f'||ch==='\b'){pw=pw.slice(0,-1);continue;}
   if(pw.length<256)pw+=ch;
  }}stdin.on('data',onData);
 });
}finally{stdin.setRawMode(false);stdin.pause();}
if(await verifyPassword(pw,env.ADMIN_PASSWORD_HASH))console.log('✓ Ce mot de passe correspond exactement au hash de .env.local.');
else{console.error('✗ Ce mot de passe ne correspond pas au hash de .env.local. Le serveur local utilise peut-être une variable d’environnement qui remplace .env.local.');process.exitCode=1;}
pw='';
