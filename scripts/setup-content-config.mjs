/** Migration éditoriale V14.5, additive et idempotente : ne remplace jamais une valeur. */
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=async file=>{try{return JSON.parse(await readFile(file,'utf8'))}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const save=(file,data)=>writeFile(file,JSON.stringify(data,null,2)+'\n');
const old=await read('content/platforms.config.json');
if(!old){
 let platforms={spotify:'',apple:'',deezer:'',amazon:''};
 try{
  const source=await readFile('site/config.js','utf8');
  const sandbox=vm.createContext({window:{}});
  vm.runInContext(source,sandbox,{timeout:1000});
  const previous=sandbox.window.PODCAST_CONFIG?.platforms||{};
  for(const key of Object.keys(platforms))if(typeof previous[key]==='string')platforms[key]=previous[key];
 }catch(error){if(error.code!=='ENOENT')throw error;}
 await save('content/platforms.config.json',{description:'Liens généraux de l’émission vers les plateformes',platforms});
 console.log('✓ Configuration plateformes créée (anciens liens de site/config.js repris si présents).');
}else console.log('✓ Configuration plateformes préservée.');
if(!(await read('content/visibility.config.json'))){
 const stories=JSON.parse(await readFile('content/wordpress-stories.json','utf8'));
 await save('content/visibility.config.json',{description:'true = visible par défaut, false = masquée ; les choix enregistrés dans /admin/ priment via D1.',stories:Object.fromEntries(stories.map(s=>[s.slug,true]))});
 console.log('✓ Configuration de visibilité créée.');
}else console.log('✓ Configuration de visibilité préservée.');
const carousel=await read('content/carousel.config.json');
if(!carousel)throw Error('content/carousel.config.json introuvable');
if(!('christmasTeaser' in carousel)){
 carousel.christmasTeaser={enabled:true,position:Math.min(2,carousel.stories.length+1),image:'assets/images/noel-teaser.svg',label:'Le calendrier de Noël',color:'#285047'};
 await save('content/carousel.config.json',carousel);
 console.log('✓ Teaser Noël ajouté au carrousel.');
}else console.log('✓ Teaser Noël existant conservé.');
const noel=await read('content/noel.config.json');
if(!noel)throw Error('content/noel.config.json introuvable');
let changed=false;
if(noel.introduction&&!('platformUrl' in noel.introduction)){noel.introduction.platformUrl='';changed=true;}
for(const episode of noel.episodes||[])if(!('platformUrl' in episode)){episode.platformUrl='';changed=true;}
if(changed){await save('content/noel.config.json',noel);console.log('✓ Liens de plateformes ajoutés aux 25 cases sans écraser les MP3.');}
else console.log('✓ Configuration Noël préservée.');
