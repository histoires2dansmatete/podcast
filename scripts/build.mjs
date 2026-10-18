/**
 * Cloudflare Pages ne sert que le dossier dist/.
 * On recopie site/ tel quel : HTML, CSS et JS restent simples à modifier.
 * Aucun accès réseau ni dépendance externe requis.
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('site');
const destination = resolve('dist');
const info = await stat(source);
if (!info.isDirectory()) throw new Error('Le dossier site/ est introuvable.');

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log('✓ Build prêt dans dist/ (Cloudflare Pages publie ce dossier).');
