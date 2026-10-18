/** Une seule règle pour les chemins d’images locaux, y compris les variantes optimisées. */
const IMAGE_PATH = /^assets\/(?:images|stories)\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.(?:svg|png|jpe?g|webp|avif|tiff?|bmp)$/i;

export function isLocalImagePath(value) {
  return typeof value === 'string'
    && IMAGE_PATH.test(value)
    && !value.split('/').some(part => part === '.' || part === '..');
}
