/** SEO statique : titres, description, Open Graph, données structurées, sitemap et flux RSS. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { data, escapeHtml } from './stories.mjs';
import {configuredImages,globalImageFor} from './images.mjs';
const siteBase = (process.env.SITE_URL || 'https://histoires2dansmatete.fr').replace(/\/+$/, '');
const u = new URL(siteBase);
if (u.protocol !== 'https:' || u.pathname !== '/' || u.search || u.hash) throw new Error('SITE_URL doit être une origine HTTPS sans chemin (ex: https://podcast.exemple.fr).');
const site = u.origin;
const h=escapeHtml;
const stories=await data();
const globalLogo=await globalImageFor('logo',await configuredImages());
const general = {
 'index.html': {url:'/',title:'Histoires pour enfants à lire et bientôt à écouter | Dans ma tête',description:'Découvrez les histoires pour enfants de Dans ma tête : 13 aventures illustrées à lire en famille et bientôt à écouter en podcast.',type:'WebPage'},
 'histoires.html': {url:'/histoires.html',title:'Toutes les histoires pour enfants | Dans ma tête',description:'Une bibliothèque de 13 histoires illustrées à lire : animaux, amitié, confiance, courage et émotions. Les futurs épisodes audio de Dans ma tête.',type:'CollectionPage'},
 'ecouter.html': {url:'/ecouter.html',title:'Où écouter les podcasts pour enfants ? | Dans ma tête',description:'Retrouvez les prochaines histoires audio de Dans ma tête sur Spotify, Apple Podcasts, Deezer et Amazon Music. Histoires disponibles à lire dès maintenant.',type:'WebPage'},
 'qui-suis-je.html': {url:'/qui-suis-je.html',title:'Qui suis-je ? L’autrice des histoires de Dans ma tête',description:'Découvrez Griotte Lapone et l’univers des histoires inventées pour ses enfants, à lire ensemble et bientôt disponibles à écouter.',type:'AboutPage'},
 'confidentialite.html': {url:'/confidentialite.html',title:'Confidentialité | Les histoires de Dans ma tête',description:'Données et statistiques respectueuses de la vie privée sur le site des histoires de Dans ma tête.',type:'WebPage',noindex:true},
 '404.html': {url:'/404.html',title:'Page introuvable | Dans ma tête',description:'Cette page n’existe pas.',type:'WebPage',noindex:true}
};
const published=[];
const socials=['https://www.instagram.com/les_histoires_2_dans_ma_tete/','https://www.facebook.com/profile.php?id=61587115217827'];
const author={ '@type':'Person',name:'Griotte Lapone',sameAs:socials };
const publisher={ '@type':'Organization',name:'Les histoires de Dans ma tête',url:site+'/',sameAs:socials,logo:{'@type':'ImageObject',url:site+'/'+globalLogo}};
const entries = [...Object.entries(general).map(([filename,p])=>({filename,...p}))];
for (const s of stories) entries.push({filename:`histoires/${s.slug}/index.html`,url:`/histoires/${s.slug}/`, title:`${s.title}${s.subtitle?' — '+s.subtitle:''} | Histoire pour enfants`,description:s.description || `Lisez ${s.title}, une histoire pour enfants imaginée par Griotte Lapone.`,type:'Article',story:s,lastmod:s.modified||s.date});
for (const entry of entries){
 const file=resolve('site',entry.filename);
 let html=await readFile(file,'utf8');
 html=html.replace(/<!-- SEO-START -->[\s\S]*?<!-- SEO-END -->/g,'');
 // Nettoyer les anciennes meta OG et meta description (remplacées par les données correctes).
 html=html.replace(/<meta\s+(?:[^>]*?)(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'');
 const absolute=site+entry.url;
 const fullTitle=entry.title;
 const ogImage=entry.story?.image?.startsWith('assets/') ? site+'/'+entry.story.image : site+'/'+globalLogo;
 const seoJson=[
  {'@context':'https://schema.org','@type':'WebSite',name:'Les histoires de Dans ma tête',url:site+'/',inLanguage:'fr-FR',publisher},
  {'@context':'https://schema.org','@type':entry.type,name:entry.story?entry.story.title:fullTitle,headline:entry.story?entry.story.title:fullTitle,description:entry.description,url:absolute,inLanguage:'fr-FR',...(entry.story?{datePublished:entry.story.date,dateModified:entry.story.modified||entry.story.date,author,publisher,image:ogImage,mainEntityOfPage:absolute,genre:entry.story.tags||[],isAccessibleForFree:true}:{} )},
  {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:entry.story?[{'@type':'ListItem',position:1,name:'Accueil',item:site+'/'},{'@type':'ListItem',position:2,name:'Histoires',item:site+'/histoires.html'},{'@type':'ListItem',position:3,name:entry.story.title,item:absolute}]:[{'@type':'ListItem',position:1,name:'Accueil',item:site+'/'},{'@type':'ListItem',position:2,name:fullTitle,item:absolute}]}
 ];
 if(entry.story?.audioUrl)seoJson.push({'@context':'https://schema.org','@type':'PodcastEpisode',name:entry.story.title,url:absolute,description:entry.description,associatedMedia:{'@type':'MediaObject',contentUrl:entry.story.audioUrl},partOfSeries:{'@type':'PodcastSeries',name:'Les histoires de Dans ma tête'}});
 const metadata=`<!-- SEO-START -->\n<link rel="canonical" href="${h(absolute)}">\n<meta name="description" content="${h(entry.description)}">\n<meta name="robots" content="${entry.noindex?'noindex,nofollow':'index,follow,max-image-preview:large'}">\n<meta property="og:locale" content="fr_FR">\n<meta property="og:site_name" content="Les histoires de Dans ma tête">\n<meta property="og:type" content="${entry.story?'article':'website'}">\n<meta property="og:title" content="${h(fullTitle)}">\n<meta property="og:description" content="${h(entry.description)}">\n<meta property="og:url" content="${h(absolute)}">\n<meta property="og:image" content="${h(ogImage)}">\n<meta name="twitter:card" content="summary_large_image">\n<script type="application/ld+json">${JSON.stringify(seoJson).replace(/</g,'\\u003c')}</script>\n<!-- SEO-END -->`;
 html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${h(fullTitle)}</title>`);
 if (!html.includes('</head>')) throw Error(`Balise head manquante : ${entry.filename}`);
 html=html.replace('</head>',metadata+'\n</head>');
 await writeFile(file,html);
 if (!entry.noindex)published.push(entry);
}
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${published.map(p=>`  <url><loc>${h(site+p.url)}</loc>${p.lastmod?`<lastmod>${h(p.lastmod)}</lastmod>`:''}</url>`).join('\n')}\n</urlset>\n`;
await writeFile('site/sitemap.xml',sitemap);
await writeFile('site/robots.txt',`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${site}/sitemap.xml\n`);
const rss=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Les histoires de Dans ma tête</title><link>${h(site)}/</link><description>Histoires pour enfants à lire et bientôt à écouter</description><language>fr-FR</language>\n${stories.map(s=>`<item><title>${h(s.title+(s.subtitle?' — '+s.subtitle:''))}</title><link>${h(site+'/histoires/'+s.slug+'/')}</link><guid isPermaLink="true">${h(site+'/histoires/'+s.slug+'/')}</guid><description>${h(s.description)}</description><pubDate>${new Date(s.date+'T12:00:00Z').toUTCString()}</pubDate></item>`).join('\n')}\n</channel></rss>\n`;
await writeFile('site/histoires.xml',rss);
console.log(`✓ SEO : ${published.length} URL indexables, sitemap, RSS, JSON-LD et canonicals (${site})`);
