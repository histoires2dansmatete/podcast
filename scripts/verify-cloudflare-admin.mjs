/** Confirme sans révéler les secrets que Cloudflare utilise exactement le hash ET la clé locale. */
import {readFile} from 'node:fs/promises';
import {createProof} from '../functions/_lib/admin-config-proof.js';
const args=process.argv.slice(2);
const index=args.indexOf('--url');
const target=index>=0?args[index+1]:'https://podcast-7ck.pages.dev';
let url;
try{url=new URL('/api/admin/config-check',target);if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw Error();}
catch{console.error('Usage : npm run admin:verify-cloudflare -- --url https://podcast-7ck.pages.dev');process.exit(2)}
const raw=await readFile('.env.local','utf8').catch(()=>{throw Error('.env.local absent : exécutez la commande depuis votre projet local.');});
const env=Object.fromEntries(raw.split(/\r?\n/).map(s=>s.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]));
const proof=await createProof(env);
console.log('Vérification cryptographique de la configuration active sur '+url.origin+' (aucun secret transmis).');
let response;
try{response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(proof),redirect:'error',signal:AbortSignal.timeout(12_000)});}
catch(err){console.error('✗ Endpoint inaccessible : '+err.message);process.exit(2)}
// Éviter process.exit() juste après fetch : sous Node/Windows/MINGW64,
// l'arrêt forcé peut provoquer une assertion native dans src\win\async.c.
if(response.status===404||response.status===405){
 console.error('✗ Correctif de diagnostic absent du déploiement : publiez la V12.3 ou ultérieure.');
 process.exitCode=2;
}else if(response.status===503){
 console.error('✗ Secrets absents/invalides ou hash PBKDF2 non pris en charge par le runtime.');
 process.exitCode=2;
}else if(response.status===200){
 console.log('✓ EXACTEMENT LES MÊMES SECRETS : hash et clé de session correspondent au fichier .env.local.');
 console.log('Important : cette preuve HMAC vérifie les SECRETS, pas la compatibilité PBKDF2 du runtime.');
 process.exitCode=0;
}else if(response.status===409){
 console.error('✗ SECRETS DIFFÉRENTS : le déploiement actif n’utilise pas la même paire de secrets.');
 process.exitCode=1;
}else{
 console.error(`✗ Diagnostic HTTP ${response.status}. Vérifiez les logs Cloudflare sans transmettre de secrets.`);
 process.exitCode=2;
}
