/** Construction déterministe du carrousel depuis son catalogue éditorial. */
import {readFile} from 'node:fs/promises';
import {escapeHtml} from './stories.mjs';

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorPattern=/^#[0-9a-fA-F]{6}$/;
const sound='<span aria-hidden="true" class="cover-sound"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>';

export function isPodcastAvailable(story){
  return Boolean(story.audioUrl || Object.values(story.platforms||{}).some(Boolean));
}

export function validateCarouselConfig(config,stories){
  if(!config||typeof config!=='object'||Array.isArray(config))throw Error('Carrousel : configuration invalide');
  if(!Number.isFinite(config.rotationSeconds)||config.rotationSeconds<2||config.rotationSeconds>30)throw Error('Carrousel : rotationSeconds doit être entre 2 et 30');
  if(!Array.isArray(config.stories)||config.stories.length<1||config.stories.length>12)throw Error('Carrousel : choisir entre 1 et 12 histoires');
  const published=new Set(stories.map(s=>s.slug));
  const seen=new Set();
  for(const entry of config.stories){
    if(!entry||typeof entry!=='object'||Array.isArray(entry)||!slugPattern.test(entry.slug||''))throw Error('Carrousel : entrée ou slug invalide');
    if(seen.has(entry.slug))throw Error(`Carrousel : histoire en doublon (${entry.slug})`);
    seen.add(entry.slug);
    if(!published.has(entry.slug))throw Error(`Carrousel : histoire absente ou en brouillon (${entry.slug})`);
    if(entry.label!==undefined && (typeof entry.label!=='string'||!entry.label.trim()||entry.label.length>60))throw Error(`Carrousel : label incorrect pour ${entry.slug}`);
    if(entry.color!==undefined && (typeof entry.color!=='string'||!colorPattern.test(entry.color)))throw Error(`Carrousel : couleur incorrecte pour ${entry.slug}`);
  }
  return config;
}

const text=v=>escapeHtml(v);
export function renderCarousel(config,stories){
  validateCarouselConfig(config,stories);
  const bySlug=new Map(stories.map(s=>[s.slug,s]));
  return config.stories.map((entry,index)=>{
    const s=bySlug.get(entry.slug);
    const available=isPodcastAvailable(s);
    const status=available?'available':'upcoming';
    const label=available?'Podcast disponible':'Podcast à venir';
    const footnote=available?'DÉJÀ À ÉCOUTER':'À LIRE, BIENTÔT À ÉCOUTER';
    const coverTitle=entry.label||s.subtitle||s.title;
    const fallback=`assets/stories/${s.slug}.svg`;
    const image=s.image||fallback;
    return `<div aria-label="${text(s.title)} — ${label}" class="cover-card ${index===0?'cover-card-active':'cover-card-stacked'}" data-cover="${index}" data-story-slug="${text(s.slug)}" data-podcast-status="${status}" style="--cover-color:${entry.color||'#674871'};">
<div class="cover-top"><span>LES HISTOIRES DE</span>${sound}</div>
<div class="cover-image-wrap"><img alt="Illustration de ${text(s.title)}" class="cover-image" data-fallback="${text(fallback)}" ${index===0?'fetchpriority="high"':'loading="lazy"'} src="${text(image)}"/><span class="cover-status cover-status-${status}">${available?'♫':'◷'} ${label}</span></div>
<div class="cover-bottom"><span>${text(coverTitle)}</span><span aria-hidden="true" class="cover-headphones">♫</span></div>
<div class="cover-footnote">${footnote}</div>
</div>`;
  }).join('\n');
}

/** Entre deux marqueurs stables : aucun doublon après une seconde génération. */
export function insertCarousel(html,config,stories){
 const start='<!-- CAROUSEL-START -->',end='<!-- CAROUSEL-END -->';
 const a=html.indexOf(start),b=html.indexOf(end);
 if(a<0||b<a||html.indexOf(start,a+1)!==-1||html.indexOf(end,b+1)!==-1)throw Error('Carrousel : marqueurs HTML absents ou dupliqués');
 const first=isPodcastAvailable(stories.find(s=>s.slug===config.stories[0].slug));
 const markup=renderCarousel(config,stories);
 let result=html.slice(0,a+start.length)+'\n'+markup+'\n'+html.slice(b);
 result=result.replace(/(<div\s+aria-label=")[^"]*("\s+class="floating-sticker")/g,`$1${first?'Un podcast est disponible':'Le podcast arrive bientôt'}$2`);
 result=result.replace(/(<div[^>]*class="floating-sticker"[^>]*>\s*<span>)[^<]*(<\/span>\s*<strong>)[^<]*(<\/strong>)/,`$1${first?'À écouter':'Le podcast'}$2${first?'ici !':'arrive !'}$3`);
 result=result.replace(/(<div aria-label="Faire défiler les couvertures" class="cover-controls"[^>]*>)/,`<div aria-label="Faire défiler les couvertures" class="cover-controls" data-rotation-ms="${Math.round(config.rotationSeconds*1000)}"${config.stories.length===1?' hidden':''}>`);
 result=result.replace(/(<span aria-live="polite" class="cover-index">)[^<]*(<\/span>)/,`$1${config.stories.length?'1 / '+config.stories.length:'0 / 0'}$2`);
 return result;
}

export async function generateCarousel(html,stories,filename='content/carousel.config.json'){
 const config=JSON.parse(await readFile(filename,'utf8'));
 return insertCarousel(html,config,stories);
}
