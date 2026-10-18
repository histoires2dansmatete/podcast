/** Préparation des fiches : jamais exposées publiquement sans accord explicite. */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

export const escapeHtml = (value='') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safeURL = url => { try { const u=new URL(url);return u.protocol==='https:'?u.href:''; } catch {return '';} };
const safeSlug = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
export async function data(){
 const stories=JSON.parse(await readFile(resolve('site/data/histoires.json'),'utf8'));
 if (!Array.isArray(stories)) throw Error('Catalogue invalide');
 if (stories.some(s=>!safeSlug(s.slug))) throw Error('Un slug contient un caractère invalide');
 if (new Set(stories.map(s=>s.slug)).size!==stories.length) throw Error('Slugs dupliqués');
 return stories;
}
/** On utilise uniquement les balises inoffensives dans l'HTML éditorial du blog personnel. */
export function sanitizeStoryHTML(raw){
 return String(raw||'')
 .replace(/<!--[\s\S]*?-->/g,'')
 .replace(/<(script|style|iframe|object|svg|form|video|audio|button)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
 .replace(/<\/?(?!p\b|br\b|strong\b|em\b|b\b|i\b|ul\b|ol\b|li\b|blockquote\b|h2\b|h3\b|h4\b)[a-z][^>]*>/gi,'')
 .replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (whole,tag)=>['p','br','strong','em','b','i','ul','ol','li','blockquote','h2','h3','h4'].includes(tag.toLowerCase()) ? `<${tag.toLowerCase()}>` : '')
 .replace(/<\s*(?:p|h2|h3|h4|blockquote)\s*>\s*<\/\s*(?:p|h2|h3|h4|blockquote)\s*>/gi,'')
 .trim();
}
export function renderStory(story,publicPage=false){
 const h=escapeHtml;
 // Local draft location: brouillons/histoires/slug/index.html ; on peut l'ouvrir directement.
 const assets= publicPage ? '../../assets/' : '../../../site/assets/';
 const home= publicPage ? '../../index.html' : '../../../site/index.html';
 const catalogue=publicPage?'../../histoires.html':'../../../site/histoires.html';
 const source=safeURL(story.source)||'https://histoires2dansmatete.fr/';
 const image=safeURL(story.image);
 const body=story.bodyHtml?sanitizeStoryHTML(story.bodyHtml):`<p>Cette histoire existe sur le blog d’origine. Son texte complet pourra être importé en exécutant <code>npm run sync:blog</code> depuis votre ordinateur.</p>`;
 const title=h(story.title);
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#faf7ef"><meta name="robots" content="${publicPage?'index,follow':'noindex,nofollow'}"><title>${title} — Les histoires de « Dans ma tête »</title><meta name="description" content="${h(story.description)}"><link rel="icon" href="${assets}favicon.ico"><link rel="stylesheet" href="${assets}style.css"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet"></head><body><div class="announcement">✳ Les histoires de « Dans ma tête » ✳</div><header class="site-header"><div class="container header-inner"><a href="${home}" class="brand"><img src="${assets}logo.webp" alt="" class="brand-logo" width="56" height="56"><span class="brand-copy"><span class="brand-small">Les histoires de</span><strong>Dans ma tête<span class="brand-period">.</span></strong></span></a><nav class="story-page-nav"><a href="${catalogue}">← Toutes les histoires</a></nav></div></header><main class="draft-story"><div class="container"><a class="draft-breadcrumb" href="${catalogue}">La bibliothèque <span>›</span> ${title}</a><div class="draft-article"><div class="section-kicker">✶ ${h(story.theme||'UNE BELLE HISTOIRE')}</div><h1>${title}</h1>${story.subtitle?`<p class="draft-subtitle">${h(story.subtitle)}</p>`:''}<p class="draft-lead">${h(story.description)}</p><div class="draft-image">${image?`<img src="${h(image)}" alt="Illustration de ${title}" loading="lazy">`:`<span aria-hidden="true">${h(story.emoji||'✳')}</span>`}</div><div class="draft-text">${body}</div><div class="draft-audio"><span aria-hidden="true">♫</span><strong>Le podcast arrive bientôt</strong><p>Cette histoire n’est pas encore disponible en version audio.</p></div><a href="${h(source)}" target="_blank" rel="noopener noreferrer" class="button button-outline">Lire sur le blog d’origine ↗</a></div></div></main><footer class="site-footer"><div class="container footer-bottom">© Les histoires de « Dans ma tête » — Tous droits réservés.</div></footer></body></html>`;
}
export async function writeDrafts(stories){
 const target=resolve('brouillons/histoires');
 await rm(target,{recursive:true,force:true});
 for(const s of stories){const dir=join(target,s.slug);await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),renderStory(s,false));}
 console.log(`✓ ${stories.length} fiches privées disponibles dans brouillons/histoires/ (non déployées).`);
}
export async function writePublicStories(stories){
 const target=resolve('dist/histoires');
 for(const s of stories){const dir=join(target,s.slug);await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),renderStory(s,true));}
 console.log(`✓ ${stories.length} pages individuelles publiées.`);
}
