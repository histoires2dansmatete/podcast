/** Déploiement statique Cloudflare Pages : seul dist/ sera publié. */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizeOutputUrls, verifyOutputUrls } from './absolute-urls.mjs';
const source=resolve('site');const dest=resolve('dist');
if(!(await stat(source)).isDirectory())throw Error('Dossier site/ absent');
await rm(dest,{recursive:true,force:true});await mkdir(dest,{recursive:true});
await cp(source,dest,{recursive:true});
await normalizeOutputUrls();
await verifyOutputUrls();
await import('./optimize-output.mjs');
console.log('✓ Site prêt dans dist/ : pages publiques et lecteurs audio configurés.');
