/** Simulation complète et isolée : brouillon -> publication -> retrait.
 * Ne touche jamais aux contenus, MP3 et réglages du véritable projet.
 */
import assert from 'node:assert/strict';
import {mkdtemp,cp,writeFile,readFile,mkdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const origin=resolve('.');
const temp=await mkdtemp(join(tmpdir(),'h2-publish-'));
const slug='verification-histoire-test';
const run=(script,...args)=>execFileSync(process.execPath,[`scripts/${script}`,...args],{cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe']});
try{
 for(const part of ['scripts','site','content'])await cp(join(origin,part),join(temp,part),{recursive:true});
 run('new-story.mjs','--title','Vérification histoire test');
 const metaPath=join(temp,`content/stories/${slug}.json`);
 const story=JSON.parse(await readFile(metaPath,'utf8'));
 assert.equal(story.published,false,'Une nouvelle histoire doit commencer en brouillon.');
 run('generate.mjs');run('seo.mjs');run('build.mjs');
 let catalog=JSON.parse(await readFile(join(temp,'dist/data/histoires.json'),'utf8'));
 assert.equal(catalog.some(s=>s.slug===slug),false,'Un brouillon ne doit pas être publié.');
 assert.equal(await stat(join(temp,`dist/histoires/${slug}/index.html`)).then(()=>true,()=>false),false);
 assert.ok(!(await readFile(join(temp,'dist/sitemap.xml'),'utf8')).includes(slug),'Un brouillon ne doit pas figurer dans le sitemap.');

 // Une publication avec fichier audio (petit média de test). La vraie limite est vérifiée ailleurs.
 await mkdir(join(temp,'site/assets/audio'),{recursive:true});
 await writeFile(join(temp,'site/assets/audio','verification.mp3'),Buffer.from('ID3test-audio'));
 const audioPath=join(temp,'content/audio.config.json');
 const audio=JSON.parse(await readFile(audioPath,'utf8'));
 audio.stories[slug]={src:'assets/audio/verification.mp3',platforms:{spotify:'https://open.spotify.com/episode/test'}};
 await writeFile(audioPath,JSON.stringify(audio,null,2));
 await writeFile(join(temp,`content/stories/${slug}.html`),'<p>'+('Une aventure à lire ensemble avec un paysage étoilé. '.repeat(8))+'</p>');
 story.published=true;
 story.description='Une histoire de vérification sur une aventure étoilée.';
 await writeFile(metaPath,JSON.stringify(story,null,2));
 run('generate.mjs');run('seo.mjs');run('build.mjs');
 catalog=JSON.parse(await readFile(join(temp,'dist/data/histoires.json'),'utf8'));
 assert.equal(catalog.length,14,'Le catalogue doit accueillir une 14e histoire.');
 assert.ok(catalog.some(s=>s.slug===slug),'La nouvelle histoire doit être visible.');
 const html=await readFile(join(temp,`dist/histoires/${slug}/index.html`),'utf8');
 assert.match(html,/<audio\b[^>]*controls/, 'Le lecteur audio doit apparaître.');
 assert.match(html,/\/assets\/audio\/verification\.mp3/, 'Le lecteur doit utiliser le MP3 configuré.');
 assert.match(html,/open\.spotify\.com\/episode\/test/, 'Le lien de plateforme doit apparaître.');
 assert.match(html,/Une aventure à lire ensemble/, 'Le récit complet doit apparaître.');
 assert.ok((await stat(join(temp,'dist/assets/audio/verification.mp3'))).isFile(),'MP3 non copié dans dist.');
 assert.ok((await readFile(join(temp,'dist/sitemap.xml'),'utf8')).includes(`/histoires/${slug}/`),'Nouvelle histoire absente du sitemap.');
 assert.ok((await readFile(join(temp,'dist/histoires.xml'),'utf8')).includes(`/histoires/${slug}/`),'Nouvelle histoire absente du RSS.');

 story.published=false;await writeFile(metaPath,JSON.stringify(story,null,2));
 run('generate.mjs');run('seo.mjs');run('build.mjs');
 assert.ok(!(await readFile(join(temp,'dist/sitemap.xml'),'utf8')).includes(`/histoires/${slug}/`),'Le brouillon restauré reste indexable.');
 assert.equal(await stat(join(temp,`dist/histoires/${slug}/index.html`)).then(()=>true,()=>false),false,'Une ancienne fiche reste publiée dans dist.');
 console.log('✓ Parcours éditorial : brouillon privé, publication avec MP3/Spotify/SEO, puis retrait du build (14e histoire temporaire).');
}finally{
 await rm(temp,{recursive:true,force:true});
}
