/** Corpus : compare chaque récit, mot pour mot, avec l'export WordPress d'origine.
 * Par défaut un XML d'articles publics sans identifiants privés est inclus dans le projet.
 * Un export WordPress WXR complet peut aussi être fourni explicitement.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sanitizeStoryHTML} from './stories.mjs';
const fixture=process.argv[2] || 'tests/fixtures/histoires-wordpress-public.xml';
const xml=await readFile(resolve(fixture),'utf8');
const decode=(s)=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(?:amp|lt|gt|quot|apos|#x([a-f0-9]+)|#([0-9]+));/gi,(str,h,n)=>h?String.fromCodePoint(parseInt(h,16)):n?String.fromCodePoint(Number(n)):({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'" }[str.toLowerCase()]||str));
const normalize=(text)=>{
 let s=text.replace(/<\/?(?:p|div|li|h[1-6]|blockquote|br)\b[^>]*>/gi,' ');
 s=s.replace(/<[^>]+>/g,'');
 for(let i=0;i<4;i++){const before=s;s=decode(s);if(before===s)break;}
 return s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().normalize('NFC');
};
const get=(item,name)=>decode(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'');
const posts=[];
if(xml.includes('<wordpress-stories')){
 for(const match of xml.matchAll(/<story\s+slug="([^"]+)"[^>]*>([\s\S]*?)<\/story>/g)){
  posts.push({slug:match[1],title:get(match[2],'title'),content:get(match[2],'content'),tags:[...match[2].matchAll(/<tag>([\s\S]*?)<\/tag>/g)].map(m=>decode(m[1]))});
 }
}else{
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)){
  const item=match[1];if(get(item,'wp:post_type')!=='post'||get(item,'wp:status')!=='publish')continue;
  posts.push({slug:get(item,'wp:post_name'),title:get(item,'title'),content:get(item,'content:encoded'),tags:[...item.matchAll(/<category\s+[^>]*domain="post_tag"[^>]*>([\s\S]*?)<\/category>/g)].map(m=>decode(m[1]))});
 }
}
const actual=JSON.parse(await readFile('site/data/histoires.json','utf8'));
assert.equal(posts.length,13,'Le fichier de référence doit contenir exactement 13 articles publiés.');
assert.ok(actual.length>=posts.length,'Des histoires WordPress manquent dans le catalogue.');
const bySlug=new Map(actual.map(s=>[s.slug,s]));
assert.equal(bySlug.size,actual.length,'Identifiants en double');
for(const reference of posts){
 const story=bySlug.get(reference.slug);assert.ok(story,`Histoire manquante: ${reference.slug}`);
 assert.equal(story.title,reference.title,`${reference.slug}: titre différent du XML`);
 assert.deepEqual([...story.tags].sort(),[...reference.tags].sort(),`${reference.slug}: étiquettes (thèmes) différentes du XML`);
 const expected=normalize(sanitizeStoryHTML(reference.content));
 const received=normalize(sanitizeStoryHTML(story.bodyHtml));
 assert.ok(expected.length>100,`${reference.slug}: XML sans contenu`);
 if(expected!==received){
  let first=0;while(first<Math.min(expected.length,received.length)&&expected[first]===received[first])first++;
  throw new Error(`${reference.slug}: texte différent du XML à la position ${first} (attendu «${expected.slice(first,first+95)}», obtenu «${received.slice(first,first+95)}»).`);
 }
 const page=await readFile(resolve(`site/histoires/${story.slug}/index.html`),'utf8');
 assert.ok(page.includes('class="reading-body"'),`${story.slug}: page intégrale absente`);
 const pageContent=page.match(/<div class="reading-body">([\s\S]*?)<\/div><div class="reading-end"/);
 assert.ok(pageContent,`${story.slug}: bloc de lecture introuvable`);
 assert.equal(normalize(pageContent[1]),received,`${story.slug}: texte HTML publié différent du XML`);
}
assert.deepEqual(posts.map(p=>p.slug).sort(),[...bySlug.keys()].filter(slug=>posts.some(p=>p.slug===slug)).sort(),'Correspondance des slugs WordPress incomplète');
console.log(`✓ Test XML global réussi : ${posts.length} titres, identifiants et récits intégralement identiques à WordPress (pages incluses).`);
