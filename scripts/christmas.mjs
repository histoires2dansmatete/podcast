import {readFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {escapeHtml} from './stories.mjs';
const escapeScript=v=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/\u2028|\u2029/g,'');
/** Audio non public tant que la case n'est pas déverrouillée côté interface. */
const localIntro='assets/audio/noel/introduction.mp3';
export const defaultChristmasIntroduction=Object.freeze({
 title:'Avant d’ouvrir la première porte',
 text:'Bienvenue dans notre calendrier de Noël ! Cette histoire se découvre en 25 petits épisodes, à écouter au fil du mois de décembre.\n\nInstallez-vous confortablement et laissez-vous emporter par la magie de Noël.',
 src:''
});
export function withChristmasIntroduction(config){
 if(Object.prototype.hasOwnProperty.call(config,'introduction'))return config;
 const updated={};
 for(const [key,value] of Object.entries(config)){
  updated[key]=value;
  if(key==='intro')updated.introduction={...defaultChristmasIntroduction};
 }
 if(!('introduction' in updated))updated.introduction={...defaultChristmasIntroduction};
 return updated;
}
function introFor(config){return config.introduction===undefined?defaultChristmasIntroduction:config.introduction;}
function validatedHttpsOrLocal(source,local,error){
 if(typeof source!=='string')throw Error(error);
 if(!source||source===local)return;
 let u;
 try{u=new URL(source);}catch{throw Error(error);}
 if(u.protocol!=='https:'||u.username||u.password||!u.hostname||u.hash)throw Error(error);
}
async function validateLocalAudio(src){
 if(!src||!src.startsWith('assets/audio/noel/'))return;
 let file;
 try{file=await stat(join('site',src));}catch{throw Error(`Noël : MP3 absent du projet : ${src}`);}
 if(!file.isFile()||file.size>25*1024*1024)throw Error(`Noël : MP3 ${src} absent ou > 25 Mio`);
}
export function validateChristmasConfig(cfg){
 if(!cfg||typeof cfg!=='object'||!Array.isArray(cfg.episodes)||cfg.episodes.length!==25)throw Error('Noël : config doit avoir 25 épisodes');
 for(const prop of ['title','subtitle','intro'])if(typeof cfg[prop]!=='string'||!cfg[prop].trim()||cfg[prop].length>300)throw Error(`Noël : ${prop} invalide`);
 const intro=introFor(cfg);
 if(!intro||typeof intro!=='object')throw Error('Noël : introduction requise');
 if(typeof intro.title!=='string'||!intro.title.trim()||intro.title.length>120)throw Error('Noël : titre introduction invalide');
 if(typeof intro.text!=='string'||!intro.text.trim()||intro.text.length>3000)throw Error('Noël : texte introduction invalide');
 validatedHttpsOrLocal(intro.src,localIntro,'Noël : MP3 introduction doit être local (assets/audio/noel/introduction.mp3) ou HTTPS');
 const days=new Set();
 for(const entry of cfg.episodes){
  if(!entry||!Number.isInteger(entry.day)||entry.day<1||entry.day>25||days.has(entry.day))throw Error('Noël : journées 1 à 25 uniques requises');
  days.add(entry.day);
  if(typeof entry.title!=='string'||!entry.title.trim()||entry.title.length>90)throw Error(`Noël : titre invalide au jour ${entry.day}`);
  if(typeof entry.src!=='string')throw Error(`Noël : source audio invalide au jour ${entry.day}`);
  if(entry.src){
   const local=`assets/audio/noel/${String(entry.day).padStart(2,'0')}.mp3`;
   if(entry.src!==local){
    let u;
    try{u=new URL(entry.src);}catch{throw Error(`Noël : MP3 ${entry.day} doit être local (${local}) ou HTTPS`);}
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname||u.hash)throw Error(`Noël : URL HTTPS invalide au jour ${entry.day}`);
   }
  }
 }
 return cfg;
}
export async function christmasHtml(config,template){
 validateChristmasConfig(config);
 const episodes=[...config.episodes].sort((a,b)=>a.day-b.day);
 for(const ep of episodes)await validateLocalAudio(ep.src);
 await validateLocalAudio(introFor(config).src);
 const doors=episodes.map(ep=>`<button class="christmas-door" type="button" data-day="${ep.day}" disabled aria-label="Case ${ep.day}, encore fermée"><span class="door-ornament" aria-hidden="true">${['✧','✦','❄','✳','★'][ep.day%5]}</span><span class="door-number">${ep.day}</span><span class="door-caption">À découvrir</span></button>`).join('\n');
 const intro=introFor(config);
 const introParagraphs=intro.text.split(/\n\s*\n/).filter(p=>p.trim()).map(p=>`<p>${escapeHtml(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
 const introPlayer=intro.src
  ? `<audio id="christmas-intro-audio" controls preload="none" data-src="${escapeHtml(intro.src)}" aria-label="Écouter l’introduction de l’histoire de Noël">Votre navigateur ne prend pas en charge l’audio HTML5.</audio>`
  : '<p class="christmas-prologue-placeholder">L’enregistrement d’introduction sera bientôt disponible.</p>';
 const clean={title:config.title,subtitle:config.subtitle,intro:config.intro,episodes};
 return template.replaceAll('__CHRISTMAS_INTRO_TITLE__',escapeHtml(intro.title)).replaceAll('__CHRISTMAS_INTRO_TEXT__',introParagraphs).replace('<!-- CHRISTMAS-INTRO-PLAYER -->',introPlayer).replaceAll('__CHRISTMAS_TITLE__',escapeHtml(config.title)).replaceAll('__CHRISTMAS_SUBTITLE__',escapeHtml(config.subtitle)).replaceAll('__CHRISTMAS_INTRO__',escapeHtml(config.intro)).replace('<!-- CHRISTMAS-DOORS -->',doors).replace('<!-- CHRISTMAS-CONFIG -->',`<script id="christmas-data" type="application/json">${escapeScript(clean)}</script>`);
}
export async function writeChristmas(){
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));
 const template=await readFile('content/noel.template.html','utf8');
 await writeFile('site/noel/index.html',await christmasHtml(cfg,template));
}
