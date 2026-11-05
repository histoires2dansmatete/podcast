import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('Migration V14.5 : anciens liens repris, 25 MP3 préservés et seconde exécution idempotente',async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'h2-v145-'));
 try{
  await mkdir(join(tmp,'content'),{recursive:true});await mkdir(join(tmp,'site'),{recursive:true});
  await writeFile(join(tmp,'site/config.js'),'window.PODCAST_CONFIG = {platforms:{spotify:"https://open.spotify.com/show/existing",apple:"",deezer:"",amazon:""}};');
  await writeFile(join(tmp,'content/wordpress-stories.json'),JSON.stringify([{slug:'bas-les-masques',title:'Bas les masques'}]));
  const carousel={rotationSeconds:5,stories:[{slug:'bas-les-masques',label:'Mon ancienne sélection'}]};
  const christmas={title:'Noël personnalisé',introduction:{title:'Mon intro',src:'https://cdn.example.org/my-intro.mp3'},episodes:Array.from({length:25},(_,i)=>({day:i+1,title:`Partie ${i+1}`,src:`https://cdn.example.org/${i+1}.mp3`}))};
  await writeFile(join(tmp,'content/carousel.config.json'),JSON.stringify(carousel));
  await writeFile(join(tmp,'content/noel.config.json'),JSON.stringify(christmas));
  const run=()=>spawnSync(process.execPath,[resolve('scripts/setup-content-config.mjs')],{cwd:tmp,encoding:'utf8'});
  const first=run();assert.equal(first.status,0,first.stderr);
  const p=JSON.parse(await readFile(join(tmp,'content/platforms.config.json'),'utf8'));
  assert.equal(p.platforms.spotify,'https://open.spotify.com/show/existing');
  assert.equal(p.platforms.youtube,'');
  assert.deepEqual(Object.keys(p.platforms),['spotify','youtube']);
  const c=JSON.parse(await readFile(join(tmp,'content/carousel.config.json'),'utf8'));
  assert.equal(c.stories[0].label,'Mon ancienne sélection');
  assert.equal(c.christmasTeaser.position,2);
  const x=JSON.parse(await readFile(join(tmp,'content/noel.config.json'),'utf8'));
  assert.equal(x.episodes[24].src,'https://cdn.example.org/25.mp3');
  assert.equal(x.introduction.src,'https://cdn.example.org/my-intro.mp3');
  assert.equal(x.episodes[24].platformUrl,'');
  assert.deepEqual(x.schedule,{teaserStart:'11-01',calendarStart:'11-25',firstEpisode:'12-01',calendarEnd:'12-26'});
  const paths=['content/platforms.config.json','content/visibility.config.json','content/noel.config.json','content/carousel.config.json'];
  const before=await Promise.all(paths.map(path=>readFile(join(tmp,path),'utf8')));
  const second=run();assert.equal(second.status,0,second.stderr);
  const after=await Promise.all(paths.map(path=>readFile(join(tmp,path),'utf8')));
  assert.deepEqual(after,before);
 }finally{await rm(tmp,{recursive:true,force:true});}
});
