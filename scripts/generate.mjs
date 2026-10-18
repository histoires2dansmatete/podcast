import { data, writePublicStories } from './stories.mjs';
import { writeFile,readFile } from 'node:fs/promises';
import {configuredImages,globalImageFor} from './images.mjs';
const stories = await data();
await writePublicStories(stories);
await writeFile('site/data/histoires.json', JSON.stringify(stories,null,2)+'\n');
const withoutText = stories.filter(s=>!s.bodyHtml?.trim()).length;
if (withoutText) console.warn(`ℹ ${withoutText}/${stories.length} histoires sans texte importé : la fiche propose la lecture intégrale sur le blog. Lancez npm run sync:blog ou import:wordpress pour les intégrer.`);

// Met à jour les images globales à partir du même fichier de configuration.
const globalConfig=await configuredImages();
const globalLogo=await globalImageFor('logo',globalConfig);
const authorImage=await globalImageFor('author',globalConfig);
const swapImgSrc=(html,predicate,src)=>html.replace(/<img\b[^>]*>/g,tag=>predicate(tag)?tag.replace(/\bsrc="[^"]*"/,`src="${src}"`):tag);
for(const page of ['index.html','histoires.html','ecouter.html','qui-suis-je.html','confidentialite.html']){
 let html=await readFile('site/'+page,'utf8');
 html=swapImgSrc(html,tag=>/class="[^"]*\bbrand-logo\b/.test(tag),globalLogo);
 if(page==='index.html')html=html.replace(/(<div class="about-visual">[\s\S]*?<img\b[^>]*?)\bsrc="[^"]*"/,`$1src="${authorImage}"`);
 if(page==='qui-suis-je.html')html=html.replace(/(<div class="bio-image">[\s\S]*?<img\b[^>]*?)\bsrc="[^"]*"/,`$1src="${authorImage}"`);
 if(page==='ecouter.html')html=html.replace(/(<div class="listen-reading-art">[\s\S]*?<img\b[^>]*?)\bsrc="[^"]*"/,`$1src="${authorImage}"`);
 await writeFile('site/'+page,html);
}
