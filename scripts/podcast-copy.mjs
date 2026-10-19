/** Messages de l'accueil et du catalogue recalculés à partir des épisodes publiés.
 * Remplace uniquement des zones explicitement identifiées ; génération idempotente. */
export const isReady = s => Boolean(s.audioUrl || Object.values(s.platforms || {}).some(Boolean));
export const audioCount = stories => stories.filter(isReady).length;
export function applyPodcastCopy(html,stories,page){
 const count=audioCount(stories),ready=count>0,plural=count>1?'s':'';
 const replaceInner=(pattern,value)=>{html=html.replace(pattern,(_,a,b)=>a+value+b)};
 const announcement=ready?'Des histoires à lire et à écouter':'Des histoires à lire… et bientôt à écouter';
 html=html.replace(/Des histoires à lire(?:… et bientôt| et) à écouter/g,announcement);
 html=html.replace(/(<p>Des histoires inventées avec le cœur,<br\s*\/?\s*>)[^<]*(<\/p>)/g,(_,a,b)=>a+(ready?'à lire et à écouter en famille':'à lire aujourd’hui et bientôt à écouter')+b);
 // C'est le modèle de page d'accueil qui porte les messages dynamiques.
 if(page==='index.html'){
  replaceInner(/(<em id="home-hero-audio-verb">)[\s\S]*?(<\/em>)/,'Et '+(ready?'aussi':'bientôt'));
  replaceInner(/(<p class="hero-description">)[\s\S]*?(<\/p>)/,ready
   ? `Vous les avez aimées à lire. Vous pouvez aussi en écouter certaines ! Les histoires de <strong>« Dans ma tête »</strong> sont réunies ici avec leurs ${stories.length} textes intégraux et ${count} épisode${plural} audio.`
   :`Vous les avez aimées à lire. Vous allez adorer les écouter ! Les histoires de <strong>« Dans ma tête »</strong> sont désormais réunies ici, avec leurs ${stories.length} textes intégraux et, bientôt, leur version audio.`);
  replaceInner(/(<div class="section-kicker" id="home-audio-kicker">)[\s\S]*?(<\/div>)/,`<span aria-hidden="true">✶</span> ${ready?'DES HISTOIRES À ÉCOUTER':'BIENTÔT DANS VOS ÉCOUTEURS'}`);
  replaceInner(/(<em id="home-audio-emphasis">)[\s\S]*?(<\/em>)/,ready?'la magie est là !':'la magie arrive !');
  replaceInner(/(<p id="home-audio-description">)[\s\S]*?(<\/p>)/,ready
   ?`${count} épisode${plural} déjà disponible${plural} pour vos moments en famille. D’autres suivront bientôt.`
   :`À l'heure du coucher, sur la route des vacances ou pour une petite pause douceur : les histoires vous accompagneront bientôt partout.`);
  replaceInner(/(<div class="listen-pill" id="home-audio-pill">)[\s\S]*?(<\/div>)/,`<span class="pulse-dot"></span> ${ready?`${count} épisode${plural} disponible${plural}`:'Le podcast est en préparation'}`);
  replaceInner(/(<div class="section-kicker" id="home-closing-kicker">)[\s\S]*?(<\/div>)/,ready?'LES HISTOIRES CONTINUENT':'EN ATTENDANT LE PREMIER ÉPISODE');
  // On conserve les décorations et les accents typographiques des autres sections.
 }
 if(page==='histoires.html'){
  html=html.replace(/Des rencontres, des émotions et de jolies leçons de vie\.[^<]*(?=<\/p>)/, ready
   ?`Des rencontres, des émotions et de jolies leçons de vie. ${count} podcast${plural} déjà à écouter, et toutes les histoires à lire.`
   :'Des rencontres, des émotions et de jolies leçons de vie. Toutes les histoires à lire, avec les épisodes audio déjà publiés et ceux à venir.');
 }
 if(['index.html','histoires.html','ecouter.html'].includes(page)){
  html=html.replace(/<body(?: data-podcast-count="\d+")?>/,`<body data-podcast-count="${count}">`);
 }
 return html;
}
