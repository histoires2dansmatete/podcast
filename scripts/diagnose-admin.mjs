/** Diagnostic OFFLINE des secrets administrateur locaux. Aucun secret n'est affiché. */
import {readFile} from 'node:fs/promises';
import {isConfigured} from '../functions/_lib/access.js';
const config=await readFile('.env.local','utf8').catch(()=>null);
if(!config){console.error('✗ .env.local est absent. Utilisez npm run admin:setup (si vous n’avez pas déjà un secret à conserver).');process.exit(1);}
const env=Object.fromEntries(config.split(/\r?\n/).map(x=>x.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2]]));
if(!isConfigured(env)){console.error('✗ ADMIN_PASSWORD_HASH ou ADMIN_SESSION_SECRET invalide dans .env.local.');process.exit(1);}
console.log('✓ Les secrets ADMIN_PASSWORD_HASH et ADMIN_SESSION_SECRET locaux sont au bon format.');
console.log('ℹ Cette commande NE PEUT PAS vérifier les valeurs présentes sur Cloudflare.');
console.log('ℹ Pour y transférer précisément ces valeurs : npm run admin:sync-cloudflare -- --project podcast-7ck');
console.log('ℹ Après la synchronisation et le nouveau déploiement : attendez 15 minutes si les essais précédents ont bloqué votre adresse.');
