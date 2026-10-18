/** Génération de pages d'histoires statiques, publiées par Cloudflare Pages. */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { configuredImages, imageFor, globalImageFor } from './images.mjs';

export const escapeHtml = (value='') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safeSlug = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const safeURL = url => {try{const x=new URL(url);return x.protocol==='https:'?x.href:'';}catch{return '';}};
const safeMedia = value => {
  const url = String(value || '').trim();
  if (url.startsWith('assets/audio/') && /^assets\/audio\/[a-zA-Z0-9_-]+\.(mp3|m4a|ogg)$/i.test(url)) return `../../${url}`;
  return safeURL(url);
};
export async function data(){
 const stories=JSON.parse(await readFile(resolve('site/data/histoires.json'),'utf8'));
 if(!Array.isArray(stories))throw Error('Catalogue invalide');
 if(stories.some(s=>!safeSlug(s.slug)))throw Error('Un identifiant d’histoire contient un caractère invalide');
 if(new Set(stories.map(s=>s.slug)).size!==stories.length)throw Error('Identifiants en double');
 const config=await configuredImages();
 for(const story of stories)story.image=await imageFor(story,config);
 return stories;
}
/** Pas de HTML actif : uniquement la typographie et les paragraphes du récit. */
export function sanitizeStoryHTML(raw){
 const prepared=String(raw||'').replace(/<img[^>]*>/gi,'');
 const cleaned=prepared
 .replace(/<!--[\s\S]*?-->/g,'')
 .replace(/<(script|style|iframe|object|svg|form|video|audio|button|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
 .replace(/<\/?(?!p\b|br\b|strong\b|em\b|b\b|i\b|ul\b|ol\b|li\b|blockquote\b|h2\b|h3\b|h4\b)[a-z][^>]*>/gi,'')
 .replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (whole,tag)=>['p','br','strong','em','b','i','ul','ol','li','blockquote','h2','h3','h4'].includes(tag.toLowerCase()) ? `<${tag.toLowerCase()}>` : '')
 .replace(/<\s*(?:p|h2|h3|h4|blockquote)\s*>\s*<\/\s*(?:p|h2|h3|h4|blockquote)\s*>/gi,'')
 .trim();
 return cleaned;
}
const platformNames = {spotify:'Spotify',apple:'Apple Podcasts',deezer:'Deezer',amazon:'Amazon Music'};
const platformIcons = {spotify:'spotify.svg',apple:'apple-podcasts.svg',deezer:'deezer.svg',amazon:'amazon.svg'};
const plural = (n, one, many) => `${n} ${n>1?many:one}`;

function socialFooter(prefix){return `<nav class="social-links" aria-label="Réseaux sociaux"><a href="https://www.instagram.com/les_histoires_2_dans_ma_tete/" target="_blank" rel="noopener noreferrer" aria-label="Les histoires de Dans ma tête sur Instagram"><img src="${prefix}assets/icons/instagram.svg" alt="" aria-hidden="true"> Instagram</a><a href="https://www.facebook.com/profile.php?id=61587115217827" target="_blank" rel="noopener noreferrer" aria-label="Les histoires de Dans ma tête sur Facebook"><img src="${prefix}assets/icons/facebook.svg" alt="" aria-hidden="true"> Facebook</a></nav>`}
export function renderStory(story,index,all){
 const h=escapeHtml;
 const title=h(story.title||'Histoire');
 const subtitle=story.subtitle ? `<p class="episode-subtitle">${h(story.subtitle)}</p>`:'';
 const image= /^assets\/(?:stories|images)\/[a-zA-Z0-9_.-]+\.(?:svg|png|jpe?g|webp|avif)$/i.test(story.image||'') ? '../../'+story.image : safeURL(story.image);
 const body= sanitizeStoryHTML(story.bodyHtml);
 const audio=safeMedia(story.audioUrl);
 const showReady= Boolean(audio);
 const minutes=story.minutes ? `<span>◷ ${h(story.minutes)}</span>`:'';
 const altTitle=story.subtitle?`${title} — ${h(story.subtitle)}`:title;
 const pageURL=`../../histoires.html`;
 const prev=all[(index - 1 + all.length)%all.length], next=all[(index + 1)%all.length];
 const platforms=Object.entries(platformNames).map(([key,name])=>{
  const u=safeURL(story.platforms?.[key]);
  return `<a class="episode-platform ${u?'episode-platform-ready':''}" data-platform="${key}" ${u?`href="${h(u)}" target="_blank" rel="noopener noreferrer"`:'aria-disabled="true"'}><span class="episode-platform-mark" aria-hidden="true"><img src="../../assets/icons/${platformIcons[key]}" alt="" loading="lazy"></span><span>${name}</span><span class="platform-status">${u?'Écouter ↗':'À venir'}</span></a>`;
 }).join('');
 const reader=body
 ? `<div class="reading-body">${body}</div>`
 : `<div class="reading-pending"><h3>Histoire bientôt disponible.</h3><p>Ce récit sera publié prochainement.</p></div>`;
 const player=showReady
 ? `<div class="episode-player"><div class="player-mark" aria-hidden="true">♫</div><div class="player-copy"><strong>L’épisode à écouter</strong><span>Appuyez sur Lecture pour commencer l’histoire.</span></div><audio controls preload="none" src="${h(audio)}">Votre navigateur ne permet pas de lire ce fichier audio.</audio></div>`
 : `<div class="episode-player episode-player-waiting"><div class="player-mark" aria-hidden="true">♫</div><div class="player-copy"><strong>Bientôt dans vos oreilles</strong><span>La version audio n’est pas encore publiée. Découvrez le récit ci-dessous en attendant.</span></div><div class="player-pill">En préparation</div></div>`;
 const illustration=image ? `<img src="${h(image)}" alt="Illustration de ${title}" loading="eager" data-episode-image="true"><span class="episode-visual-emoji" hidden>${h(story.emoji||'✦')}</span>` : `<span class="episode-visual-emoji">${h(story.emoji||'✦')}</span>`;
 return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#faf7ef"><meta name="robots" content="index,follow"><meta name="description" content="${h(story.description||'Découvrez cette histoire pour enfants, à lire et bientôt à écouter.')}"><meta property="og:title" content="${altTitle} — Dans ma tête"><meta property="og:type" content="article"><title>${altTitle} — Les histoires de « Dans ma tête »</title><link rel="icon" href="../../assets/favicon.ico"><link rel="apple-touch-icon" href="../../assets/favicon-180.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet"><link rel="stylesheet" href="../../assets/style.css"><script defer src="../../config.js"></script><script defer src="../../assets/main.js"></script><script defer src="../../assets/analytics.js"></script></head>
<body><a class="skip-link" href="#contenu">Aller au contenu</a><div class="announcement"><span>✳</span> Des histoires à lire… et bientôt à écouter <span>✳</span></div>
<header class="site-header"><div class="container header-inner"><a class="brand" href="../../index.html" aria-label="Accueil — Dans ma tête"><img class="brand-logo" src="../../assets/logo.webp" alt="" width="56" height="56"><span class="brand-copy"><span class="brand-small">Les histoires de</span><strong>Dans ma tête<span class="brand-period">.</span></strong></span></a><button class="menu-toggle" type="button" aria-controls="primary-nav" aria-expanded="false" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button><nav class="primary-nav" id="primary-nav" aria-label="Navigation principale"><a href="../../index.html#univers">L’univers</a><a href="${pageURL}">Toutes les histoires</a><a href="../../ecouter.html">Où écouter ?</a><a href="../../qui-suis-je.html">Qui suis-je ?</a></nav></div></header>
<main id="contenu"><section class="episode-hero"><div class="container"><nav class="episode-breadcrumb" aria-label="Fil d’Ariane"><a href="../../index.html">Accueil</a><span>›</span><a href="${pageURL}">Les histoires</a><span>›</span><span aria-current="page">${title}</span></nav><div class="episode-hero-grid"><div class="episode-hero-copy"><span class="section-kicker">✦ UNE HISTOIRE DE DANS MA TÊTE</span><h1>${title}</h1>${subtitle}<p class="episode-intro">${h(story.description||'Un nouveau monde à découvrir.')}</p><div class="episode-metadata"><span>${h(story.theme||'Une jolie aventure')}</span>${minutes}</div><div class="episode-cta"><a class="button button-primary" href="#lecture">Lire cette histoire ↓</a><a class="button button-outline" href="#audio">${showReady?'Écouter l’épisode ♫':'Le podcast arrive ♫'}</a></div></div><div class="episode-visual">${illustration}<span class="episode-visual-tag">LES HISTOIRES DE DANS MA TÊTE ✳</span></div></div></div></section>
<section class="episode-audio" id="audio"><div class="container"><div class="section-kicker">✳ LE PODCAST</div><h2>À écouter <em>en famille</em></h2>${player}<div class="episode-platforms"><h3>Retrouvez aussi le podcast sur vos plateformes</h3><div class="episode-platform-grid">${platforms}</div><p class="episode-platform-note">Les liens de chaque épisode s’activeront après publication. Vous pouvez aussi consulter la <a href="../../ecouter.html">page « Où écouter ? »</a>.</p></div></div></section>
<section class="reading-section" id="lecture"><div class="container"><div class="reading-heading"><div><div class="section-kicker">✶ PLACE À L’IMAGINATION</div><h2>L’histoire <em>à lire</em></h2><p>Installez-vous confortablement… il était une fois !</p></div><span aria-hidden="true">❦</span></div><article class="reading-paper" aria-label="Texte intégral de l’histoire ${title}">${reader}${body?`<div class="reading-end" aria-hidden="true">✳ &nbsp; ✳ &nbsp; ✳</div>`:''}</article><div class="reading-source">Texte © Les histoires de « Dans ma tête » — Tous droits réservés.</div></div></section>
<section class="episode-more"><div class="container"><div class="section-kicker">✳ POUR CONTINUER À RÊVER</div><h2>Encore une <em>petite histoire ?</em></h2><div class="episode-neighbors"><a href="../${h(prev.slug)}/"><span>← Une autre aventure</span><strong>${h(prev.title)}</strong></a><a href="../${h(next.slug)}/"><span>Une autre aventure →</span><strong>${h(next.title)}</strong></a></div><a class="all-episodes" href="${pageURL}">Voir toutes les histoires ↗</a></div></section></main>
<footer class="site-footer"><div class="container footer-top"><a class="brand footer-brand" href="../../index.html"><img class="brand-logo" src="../../assets/logo.webp" alt="" width="45" height="45"><span class="brand-copy"><span class="brand-small">Les histoires de</span><strong>Dans ma tête<span class="brand-period">.</span></strong></span></a><p>Des histoires inventées avec le cœur,<br>à lire aujourd’hui et bientôt à écouter.</p><nav class="footer-nav" aria-label="Liens utiles"><a href="${pageURL}">Toutes les histoires</a><a href="../../ecouter.html">Où écouter ?</a><a href="../../qui-suis-je.html">Qui suis-je ?</a><a href="../../confidentialite.html">Confidentialité</a></nav>${socialFooter("../../")}</div><div class="container footer-bottom">© 2026 Les histoires de « Dans ma tête » — Tous droits réservés.</div></footer></body></html>`;
}
export async function writePublicStories(stories){
 const cfg=await configuredImages();const globalLogo=await globalImageFor('logo',cfg);
 const target=resolve('site/histoires');
 await rm(target,{recursive:true,force:true});
 for(const [i,story] of stories.entries()){
  const dir=join(target,story.slug);await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),renderStory(story,i,stories).replaceAll('../../assets/logo.webp','../../'+globalLogo));
 }
 console.log(`✓ ${plural(stories.length,'fiche podcast publique','fiches podcast publiques')} générées dans site/histoires/.`);
}
// Alias pour compatibilité avec les anciennes commandes.
export const writeDrafts = writePublicStories;
