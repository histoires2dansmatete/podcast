/** Migration unique du hash PBKDF2 Node (240k) vers la limite Workers (100k).
 * Aucun mot de passe ou hash n'est envoyé sur le réseau ni affiché.
 * Préserve ADMIN_SESSION_SECRET, les commentaires et les autres variables de .env.local.
 */
import {readFile,writeFile,rename,chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {StringDecoder} from 'node:string_decoder';
import {stdin,stdout} from 'node:process';
import {passwordHash,verifyPassword,cloudflareHashSupported} from '../functions/_lib/access.js';
const path='.env.local';
const input=await readFile(path,'utf8').catch(()=>{throw Error('.env.local introuvable : exécutez depuis la racine du projet.');});
const match=input.match(/^ADMIN_PASSWORD_HASH=(.*)$/m);
if(!match)throw Error('ADMIN_PASSWORD_HASH absent de .env.local.');
const oldHash=match[1].trim();
if(!/^pbkdf2_sha256\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test(oldHash))throw Error('Format du hash local invalide.');
if(cloudflareHashSupported(oldHash)){
 console.log('✓ Hash déjà compatible Cloudflare (100 000 itérations). Aucune modification.');
 process.exitCode=0;
}else{
 if(!stdin.isTTY||!stdin.setRawMode)throw Error('Utilisez un terminal interactif pour masquer la saisie.');
 stdout.write('Saisissez votre MOT DE PASSE ACTUEL pour recalculer son hash (saisie masquée) : ');
 stdin.setRawMode(true);stdin.resume();
 let password='';const decoder=new StringDecoder('utf8');
 try{
  password=await new Promise((resolve,reject)=>{
   let value='';
   const onData=buffer=>{
    for(const ch of decoder.write(buffer)){
     if(ch==='\r'||ch==='\n'){stdin.off('data',onData);stdout.write('\n');resolve(value);return;}
     if(ch==='\u0003'){stdin.off('data',onData);reject(Error('Annulé'));return;}
     if(ch==='\u007f'||ch==='\b'){value=Array.from(value).slice(0,-1).join('');continue;}
     if(Array.from(value).length<256)value+=ch;
    }
   };
   stdin.on('data',onData);
  });
 }finally{stdin.setRawMode(false);stdin.pause();}
 if(!(await verifyPassword(password,oldHash)))throw Error('Le mot de passe saisi ne correspond pas au hash local. Aucun fichier modifié.');
 const replacement=await passwordHash(password,{iterations:100000});
 password='';
 if(!cloudflareHashSupported(replacement))throw Error('Hash recalculé incompatible : aucun fichier modifié.');
 const updated=input.replace(/^ADMIN_PASSWORD_HASH=.*$/m,'ADMIN_PASSWORD_HASH='+replacement);
 const temp=path+'.tmp-'+randomBytes(6).toString('hex');
 try{
  await writeFile(temp,updated,{mode:0o600,flag:'wx'});
  await rename(temp,path);
  await chmod(path,0o600).catch(()=>{});
 }catch(error){const {rm}=await import('node:fs/promises');await rm(temp,{force:true}).catch(()=>{});throw error;}
 console.log('✓ Hash recalculé avec un nouveau sel et 100 000 itérations PBKDF2-SHA256.');
 console.log('✓ Votre mot de passe et ADMIN_SESSION_SECRET sont inchangés.');
 console.log('Étape suivante : npm run admin:sync-cloudflare -- --project podcast-7ck');
 console.log('Puis déclenchez un nouveau déploiement Cloudflare Pages.');
}
