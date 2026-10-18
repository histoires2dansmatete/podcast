import assert from 'node:assert/strict';
import { isLocalImagePath } from './local-image-path.mjs';
import { renderStory } from './stories.mjs';

for (const path of [
  'assets/images/micro2-1.png',
  'assets/images/optimized/bas_les_masques.webp',
  'assets/images/optimized/series/portrait.webp',
  'assets/stories/histoire.svg',
]) assert.ok(isLocalImagePath(path), `Chemin valide rejeté : ${path}`);

for (const path of [
  '../images/malicious.webp',
  'assets/images/../passwords.webp',
  'assets/images/optimized/../../secrets.png',
  'https://ailleurs.example/test.webp',
  '/assets/images/test.webp',
  'assets/images/optimized/photo.webp?cache=1',
  'assets/images\\optimized\\photo.webp',
]) assert.ok(!isLocalImagePath(path), `Chemin invalide accepté : ${path}`);

const story = {
  slug: 'bas-les-masques', title: 'Bas les masques',
  image: 'assets/images/optimized/bas_les_masques.webp',
  description: 'Une belle histoire', bodyHtml: '<p>Bonjour</p>', platforms: {},
};
const html = renderStory(story, 0, [story]);
assert.ok(html.includes('src="../../assets/images/optimized/bas_les_masques.webp"'),
  'La fiche doit réellement afficher la variante WebP optimisée');
assert.ok(!html.includes('episode-visual-emoji">'), 'La fiche doit afficher une image, pas seulement un pictogramme');
console.log('✓ Images locales : originaux, WebP optimisés et sécurité des chemins contrôlés.');
