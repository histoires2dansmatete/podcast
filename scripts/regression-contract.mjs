/**
 * Normalise uniquement les données explicitement variables dans les empreintes
 * de rendu : SEO généré et sources des illustrations du catalogue.
 *
 * Les balises, classes, textes, styles, destinations de liens et icônes de marque
 * restent strictement comparés. Le contrôle des chemins et fichiers image est
 * assuré séparément par test-image-paths.mjs, check.mjs et test:dist.
 */
export function normalizeRegressionContent(path, source) {
  let html = String(source).replace(/\r\n/g, '\n').trim();
  if (!path.endsWith('.html')) return html;

  html = html
    .replace(/<!-- SEO-START -->[\s\S]*?<!-- SEO-END -->/g, '<!-- SEO -->')
    .replace(/<meta\s+(?:[^>]*?)(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, '<title></title>');

  // Les illustrations peuvent basculer du logo de repli vers leur vrai fichier
  // (ou son WebP optimisé) selon les fichiers présents sur chaque ordinateur.
  // Il ne faut PAS transformer l'intégralité des balises img : les classes,
  // dimensions, attributs et icônes sociales doivent rester sous contrôle.
  html = html.replace(/<img\b[^>]*>/gi, tag =>
    tag.replace(/\bsrc=(["'])([^"']+)\1/i, (attribute, quote, src) => {
      if (!/^assets\/(?:logo\.webp|(?:images|stories)\/[a-zA-Z0-9_.\/-]+\.(?:svg|png|jpe?g|webp|avif))$/i.test(src)) return attribute;
      if (src.includes('..') || src.includes('//')) return attribute;
      return `src=${quote}__IMAGE_CONFIGUREE__${quote}`;
    })
  );
  return html;
}
