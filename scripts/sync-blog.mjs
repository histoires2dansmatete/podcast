/** Synchronise toutes les histoires du blog propriétaire vers le catalogue local.
 * Lancement MANUEL : npm run sync:blog
 * WordPress REST API prioritaire. Fallback RSS si l'API est désactivée.
 * Aucun accès réseau au moment de npm run build sur Cloudflare.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { data, writeDrafts, sanitizeStoryHTML } from './stories.mjs';
const base='https://histoires2dansmatete.fr';
const decode= str=>String(str||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|eacute|agrave|ecirc|uuml);/gi,(all,key)=>{const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',eacute:'é',agrave:'à',ecirc:'ê',uuml:'ü'};if(key.startsWith('#x'))return String.fromCodePoint(parseInt(key.slice(2),16));if(key.startsWith('#'))return String.fromCodePoint(Number(key.slice(1)));return named[key.toLowerCase()]||all;});
const text= html=>decode(String(html||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const slug= url=>new URL(url).pathname.split('/').filter(Boolean).at(-1);
const get = async url => {const response=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'DansMaTeteSiteSync/1.0 (+site owner)'}});if(!response.ok)throw Error(`HTTP ${response.status} : ${url}`);return response;};
async function rest(){
  const posts=[];
  for(let page=1;page<=12;page++){
    const u=`${base}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed`;
    const r=await get(u);const list=await r.json();if(!Array.isArray(list))throw Error('Réponse WordPress inhabituelle');
    posts.push(...list);
    if(page>=Number(r.headers.get('X-WP-TotalPages')||1)||list.length<100)break;
  }
  return posts.map(p=>({slug:slug(p.link),title:text(p.title?.rendered),subtitle:'',description:text(p.excerpt?.rendered).slice(0,205),source:p.link,image:p._embedded?.['wp:featuredmedia']?.[0]?.source_url||'',theme:(p._embedded?.['wp:term']||[]).flat().filter(t=>t.taxonomy==='post_tag').map(t=>t.name).join(' & ')||'Histoires',minutes:'',date:(p.date||'').slice(0,10),emoji:'📖',bodyHtml:sanitizeStoryHTML(p.content?.rendered||'')}));
}
const xmlTag=(xml,tag)=>{const escape=tag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=xml.match(new RegExp(`<${escape}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escape}>`,'i'));return m?.[1]||'';};
async function rss(){
 let results=[];
 // WordPress feed standard : 10 billets par défaut. Plusieurs pages si disponibles.
 for(let page=1;page<=12;page++){
   const url=page===1?`${base}/feed/`:`${base}/feed/?paged=${page}`;
   const source=await (await get(url)).text();
   const matches=[...source.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);
   if(!matches.length)break;
   let batch=matches.map(x=>({slug:slug(text(xmlTag(x,'link'))),title:text(xmlTag(x,'title')),subtitle:'',description:text(xmlTag(x,'description')).slice(0,205),source:text(xmlTag(x,'link')),image:'',theme:'Histoires',minutes:'',date:'',emoji:'📖',bodyHtml:sanitizeStoryHTML(decode(xmlTag(x,'content:encoded')))}));
   let inserted=0; for(const p of batch) if(!results.some(x=>x.slug===p.slug)){results.push(p);inserted++;}
   if(!inserted||matches.length<10)break;
 }
 return results;
}
const previous=await data();let incoming=[];let source='WordPress REST';
try{incoming=await rest();if(!incoming.length)throw Error('Aucun post retourné');}
catch(err){console.warn('WordPress REST indisponible :',err.message,'— essai du flux RSS.');source='RSS';try{incoming=await rss();}catch(error){console.error('Échec RSS :',error.message);}}
if(!incoming.length){console.error('Aucune histoire récupérée. Catalogue conservé sans modification. Vérifier les URL et la disponibilité du blog.');process.exitCode=1;}
else{
  const records=new Map(previous.map(s=>[s.slug,s]));
  for(const story of incoming){ if(!story.slug||!story.title)continue;
    const old=records.get(story.slug)||{};
    // Conserver descriptions soignées & illustrations préremplies si l'API n'en renvoie pas.
    records.set(story.slug,{...story,...old,title:story.title,source:story.source,bodyHtml:story.bodyHtml||old.bodyHtml||'',image:old.image||story.image,theme:old.theme||story.theme,description:old.description||story.description});
  }
  const updated=[...records.values()];
  await writeFile('site/data/histoires.json',JSON.stringify(updated,null,2)+'\n');
  await writeDrafts(updated);
  console.log(`✓ Synchronisation ${source} : ${incoming.length} billets obtenus, ${updated.length} histoires dans le catalogue.`);
  if(source==='RSS'&&incoming.length<13) console.warn('Le flux RSS est peut-être limité aux plus récents billets. Vérifier que les 13 histoires sont présentes.');
}
