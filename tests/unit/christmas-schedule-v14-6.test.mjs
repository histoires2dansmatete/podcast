import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {christmasState,christmasAccess,validateChristmasSchedule,christmasOpenLabel,DEFAULT_CHRISTMAS_SCHEDULE} from '../../functions/_lib/christmas.js';
import {renderCarousel} from '../../scripts/carousel.mjs';
import {christmasHtml} from '../../scripts/christmas.mjs';
import {onRequest} from '../../functions/_middleware.js';
const utc=x=>new Date(x);
const config=()=>structuredClone(DEFAULT_CHRISTMAS_SCHEDULE);

test('Dates d’origine récurrentes et bascule précise à minuit, heure de Paris',()=>{
 assert.equal(christmasState(utc('2026-11-01T12:00:00Z')).teaserVisible,true);
 assert.equal(christmasState(utc('2026-11-24T22:59:00Z')).open,false);
 assert.equal(christmasState(utc('2026-11-24T23:00:00Z')).open,true);
 assert.equal(christmasState(utc('2026-12-01T11:00:00Z')).unlocked,1);
 assert.equal(christmasState(utc('2026-12-25T11:00:00Z')).unlocked,25);
 assert.equal(christmasState(utc('2026-12-27T11:00:00Z')).teaserVisible,false);
 assert.equal(christmasState(utc('2027-11-25T11:00:00Z')).open,true);
});

test('Dates personnalisées : teaser, ouverture, premier épisode, fermeture et MP3',()=>{
 const s={teaserStart:'10-15',calendarStart:'11-15',firstEpisode:'11-20',calendarEnd:'12-16'};
 assert.deepEqual(validateChristmasSchedule(s),s);
 assert.equal(christmasState(utc('2026-10-14T12:00:00Z'),s).teaserVisible,false);
 assert.equal(christmasState(utc('2026-10-15T12:00:00Z'),s).teaserVisible,true);
 assert.equal(christmasState(utc('2026-11-14T12:00:00Z'),s).open,false);
 assert.equal(christmasState(utc('2026-11-15T12:00:00Z'),s).open,true);
 assert.equal(christmasState(utc('2026-11-19T12:00:00Z'),s).unlocked,0);
 assert.equal(christmasState(utc('2026-11-20T12:00:00Z'),s).unlocked,1);
 assert.equal(christmasState(utc('2026-12-14T12:00:00Z'),s).unlocked,25);
 assert.equal(christmasAccess('/assets/audio/noel/02.mp3',utc('2026-11-20T12:00:00Z'),s),false);
 assert.equal(christmasAccess('/assets/audio/noel/02.mp3',utc('2026-11-21T12:00:00Z'),s),true);
 assert.equal(christmasAccess('/noel/',utc('2026-12-17T12:00:00Z'),s),false);
 assert.equal(christmasOpenLabel(s),'15 novembre');
});

test('Saison traversant le nouvel an : date civile en Europe/Paris',()=>{
 const s={teaserStart:'12-01',calendarStart:'12-15',firstEpisode:'12-20',calendarEnd:'01-17'};
 assert.equal(christmasState(utc('2026-12-31T12:00:00Z'),s).unlocked,12);
 assert.equal(christmasState(utc('2027-01-13T12:00:00Z'),s).unlocked,25);
 assert.equal(christmasState(utc('2027-01-17T12:00:00Z'),s).open,true);
 assert.equal(christmasState(utc('2027-01-18T12:00:00Z'),s).open,false);
 assert.equal(christmasState(utc('2027-12-15T12:00:00Z'),s).open,true);
});

test('Dates invalides, calendrier trop court et saison trop longue refusés',()=>{
 for(const value of ['2026-11-01','11/01','2-01','02-29','02-30','13-01','00-20','11-31','12-00']){
  const s=config();s.calendarStart=value;assert.throws(()=>validateChristmasSchedule(s),/date|saison/);
 }
 const tooShort=config();tooShort.calendarEnd='12-20';assert.throws(()=>validateChristmasSchedule(tooShort),/25 cases/);
 const tooLong={teaserStart:'01-01',calendarStart:'01-02',firstEpisode:'01-03',calendarEnd:'08-01'};
 assert.throws(()=>validateChristmasSchedule(tooLong),/180 jours/);
});

test('La page et le teaser lisent la même configuration personnalisée',async()=>{
 const s={teaserStart:'10-15',calendarStart:'11-15',firstEpisode:'11-20',calendarEnd:'12-16'};
 const cfg=JSON.parse(await readFile('content/noel.config.json','utf8'));cfg.schedule=s;
 const html=await christmasHtml(cfg,await readFile('content/noel.template.html','utf8'));
 assert.match(html,/Calendrier accessible du 15 novembre au 16 décembre/);
 assert.match(html,/"firstEpisode":"11-20"/);
 const carousel=renderCarousel({rotationSeconds:5,stories:[{slug:'demo'}],christmasTeaser:{enabled:true,position:2,image:'assets/images/noel-teaser.svg',label:'Noël',color:'#285047'}},[{slug:'demo',title:'Démo'}],s);
 assert.match(carousel,/data-calendar-start="11-15"/);
 assert.match(carousel,/data-first-episode="11-20"/);
 assert.match(carousel,/Ouverture le 15 novembre/);
 const main=await readFile('site/assets/main.js','utf8');assert.match(main,/dataset\.teaserStart/);
 const browser=await readFile('site/assets/christmas.js','utf8');assert.match(browser,/data\.schedule/);
});

test('Cloudflare refuse l’accès en l’absence de calendrier généré ou avec calendrier invalide',async()=>{
 const base={request:new Request('https://example.com/noel/'),env:{ASSETS:{fetch:async()=>new Response('',{status:404})}},next:async()=>new Response('public')};
 const absent=await onRequest(base);assert.equal(absent.status,503);
 const invalid=await onRequest({...base,env:{ASSETS:{fetch:async()=>Response.json({calendarStart:'invalid'})}}});
 assert.equal(invalid.status,503);
});
