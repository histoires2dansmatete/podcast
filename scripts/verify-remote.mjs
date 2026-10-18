/** Teste le vrai site Cloudflare, pas seulement le build local. */
const target=process.argv.find((a,i)=>i>1&&!a.startsWith('-'));
if(!target){console.error('Usage: npm run test:remote -- https://VOTRE-PROJET.pages.dev');process.exit(2);}
let base;
try {base=new URL(target); if(!/^https?:$/.test(base.protocol)||base.pathname!=='/'&&base.pathname!==''){throw Error('Utilisez la racine du site');}}catch{console.error('Adresse invalide : utilisez https://votre-projet.pages.dev');process.exit(2);}
const origin=base.origin;
let errors=0;
async function get(path,expectedMime,expect){
  try{
    const res=await fetch(new URL(path,origin),{redirect:'follow',headers:{'Cache-Control':'no-cache'}});
    const mime=res.headers.get('content-type')||'';
    const body=await res.text();
    if(!res.ok||!mime.includes(expectedMime)||expect&&!expect.test(body)){
      console.error(`✗ ${path} : HTTP ${res.status} | ${mime} | ${body.length} caractères`);errors++;return null;
    }
    console.log(`✓ ${path} : HTTP ${res.status} (${mime.split(';')[0]})`);
    return body;
  }catch(e){console.error(`✗ ${path} : ${e.message}`);errors++;return null;}
}
const home=await get('/','text/html',/footer-social-area/);
if(home && !home.includes('href="/assets/style.css"')){console.error('✗ Accueil : mauvaise version de build ou CSS relatif');errors++;}
await get('/assets/style.css','text/css',/\.site-header|\.header-inner/);
await get('/assets/main.js','javascript',/primary-nav/);
await get('/assets/icons/instagram.svg','image/svg+xml',/<svg/);
await get('/assets/icons/facebook.svg','image/svg+xml',/<svg/);
await get('/assets/logo.webp','image/webp',null).catch(()=>null);
await get('/qui-suis-je.html','text/html',/footer-social-area/);
const story=await get('/histoires/bas-les-masques/','text/html',/reading-body/);
if(story&&!story.includes('href="/assets/style.css"')){console.error('✗ Histoire : URL du CSS non absolue');errors++;}
const catalogue=await get('/data/histoires.json','application/json',/bas-les-masques/);
if(catalogue){
  try{const stories=JSON.parse(catalogue); console.log(`  Catalogue : ${stories.length} histoires`);}catch{errors++;console.error('✗ Catalogue JSON non valide');}
}
const admin=await get('/admin/','text/html',/admin|connexion|mot de passe/i);
if(!admin)console.warn('ℹ Vérifiez que la base D1 et les Pages Functions sont bien associées.');
if(errors){console.error(`Échec : ${errors} anomalie(s). Contrôlez le projet PAGES, dist et les assets.`);process.exitCode=1;}else{console.log('✓ Vérification du site distant terminée.');}
