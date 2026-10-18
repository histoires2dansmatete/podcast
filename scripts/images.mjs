/** Catalogue central : les fichiers WebP optimisés sont prioritaires quand ils existent. */
import {readFile, stat} from 'node:fs/promises';
import {resolve, sep, posix} from 'node:path';

const root = resolve('site');
const pathOK = path => /^assets\/images\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|svg|avif|tiff?|bmp)$/i.test(path) && !path.includes('..');
const exists = async path => (await stat(resolve(root, path)).catch(() => null))?.isFile() === true;

export async function configuredImages() {
  const config = JSON.parse(await readFile(resolve(root, 'assets/images.config.json'), 'utf8'));
  if (!config.stories || !config.globals) throw Error('Configuration des images invalide');
  return config;
}

/** Les originaux restent déclarés dans le JSON ; la variante WebP est détectée sans modifier le catalogue. */
export async function optimizedImageFor(wanted) {
  if (!pathOK(wanted)) throw Error(`Chemin d'image non autorisé : ${wanted}`);
  const full = resolve(root, wanted);
  if (!full.startsWith(root + sep)) throw Error('Chemin en dehors du site');
  const name = wanted.slice('assets/images/'.length).replace(/\.(png|jpe?g|webp|avif|tiff?|bmp)$/i, '');
  if (!wanted.toLowerCase().endsWith('.svg')) {
    const optimized = `assets/images/optimized/${name}.webp`;
    if (await exists(optimized)) return optimized;
  }
  return await exists(wanted) ? wanted : null;
}

export async function imageFor(story, config) {
  const wanted = config.stories[story.slug];
  if (!wanted) return story.image;
  return await optimizedImageFor(wanted) || `assets/stories/${story.slug}.svg`;
}

export async function globalImageFor(key, config) {
  const fallback = 'assets/logo.webp';
  const wanted = config.globals?.[key] || fallback;
  if (wanted === fallback) return fallback;
  return await optimizedImageFor(wanted) || fallback;
}
