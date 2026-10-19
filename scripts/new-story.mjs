/** Création d'une histoire brouillon : npm run story:new -- --title "Mon histoire" */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readAllStories, slugOK } from './story-content.mjs';

const args = process.argv.slice(2);
const option = key => {const i=args.indexOf(`--${key}`);return i<0?'':args[i+1]||'';};
const title=option('title').trim();
const requested=option('slug');
const slug=requested || title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
if(!title || !slugOK(slug)){
 console.error('Usage : npm run story:new -- --title "Mon histoire" [--slug mon-histoire]');process.exit(1);
}
const existing=await readAllStories({includeDrafts:true});
if(existing.some(s=>s.slug===slug))throw Error(`Une histoire porte déjà cet identifiant : ${slug}`);
const dir=resolve('content/stories');
await mkdir(dir,{recursive:true});
const meta=resolve(dir,slug+'.json'), body=resolve(dir,slug+'.html');
for(const filename of [meta,body]) if(await access(filename).then(()=>true,()=>false))throw Error(`Fichier existant : ${filename}`);
const data={slug,title,subtitle:'',description:'Rédigez ici un résumé de cette nouvelle histoire.',tags:['Amitié'],theme:'Amitié',emoji:'📖',minutes:'',date:new Date().toISOString().slice(0,10),author:'Griotte Lapone',image:`assets/stories/${slug}.svg`,published:false};
// Ne pas lancer le build depuis cette commande : le nouveau récit est volontairement privé.
await writeFile(meta,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
await writeFile(body,'<p>Écrivez ici votre nouvelle histoire. Remplacez ce texte avant de la publier.</p>\n',{flag:'wx'});
const imagesFile=resolve('site/assets/images.config.json');
const images=JSON.parse(await readFile(imagesFile,'utf8'));
images.stories[slug]=`assets/images/${slug}.png`;
await writeFile(imagesFile,JSON.stringify(images,null,2)+'\n');
const audioFile=resolve('content/audio.config.json');
const audio=JSON.parse(await readFile(audioFile,'utf8'));
audio.stories[slug]={src:'',platforms:{}};
await writeFile(audioFile,JSON.stringify(audio,null,2)+'\n');
const svg=resolve('site/assets/stories',slug+'.svg');
const safeTitle=title.replace(/[<>&"']/g,'').slice(0,55);
await writeFile(svg,`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#f6e9dc"/><circle cx="300" cy="310" r="175" fill="#e8cada"/><text x="300" y="340" text-anchor="middle" font-size="100">✦</text><text x="300" y="570" fill="#5b3052" text-anchor="middle" font-family="Arial, sans-serif" font-size="24">Les histoires de Dans ma tête</text><title>${safeTitle}</title></svg>`,{flag:'wx'});
console.log(`✓ Histoire créée en BROUILLON : ${slug}\n  - content/stories/${slug}.json (métadonnées + published)\n  - content/stories/${slug}.html (texte intégral)\n  - site/assets/images.config.json (illustration)\n  - content/audio.config.json (MP3 et plateformes)\nPour publier : renseigner le texte, les informations, passer published à true et lancer npm run build.`);
