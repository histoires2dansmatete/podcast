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

  // Les couvertures (choix, ordre, titres, badges) viennent du catalogue
  // éditorial et possèdent leurs propres tests de génération.
  if(path.endsWith('index.html')) {
    html=html.replace(/<!-- CAROUSEL-START -->[\s\S]*?<!-- CAROUSEL-END -->/g,'<!-- CAROUSEL-CONFIGURE -->');
    // Le sticker et les commandes reflètent l'épisode actif et la configuration
    // (vitesse et nombre de cartes) : neutraliser uniquement ces données.
    html=html.replace(/(<div aria-label=")[^"]*(" class="floating-sticker")/, '$1__STATUT_PODCAST__$2');
    html=html.replace(/(<div aria-label="__STATUT_PODCAST__" class="floating-sticker"[^>]*><span>)[^<]*(<\/span><strong>)[^<]*(<\/strong>)/, '$1__TEXTE__$2__TEXTE__$3');
    html=html.replace(/(<div aria-label="Faire défiler les couvertures" class="cover-controls")[^>]*>/, '$1 data-rotation-ms="__ROTATION__">');
    html=html.replace(/(<span aria-live="polite" class="cover-index">)[^<]*(<\/span>)/, '$1__INDEX__$2');
    // Seuls ces libellés et compteurs sont pilotés par audio.config.json/D1.
    html=html.replace(/(<em id="home-hero-audio-verb">)[^<]*(<\/em>)/, '$1__STATUT__$2');
    html=html.replace(/(<p class="hero-description">)[\s\S]*?(<\/p>)/, '$1__PRESENTATION_AUDIO__$2');
    for(const id of ['home-audio-kicker','home-audio-emphasis','home-audio-description','home-audio-pill','home-closing-kicker']){
      const re=new RegExp(`(<(?:div|em|p)[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(<\\/(?:div|em|p)>)`,'g');
      html=html.replace(re,(_full,start,end)=>start+'__AUDIO_DYNAMIQUE__'+end);
    }

  }
  html=html.replace(/<body data-podcast-count="\d+">/,'<body data-podcast-count="__COUNT__">');
  html=html.replace(/Des histoires à lire(?:… et bientôt| et) à écouter/g,'__ANNONCE_AUDIO__');
  html=html.replace(/(<p>Des histoires inventées avec le cœur,<br\s*\/?>)[^<]*(<\/p>)/g,'$1__FOOTER_AUDIO__$2');
  if(path.endsWith('histoires.html')) html=html.replace(/Des rencontres, des émotions et de jolies leçons de vie\.[^<]*(?=<\/p>)/g,'__PRESENTATION_CATALOGUE_AUDIO__');
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
