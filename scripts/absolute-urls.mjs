/** Normalise les liens internes du rendu DEPLOYE seulement. L'aperçu local conserve ses sources. */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
const root=resolve('dist');
async function htmlFiles(dir){
  const files=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory())files.push(...await htmlFiles(path));
    else if(entry.isFile() && path.endsWith('.html'))files.push(path);
  }
  return files;
}
function normalize(path,raw){
  if(!raw || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#|\?)/i.test(raw))return raw;
  const url=new URL(raw,'https://example.invalid/'+relative(root,path).split(sep).join('/'));
  if(url.origin!=='https://example.invalid')return raw;
  return url.pathname+url.search+url.hash;
}
export async function normalizeOutputUrls(){
  let converted=0,scanned=0;
  for(const file of await htmlFiles(root)){
    const original=await readFile(file,'utf8');
    const changed=original.replace(/\b(href|src|poster|data-fallback)=(['"])([^'"<>]*)\2/g,(_match,attr,quote,value)=>{
      const normalized=normalize(file,value);
      if(value!==normalized)converted++;
      return `${attr}=${quote}${normalized}${quote}`;
    });
    await writeFile(file,changed);
    scanned++;
  }
  console.log(`✓ URLs de déploiement : ${converted} chemins absolus vérifiés sur ${scanned} pages.`);
}
/** Empêche qu'une mise en ligne casse les ressources fondamentales du site. */
export async function verifyOutputUrls(){
  let checked=0;
  for(const file of await htmlFiles(root)){
    const html=await readFile(file,'utf8');
    const assets=[...html.matchAll(/\b(?:href|src|poster|data-fallback)=(['"])(\/assets\/[^'"<>]+|\/config\.js|\/data\/histoires\.json)\1/g)];
    for(const match of assets){
      const path=decodeURIComponent(match[2].split(/[?#]/,1)[0]);
      const target=resolve(root,'.'+path);
      if(!target.startsWith(root+sep) || !(await stat(target).catch(()=>null))?.isFile())throw Error(`Asset absent dans dist : ${relative(root,file)} → ${path}`);
      checked++;
    }
    if(file.endsWith('/index.html') || file.endsWith('index.html')){
      if(!html.includes('href="/assets/style.css"'))throw Error(`${relative(root,file)} : CSS principal absent ou chemin relatif`);
    }
    if(/\b(?:href|src)=(['"])(?:\.\.\/|assets\/|config\.js)\b/i.test(html))throw Error(`URL relative restante dans ${relative(root,file)}`);
  }
  console.log(`✓ Ressources de production : ${checked} fichiers vérifiés dans dist/.`);
}
