import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,rm,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { slugOK, localAudio, externalAudio, validateAudioSrc, validateEpisodeConfig, validateNewStory, readEditorialStories, readAllStories, configureAudio } from '../../scripts/story-content.mjs';
test('Validateurs : slugs sûrs et unicité',async()=>{
 assert.equal(slugOK('une-nouvelle-histoire'),true);
 for(const bad of ['','../secret','abc/def','Été','a--b','.','x%2fy'])assert.equal(slugOK(bad),false,bad);
 const all=await readAllStories();
 assert.equal(all.length,13,'Le corpus initial WordPress comprend treize histoires');
 assert.equal(new Set(all.map(s=>s.slug)).size,all.length);
});
test('Audio : chemins locaux, HTTPS et rejet des URLs dangereuses',()=>{
 for(const src of ['', 'assets/audio/test.mp3','assets/audio/chapitre-1/test.m4a','assets/audio/test.ogg','https://media.example.org/episode.mp3'])assert.equal(validateAudioSrc(src),src);
 for(const src of ['http://media.example.org/test.mp3','javascript:alert(1)','assets/audio/../secret.mp3','assets/audio/x.mp4','/etc/passwd','assets/audio/a b.mp3','https://bob:pwd@example.org/file.mp3']) assert.throws(()=>validateAudioSrc(src),src);
 assert.equal(localAudio('assets/audio/test.mp3'),true);
 assert.equal(externalAudio('https://cdn.example.com/foo.mp3'),true);
});
test('Les liens par épisode acceptent seulement quatre plateformes HTTPS',()=>{
 assert.deepEqual(validateEpisodeConfig({src:'',platforms:{}},'test'),{src:'',platforms:{}});
 assert.throws(()=>validateEpisodeConfig({src:'',platforms:{youtube:'https://example.org/'}},'test'),/inconnue/);
 assert.throws(()=>validateEpisodeConfig({src:'',platforms:{spotify:'http://example.org/'}},'test'),/incorrect/);
 assert.equal(validateEpisodeConfig({src:'assets/audio/a.mp3',platforms:{spotify:'https://open.spotify.com/episode/123'}},'x').src,'assets/audio/a.mp3');
});
test('Une nouvelle histoire nécessite du texte et un statut de publication explicite',()=>{
 const s={slug:'nouvelle-histoire',title:'Nouvelle histoire',description:'Un conte',tags:['Amitié'],date:'2026-10-19',published:false};
 assert.equal(validateNewStory(s),s);
 assert.throws(()=>validateNewStory({...s,published:'true'}),/published/);
 assert.throws(()=>validateNewStory({...s,tags:[]}),/thèmes/);
 assert.throws(()=>validateNewStory({...s,bodyHtml:'<p>texte</p>'}),/HTML séparé/);
 assert.throws(()=>validateNewStory({...s,date:'2026-02-31'}),/date/, 'Une date calendaire impossible est refusée');
 assert.doesNotThrow(()=>validateNewStory({...s,date:'2024-02-29'}), 'Les jours bissextiles valides sont acceptés');
});
test('Brouillons exclus, histoires publiées incluses depuis un dossier isolé',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'h2-story-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const item={slug:'nouvelle-histoire',title:'Nouvelle histoire',description:'Une histoire',tags:['Amitié'],date:'2026-10-19',published:false};
 await writeFile(join(dir,'nouvelle-histoire.json'),JSON.stringify(item));
 await writeFile(join(dir,'nouvelle-histoire.html'),'<p>'+('Contenu complet '.repeat(15))+'</p>');
 assert.equal((await readEditorialStories({dir})).length,1);
 await writeFile(join(dir,'nouvelle-histoire.json'),JSON.stringify({...item,published:true}));
 assert.match((await readEditorialStories({dir}))[0].bodyHtml,/Contenu complet/);
 await writeFile(join(dir,'nouvelle-histoire.html'),'<p>court</p>');
 await assert.rejects(readEditorialStories({dir}),/trop court/);
});
test('Un MP3 local manquant ou supérieur à 25 Mio empêche la publication',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'h2-audio-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await mkdir(join(dir,'assets','audio'),{recursive:true});
 const cfg=join(dir,'audio.json');
 const base=[{slug:'bas-les-masques'}];
 await writeFile(cfg,JSON.stringify({stories:{'bas-les-masques':{src:'assets/audio/sample.mp3',platforms:{}}}}));
 await assert.rejects(configureAudio(base,{filename:cfg,assetRoot:dir}),/absent/);
 await writeFile(join(dir,'assets','audio','sample.mp3'),'ID3demo');
 const configured=await configureAudio(base,{filename:cfg,assetRoot:dir});
 assert.equal(configured[0].audioUrl,'assets/audio/sample.mp3');
});
