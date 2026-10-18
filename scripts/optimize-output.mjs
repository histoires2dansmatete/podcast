/** Optimisations prudentes du seul dossier dist/ ; ne modifie pas le code source. */
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
const root=resolve('dist');
async function walk(dir){
 const result=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const child=join(dir,entry.name);
  if(entry.isDirectory())result.push(...await walk(child));
  else if(entry.isFile())result.push(child);
 }
 return result;
}
function safeCssCompression(source){
 // Strip only block comments when outside CSS quotes; preserve /*! licenses */.
 let result='',quote='',i=0;
 while(i<source.length){
  const ch=source[i];
  if(quote){result+=ch;if(ch==='\\' && i+1<source.length)result+=source[++i];else if(ch===quote)quote='';i++;continue;}
  if(ch==='"'||ch==="'"){quote=ch;result+=ch;i++;continue;}
  if(source.startsWith('/*',i)&&!source.startsWith('/*!',i)){
   const stop=source.indexOf('*/',i+2);
   if(stop!==-1){i=stop+2;continue;}
  }
  result+=ch;i++;
 }
 return result.split('\n').map(line=>line.trim()).filter(Boolean).join('\n')+'\n';
}
let imageCount=0,cssCount=0,before=0,after=0;
for(const file of await walk(root)){
 if(file.endsWith('.css')){
  const original=await readFile(file,'utf8');const reduced=safeCssCompression(original);
  await writeFile(file,reduced);cssCount++;
  before+=gzipSync(original).length;after+=gzipSync(reduced).length;
 }
 if(file.endsWith('.html')){
  const original=await readFile(file,'utf8');
  const changed=original.replace(/<img\b[^>]*>/gi,tag=>{
   let modified=tag;
   if(!/\bdecoding=/.test(modified))modified=modified.replace(/\s*\/?>(?=$)/,end=>` decoding="async"${end}`);
   const isHigh=/\bfetchpriority=["']high["']/.test(modified);
   const isBrand=/\bbrand-logo\b|\/assets\/icons\/|\/assets\/favicon/.test(modified);
   const isEpisode=/\bdata-episode-image\b/.test(modified);
   if(!isHigh&&!isBrand&&!isEpisode&&!/\bloading=/.test(modified)){
    modified=modified.replace(/\s*\/?>(?=$)/,end=>` loading="lazy"${end}`);
   }
   if(/\bloading=["']lazy["']/.test(modified)){
    modified=modified.replace(/\s+fetchpriority=["']high["']/g,'');
   }
   if(modified!==tag)imageCount++;
   return modified;
  });
  if(changed!==original)await writeFile(file,changed);
 }
}
console.log(`✓ Optimisation dist : ${cssCount} CSS allégés (${before} → ${after} octets gzip), ${imageCount} balises image adaptées au chargement progressif.`);
