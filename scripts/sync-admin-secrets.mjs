/**
 * Copie UNIQUEMENT les deux secrets admin locaux vers un projet Cloudflare Pages.
 * Aucun hash, mot de passe ni clé de session ne passe dans les arguments CLI ou un fichier temporaire.
 * Évitez cette commande pour un projet non contrôlé par vous.
 */
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {isConfigured} from '../functions/_lib/access.js';
const args=process.argv.slice(2);
const pos=args.indexOf('--project');
const project=pos>=0?args[pos+1]:'';
if(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(project||'')){
 console.error('Usage : npm run admin:sync-cloudflare -- --project podcast-7ck');process.exit(2);
}
const lines=await readFile('.env.local','utf8').catch(()=>{throw Error('Fichier .env.local absent : les secrets locaux sont nécessaires.');});
const env=Object.fromEntries(lines.split(/\r?\n/).map(x=>x.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]));
if(!isConfigured(env))throw Error('ADMIN_PASSWORD_HASH ou ADMIN_SESSION_SECRET invalide dans .env.local');
if(!stdin.isTTY){console.error('Exécutez cette commande dans un terminal interactif pour confirmer le projet cible.');process.exit(2);}
console.log(`Cette action va REMPLACER les secrets de connexion admin sur Cloudflare Pages pour le projet « ${project} ».`);
console.log('Elle invalidera toutes les sessions existantes si la clé de session change.');
const prompt=createInterface({input:stdin,output:stdout});
const reply=await prompt.question(`Pour confirmer, saisissez exactement « ${project} » : `);
prompt.close();
if(reply.trim()!==project){console.error('Annulé, aucun secret envoyé.');process.exit(1);}
const json=JSON.stringify({ADMIN_PASSWORD_HASH:env.ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET:env.ADMIN_SESSION_SECRET});
const command=process.platform==='win32'?'npx.cmd':'npx';
const child=spawn(command,['wrangler','pages','secret','bulk','--project-name',project],{stdio:['pipe','inherit','inherit'],shell:process.platform==='win32'});
// Aucun secret dans les arguments, dans les logs ou dans le dépôt.
child.stdin.on('error',error=>{if(error.code!=='EPIPE')console.error('Erreur d’envoi des secrets :',error.message);});
child.stdin.end(json+'\n');
const exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve(code??1));});
if(exitCode!==0){console.error('Transfert non confirmé par Wrangler. Vérifiez votre connexion et vos droits Cloudflare.');process.exit(exitCode);}
console.log('✓ Wrangler a accepté les secrets administrateur pour le projet demandé.');
console.log('Important : redéployez la branche de production (git push ou retry deployment), puis attendez la fin du verrouillage éventuel de 15 min.');
