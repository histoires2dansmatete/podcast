import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ensureYoutubePlatforms,replaceRetiredCards} from '../../scripts/migrate-youtube-platforms.mjs';
import {validateShowPlatforms,applyShowPlatforms} from '../../scripts/platform-links.mjs';
import {validateEpisodeConfig} from '../../scripts/story-content.mjs';
import {validateAudioUpdate,mergeAudio} from '../../functions/_lib/audio-overrides.js';

const oldHome=`<h1>Mon accueil personnalisé</h1><div class="platform-grid">
<a class="platform-card" data-platform="spotify"><strong>Spotify</strong></a>
<a data-platform="apple" class="platform-card"><span>Apple</span></a>
<a data-platform="deezer" class="platform-card"><span>Deezer</span></a>
<a data-platform="amazon" class="platform-card"><span>Amazon</span></a>
</div><p>Texte libre à préserver.</p>`;
test('Migration : pages personnalisées conservées et une seule carte YouTube',()=>{
 const html=replaceRetiredCards(oldHome,'index.html');
 assert.match(html,/Mon accueil personnalisé/);assert.match(html,/Texte libre à préserver/);
 assert.equal((html.match(/data-platform="spotify"/g)||[]).length,1);
 assert.equal((html.match(/data-platform="youtube"/g)||[]).length,1);
 for(const old of ['apple','deezer','amazon'])assert.doesNotMatch(html,new RegExp(`data-platform="${old}"`));
 assert.equal(replaceRetiredCards(html,'index.html'),html);
});
test('Migration fichier : Spotify et MP3 conservés, liens obsolètes supprimés, idempotence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'h2-youtube-'));
 try{
  await mkdir(join(dir,'site'),{recursive:true});await mkdir(join(dir,'content'),{recursive:true});
  await writeFile(join(dir,'site/index.html'),oldHome);
  await writeFile(join(dir,'site/ecouter.html'),'<div class="listen-platform-grid">'+oldHome.match(/<a class="platform-card" data-platform="spotify">[\s\S]*?<\/a>/)[0]+'<a data-platform="apple">Apple</a><a data-platform="deezer">Deezer</a><a data-platform="amazon">Amazon</a></div>');
  await writeFile(join(dir,'content/platforms.config.json'),JSON.stringify({description:'personnalisé',platforms:{spotify:'https://open.spotify.com/show/123',apple:'https://podcasts.apple.com/test',deezer:'',amazon:'',youtube:'https://www.youtube.com/@exemple'}}));
  await writeFile(join(dir,'content/audio.config.json'),JSON.stringify({stories:{conte:{src:'assets/audio/conte.mp3',platforms:{spotify:'https://open.spotify.com/episode/123',apple:'https://podcasts.apple.com/ep',youtube:'https://www.youtube.com/watch?v=123'}}}}));
  const first=await ensureYoutubePlatforms(dir);
  assert.ok(first.includes('site/index.html')&&first.includes('content/audio.config.json'));
  const show=JSON.parse(await readFile(join(dir,'content/platforms.config.json'),'utf8'));
  assert.deepEqual(show.platforms,{spotify:'https://open.spotify.com/show/123',youtube:'https://www.youtube.com/@exemple'});
  assert.equal(show.description,'personnalisé');
  const audio=JSON.parse(await readFile(join(dir,'content/audio.config.json'),'utf8'));
  assert.equal(audio.stories.conte.src,'assets/audio/conte.mp3');
  assert.deepEqual(Object.keys(audio.stories.conte.platforms),['spotify','youtube']);
  assert.deepEqual(await ensureYoutubePlatforms(dir),[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Spotify et YouTube : liens HTTPS généraux et épisodes uniquement',()=>{
 const p={platforms:{spotify:'',youtube:'https://www.youtube.com/@exemple'}};
 assert.equal(validateShowPlatforms(p),p);
 assert.throws(()=>validateShowPlatforms({platforms:{deezer:'https://example.org'}}),/inconnue/);
 const output=applyShowPlatforms('<a data-platform="youtube" aria-disabled="true"><span class="platform-status">À venir</span></a>',p);
 assert.match(output,/href="https:\/\/www.youtube.com\/@exemple"/);
 assert.match(output,/Écouter/);
 assert.equal(validateEpisodeConfig({src:'',platforms:{youtube:'https://youtu.be/123'}},'conte').platforms.youtube,'https://youtu.be/123');
 assert.equal(validateAudioUpdate({slug:'conte',src:'',platforms:{youtube:'https://youtu.be/123'}}).platforms.youtube,'https://youtu.be/123');
 assert.throws(()=>validateAudioUpdate({slug:'conte',src:'',platforms:{amazon:'https://example.org'}}),/inconnue/);
});
test('Ancien enregistrement D1 : MP3 et Spotify conservés, plateformes supprimées ignorées',()=>{
 const story={slug:'conte',title:'Le conte',audioUrl:'',platforms:{}};
 const overrides=new Map([['conte',{src:'https://cdn.example.org/conte.mp3',platforms:{spotify:'https://open.spotify.com/episode/123',apple:'https://podcasts.apple.com/podcast/test',deezer:'',amazon:''}}]]);
 const result=mergeAudio([story],overrides)[0];
 assert.equal(result.audioUrl,'https://cdn.example.org/conte.mp3');
 assert.equal(result.platforms.spotify,'https://open.spotify.com/episode/123');
 assert.equal(result.platforms.youtube,'');
 assert.ok(!('apple' in result.platforms));
});
