/**
 * Synchronisation du blog dont l'utilisateur est propriétaire.
 * Usage : npm run sync:blog (requiert une connexion Internet).
 * REST WordPress, archives HTML puis récupération des articles individuels.
 * L'import WordPress XML reste le chemin le plus fiable si le site bloque l'accès automatisé.
 */
import { writeFile } from 'node:fs/promises';
import { data, writePublicStories, sanitizeStoryHTML } from './stories.mjs';
const base='https://histoires2dansmatete.fr';
const decode=s=>String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo|eacute|agrave|ecirc|uuml);/gi,(whole,key)=>{
 const codes={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',eacute:'é',agrave:'à',ecirc:'ê',uuml:'ü'};
 if(key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2),16));
 if(key.startsWith('#'))return String.fromCodePoint(Number(key.slice(1)));
 return codes[key.toLowerCase()]||whole;
});
const cleanText=html=>decode(String(html||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const slugOf=url=>{try{return new URL(url).pathname.split('/').filter(Boolean).at(-1)}catch{return ''}};
const validLink=url=>{try{const u=new URL(url,base);return u.origin===base&&/^\/[a-z0-9-]+\/$/.test(u.pathname)?u.href:''}catch{return ''}};
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0 (compatible; DansMaTeteOwnBlogSync/3.0)'}});if(!r.ok)throw Error(`HTTP ${r.status} : ${url}`);return r;}
async function rest(){
 const posts=[];
 for(let page=1;page<=12;page++){
  const r=await get(`${base}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed`);
  const list=await r.json();if(!Array.isArray(list))throw Error('Réponse WordPress inhabituelle');posts.push(...list);
  if(page>=Number(r.headers.get('X-WP-TotalPages')||1)||list.length<100)break;
 }
 return posts.filter(p=>p.status==='publish').map(p=>({slug:slugOf(p.link),title:cleanText(p.title?.rendered),subtitle:'',description:cleanText(p.excerpt?.rendered).slice(0,205),source:p.link,image:p._embedded?.['wp:featuredmedia']?.[0]?.source_url||'',theme:(p._embedded?.['wp:term']||[]).flat().filter(t=>t.taxonomy==='post_tag').map(t=>t.name).join(' & ')||'Histoires',minutes:'',date:(p.date||'').slice(0,10),emoji:'📖',bodyHtml:sanitizeStoryHTML(p.content?.rendered||'')}));
}
function extractWrapper(markup,tagPattern){
 const at=markup.search(tagPattern);if(at<0)return '';
 const start=markup.lastIndexOf('<',at);if(start<0)return '';
 const opening=markup.slice(start).match(/^<(div|article|section)\b[^>]*>/i);if(!opening)return '';
 const tag=opening[1].toLowerCase(),begin=start+opening[0].length;
 let depth=1;const tags=new RegExp(`<\\/?${tag}\\b[^>]*>`,'gi');tags.lastIndex=begin;let m;
 while((m=tags.exec(markup))){if(m[0][1]==='/')depth--;else depth++;if(depth===0)return markup.slice(begin,m.index)}
 return '';
}
/** Retourne uniquement le contenu de l'article, jamais les commentaires ou le pied de page. */
export function extractArticleHTML(html){
 const candidates=[
 /class=["'][^"']*\bentry-content\b[^"']*["']/i,
 /class=["'][^"']*\bwp-block-post-content\b[^"']*["']/i,
 /class=["'][^"']*\bpost-content\b[^"']*["']/i,
 /class=["'][^"']*\bsingle-content\b[^"']*["']/i,
 /class=["'][^"']*\barticle-content\b[^"']*["']/i
 ];
 let best='';
 for(const pattern of candidates){const text=extractWrapper(html,pattern);if(text.length>best.length)best=text;}
 if(best.length<350){best=extractWrapper(html,/<article\b/i)||'';best=best.split(/<footer\b|<div\b[^>]*class=["'][^"']*(?:entry-footer|post-footer|comments-area)/i)[0];}
 const cleaned=sanitizeStoryHTML(best);
 // Ignore des fragments qui ne sont manifestement pas une histoire.
 return cleanText(cleaned).length>=230?cleaned:'';
}
async function discoverArchives(){
 const urls=[];
 for(let page=1;page<=5;page++){
  const path=page===1?`${base}/`:`${base}/page/${page}/`;
  let html;try{html=await (await get(path)).text()}catch(e){console.warn(`Archive page ${page} : ${e.message}`);break;}
  const found=[...html.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].flatMap(m=>{
   const inner=m[1];const anchor=inner.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
   if(!anchor)return [];
   const url=validLink(anchor[1]);
   if(!url)return [];
   return [{slug:slugOf(url),title:cleanText(anchor[2]),source:url}];
  });
  for(const item of found)if(item.slug && !urls.some(x=>x.slug===item.slug))urls.push(item);
  // 10 billets sur la première page, puis généralement le reste : on arrête sur la dernière.
  if(found.length<10)break;
 }
 return urls;
}
async function oneArticle(record){
 const html=await (await get(record.source)).text();
 const bodyHtml=extractArticleHTML(html);
 if(!bodyHtml)throw Error('Contenu non identifié dans le HTML');
 const h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
 const title=cleanText(h1?.[1]||record.title);
 const image=html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i)?.[1]||'';
 return {...record,title:title||record.title,image:record.image||decode(image),description:record.description||cleanText(bodyHtml).slice(0,195),bodyHtml};
}
const previous=await data();const records=new Map(previous.map(s=>[s.slug,s]));
let results=[];let used='';
try{results=await rest();if(!results.length)throw Error('Aucun article');used='API WordPress';}
catch(e){console.warn(`API WordPress inaccessible : ${e.message}`);}
let archived=[];
try{archived=await discoverArchives();console.log(`Archives HTML : ${archived.length} histoires repérées.`);}catch(e){console.warn(`Archives : ${e.message}`);}
const combined=[...results,...archived];
for(const post of combined){if(!post.slug||!post.title)continue;
 const old=records.get(post.slug)||{};
 records.set(post.slug,{...post,...old,slug:post.slug,title:old.title||post.title,source:post.source,description:old.description||post.description||'',bodyHtml:post.bodyHtml||old.bodyHtml||'',image:old.image||post.image||'',theme:old.theme||post.theme||'Histoires'});
}
let imported=0;let failed=0;
for(const [slug,story] of records){
 if(story.bodyHtml?.length>300)continue;
 try{const updated=await oneArticle(story);records.set(slug,updated);imported++;console.log(`  ✓ Texte : ${updated.title}`);}
 catch(err){failed++;console.warn(`  ! ${slug} : ${err.message}`);}
}
const all=[...records.values()];const ready=all.filter(s=>cleanText(s.bodyHtml).length>220).length;
if(!ready){console.error('Impossible d’importer les récits automatiquement. Essayez Outils → Exporter → Articles dans WordPress puis npm run import:wordpress -- export.xml. Catalogue conservé.');process.exit(1);}
await writeFile('site/data/histoires.json',JSON.stringify(all,null,2)+'\n');
await writePublicStories(all);
console.log(`✓ Synchronisation ${used||'HTML'} : ${all.length} histoires, ${ready} textes complets, ${failed} récupérations en échec.`);
if(ready<all.length)console.warn('Certains textes manquent encore. Export WordPress recommandé pour une reprise intégrale.');
if(all.length<13)console.warn('Le blog indiquait 13 histoires. La deuxième page des archives ou un export XML pourra compléter la collection.');
