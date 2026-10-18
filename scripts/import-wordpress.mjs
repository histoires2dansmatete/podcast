/**
 * Import depuis Outils > Exporter > Articles (WordPress WXR XML).
 * Usage: npm run import:wordpress -- /chemin/vers/export.xml
 * Le fichier export personnel reste local et n'est pas commité.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { data, writePublicStories, sanitizeStoryHTML } from './stories.mjs';
const file=process.argv[2];
if(!file){console.error('Usage : npm run import:wordpress -- fichier-export-wordpress.xml');process.exit(1);}
const xml=await readFile(file,'utf8');
const decode=s=>String(s||'').replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,'').replace(/&(?:amp|lt|gt|quot|apos|#(\d+));/gi,(v,n)=>n?String.fromCodePoint(Number(n)):({ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'" }[v.toLowerCase()]||v));
const get=(text,tag)=>{const name=tag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return decode(text.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'');};
const text=s=>decode(s).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const result=new Map((await data()).map(s=>[s.slug,s]));
let count=0;
for(const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)){
 const block=m[1];
 if(get(block,'wp:post_type')!=='post'||get(block,'wp:status')!=='publish')continue;
 const source=get(block,'link');let slug=get(block,'wp:post_name');
 if(!slug&&source){try{slug=new URL(source).pathname.split('/').filter(Boolean).at(-1)}catch{}}
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))continue;
 const title=text(get(block,'title'));if(!title)continue;
 const original=result.get(slug)||{};
 const categories=[...block.matchAll(/<category\s+[^>]*domain="post_tag"[^>]*>([\s\S]*?)<\/category>/g)].map(x=>text(x[1]));
 const body=sanitizeStoryHTML(get(block,'content:encoded'));
 result.set(slug,{
  ...original,slug,title,subtitle:original.subtitle||'',
  theme:original.theme||categories.join(' & ')||'Histoires',
  description:original.description||text(body).slice(0,190),
  source:source||original.source||'https://histoires2dansmatete.fr/',
  image:original.image||'',emoji:original.emoji||'📖',
  minutes:original.minutes||'',date:original.date||get(block,'wp:post_date').slice(0,10),modified:get(block,'wp:post_modified').slice(0,10)||original.modified||'',tags:categories,author:'Griotte Lapone',
  bodyHtml:body||original.bodyHtml||''
 });count++;
}
if(!count){console.error('Aucun article publié détecté : exporter « Articles » depuis WordPress.');process.exit(1);}
const all=[...result.values()];
await writeFile('site/data/histoires.json',JSON.stringify(all,null,2)+'\n');
await writePublicStories(all);
console.log(`✓ ${count} articles importés depuis votre WordPress ; ${all.length} histoires dans le catalogue.`);
