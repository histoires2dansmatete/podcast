import {writeChristmas} from './christmas.mjs';
import { data, writePublicStories } from './stories.mjs';
import { writeFile,readFile } from 'node:fs/promises';
import {configuredImages,globalImageFor} from './images.mjs';
import {applySocialLayout} from './layout.mjs';
import {generateCarousel} from './carousel.mjs';
import {applyPodcastCopy} from './podcast-copy.mjs';
const stories = await data();
await writePublicStories(stories);
await writeFile('site/data/histoires.json', JSON.stringify(stories,null,2)+'\n');
const withoutText = stories.filter(s=>!s.bodyHtml?.trim()).length;
if (withoutText) console.warn(`ℹ ${withoutText}/${stories.length} histoires sans texte importé : vérifiez le corpus WordPress puis relancez npm run import:wordpress pour les intégrer.`);

// Les différentes illustrations de présentation sont indépendantes dans le JSON.
const globalConfig=await configuredImages();
const globalLogo=await globalImageFor('logo',globalConfig);
const aboutImage=await globalImageFor('aboutVisual',globalConfig);
const bioImage=await globalImageFor('bioImage',globalConfig);
const listenImage=await globalImageFor('listenArt',globalConfig);
function imageInBlock(html,className,src){
 const pattern=new RegExp(`(<div\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<img\\b[^>]*?)\\bsrc="[^"]*"`);
 // Les pages existantes possèdent un unique bloc par classe.
 const changed=html.replace(pattern,`$1src="${src}"`);
 if(changed===html && !html.includes(`src="${src}"`))throw Error(`Image du bloc ${className} introuvable`);
 return changed;
}
const pages=['index.html','histoires.html','ecouter.html','qui-suis-je.html','confidentialite.html'];
for(const page of pages){
 let html=await readFile('site/'+page,'utf8');
 html=html.replace(/<img\b[^>]*class="[^"]*\bbrand-logo\b[^"]*"[^>]*>/g,tag=>tag.replace(/\bsrc="[^"]*"/,`src="${globalLogo}"`));
 if(page==='index.html'){html=imageInBlock(html,'about-visual',aboutImage);html=await generateCarousel(html,stories);}
 if(page==='qui-suis-je.html')html=imageInBlock(html,'bio-image',bioImage);
 if(page==='ecouter.html')html=imageInBlock(html,'listen-reading-art',listenImage);
 html=applyPodcastCopy(html,stories,page);
 html=applySocialLayout(html,'');
 await writeFile('site/'+page,html);
}
// Les fiches sont régénérées à chaque construction : le même habillage leur est appliqué.
for(const story of stories){
 const file=`site/histoires/${story.slug}/index.html`;
 await writeFile(file,applySocialLayout(await readFile(file,'utf8'),'../../'));
}

await writeChristmas();
console.log('✓ Calendrier de Noël : 25 cases et MP3 configurables.');
