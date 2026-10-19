(()=>{
'use strict';
const $=id=>document.getElementById(id);
const number=n=>new Intl.NumberFormat('fr-FR').format(Number(n||0));
const humanize=k=>({'/':'Accueil','/index.html':'Accueil','/histoires.html':'Toutes les histoires','/ecouter.html':'Où écouter ?','/qui-suis-je.html':'Qui suis-je ?','direct':'Accès direct','XX':'Pays non identifié','desktop':'Ordinateur','tablet':'Tablette','mobile':'Mobile','other':'Autre','audio_play':'Lecture audio','platform_click':'Clic plateforme','story_end':'Fin de lecture affichée'}[k]||k.replace('/histoires/','Histoire : ').replace(/\/$/,'').replaceAll('-',' '));
function rankings(id,rows,withEvent=false){
 const el=$(id);el.replaceChildren();
 if(!rows?.length){const p=document.createElement('p');p.className='empty';p.textContent='Aucune donnée sur cette période.';el.append(p);return;}
 const max=Math.max(...rows.map(r=>r.count),1);
 rows.forEach(r=>{
  const row=document.createElement('div');row.className='metric-row';
  const head=document.createElement('div');head.className='metric-head';
  const label=document.createElement('span');label.textContent=humanize(r.label)+(withEvent?' · '+humanize(r.event):'');
  const count=document.createElement('b');count.textContent=number(r.count);
  const track=document.createElement('div');track.className='bar-track';
  const bar=document.createElement('div');bar.className='bar-fill';bar.style.width=(100*r.count/max)+'%';
  track.append(bar);head.append(label,count);row.append(head,track);el.append(row);
 });
}
function timeline(rows){
 const el=$('timeline');el.replaceChildren();
 if(!rows.length){el.textContent='Pas encore de vues enregistrées.';return;}
 const max=Math.max(1,...rows.map(r=>r.views));
 rows.forEach(r=>{
  const col=document.createElement('div');col.className='timeline-col';
  const count=document.createElement('small');count.textContent=number(r.views);
  const bar=document.createElement('span');bar.className='timeline-bar';bar.style.height=Math.max(5,100*r.views/max)+'%';
  const day=document.createElement('small');day.textContent=r.day.slice(5);
  col.title=`${r.day} : ${number(r.views)} pages vues, ${number(r.sessions)} sessions`;
  col.append(count,bar,day);el.append(col);
 });
}
async function load(){
 $('status').textContent='Chargement…';
 try{
  const response=await fetch('/api/admin/stats?days='+encodeURIComponent($('days').value),{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error(response.status===503?'Configuration D1 manquante. Consultez le README.':'Accès impossible ('+response.status+').');
  const d=await response.json();
  $('views').textContent=number(d.overview.pageviews);$('sessions').textContent=number(d.overview.sessions);
  $('plays').textContent=number(d.overview.audio_plays);$('clicks').textContent=number(d.overview.platform_clicks);
  timeline(d.timeline);rankings('pages',d.pages);rankings('referrers',d.referrers);rankings('countries',d.countries);rankings('devices',d.devices);rankings('browsers',d.browsers);rankings('interactions',d.interactions,true);
  $('note').textContent=d.note;
  $('status').textContent=`Données du ${d.from} au ${d.to} · rafraîchies à ${new Date().toLocaleTimeString('fr-FR')}`;
 }catch(e){$('status').textContent='Statistiques indisponibles : '+e.message;}
}
async function loadStories(){
 const status=$('stories-status');status.textContent='Chargement des états de publication…';
 try{
  const resp=await fetch('/api/admin/stories',{cache:'no-store'});
  if(!resp.ok)throw Error('Service indisponible ('+resp.status+')');
  const result=await resp.json();
  const list=$('admin-story-list');list.replaceChildren();
  result.stories.forEach(story=>{
   const row=document.createElement('div');row.className='admin-story-row';
   const info=document.createElement('div');info.className='admin-story-copy';
   const title=document.createElement('strong');title.textContent=story.title;
   const subtitle=document.createElement('small');subtitle.textContent=story.subtitle||story.slug;
   info.append(title,subtitle);
   const label=document.createElement('label');label.className='admin-story-toggle';
   const caption=document.createElement('span');caption.textContent=story.enabled?'Publiée':'Masquée';
   const input=document.createElement('input');input.type='checkbox';input.checked=story.enabled;
   input.setAttribute('aria-label',`Publier ${story.title} ${story.subtitle||''}`);
   input.addEventListener('change',async()=>{
    const next=input.checked;input.disabled=true;caption.textContent='Enregistrement…';
    try{
     const result=await fetch('/api/admin/stories',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'PodcastAdmin'},body:JSON.stringify({slug:story.slug,enabled:next})});
     if(!result.ok)throw Error((await result.json().catch(()=>({}))).error||'Erreur de sauvegarde');
     caption.textContent=next?'Publiée':'Masquée';
     status.textContent=`État de « ${story.title} » enregistré.`;
    }catch(e){input.checked=!next;caption.textContent=!next?'Publiée':'Masquée';status.textContent='Impossible de modifier : '+e.message;}
    finally{input.disabled=false;}
   });
   label.append(caption,input);row.append(info,label);list.append(row);
  });
  status.textContent=`${result.stories.filter(s=>s.enabled).length} histoire(s) publique(s) sur ${result.stories.length}.`;
 }catch(e){status.textContent='Publication indisponible : '+e.message;}
}
$('refresh-stories').addEventListener('click',loadStories);
$('days').addEventListener('change',load);load();loadStories();
})();

// V14 : liens audio persistés (Cloudflare D1 / .local sur le PC), sans upload MP3.
(()=>{
 'use strict';
 const byId=id=>document.getElementById(id);
 const form=byId('admin-audio-form');if(!form)return;
 const status=byId('audio-status');let stories=[];
 const providers=['spotify','apple','deezer','amazon'];
 const selected=()=>stories.find(s=>s.slug===byId('audio-story').value);
 function fill(){
  const s=selected();byId('audio-src').value=s?.src?.startsWith('https://')?s.src:'';
  for(const p of providers)byId('audio-'+p).value=s?.platforms?.[p]||'';
  status.textContent=s?.src?.startsWith('assets/')?'Ce MP3 est intégré au dépôt Git. Pour le remplacer ici, renseignez une URL HTTPS.':s?.custom?'Configuration audio personnalisée enregistrée dans D1.':'Configuration audio issue du dépôt Git.';
 }
 async function refresh(){
  status.textContent='Chargement des épisodes…';
  try{
   const r=await fetch('/api/admin/audio',{credentials:'same-origin',cache:'no-store'});
   if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'Erreur HTTP '+r.status);
   const data=await r.json();stories=data.stories;
   const old=byId('audio-story').value;const select=byId('audio-story');select.replaceChildren();
   const first=document.createElement('option');first.value='';first.textContent='Choisir une histoire…';select.append(first);
   for(const s of stories){const opt=document.createElement('option');opt.value=s.slug;opt.textContent=s.title;select.append(opt)}
   if(stories.some(s=>s.slug===old))select.value=old;
   fill();
  }catch(e){status.textContent='Impossible de charger l’édition audio : '+e.message;}
 }
 byId('audio-story').addEventListener('change',fill);byId('refresh-audio').addEventListener('click',refresh);
 async function write(method,payload){
  const r=await fetch('/api/admin/audio',{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Requested-With':'PodcastAdmin'},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||`Erreur HTTP ${r.status}`);
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();const slug=byId('audio-story').value;if(!slug){status.textContent='Choisissez une histoire.';return;}
  const payload={slug,src:byId('audio-src').value.trim(),platforms:Object.fromEntries(providers.map(p=>[p,byId('audio-'+p).value.trim()]))};
  if(Object.values(payload.platforms).some(value=>value&&!value.startsWith('https://'))||(payload.src&&!payload.src.startsWith('https://'))){status.textContent='Utilisez uniquement des URLs HTTPS ou laissez le champ vide.';return;}
  status.textContent='Enregistrement…';
  try{await write('POST',payload);const s=selected();if(s){s.src=payload.src;s.platforms=payload.platforms;s.custom=true}status.textContent='✓ Podcast enregistré. La bibliothèque sera actualisée immédiatement.';}
  catch(e){status.textContent='Erreur : '+e.message;}
 });
 byId('audio-reset').addEventListener('click',async()=>{
  const slug=byId('audio-story').value;if(!slug){status.textContent='Choisissez une histoire.';return;}
  status.textContent='Restauration de la configuration Git…';
  try{await write('DELETE',{slug});await refresh();status.textContent='✓ Configuration Git restaurée.';}catch(e){status.textContent='Erreur : '+e.message;}
 });
 refresh();
})();

// Assistant hors ligne de création de contenus éditoriaux, aucune publication directe.
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),form=$('admin-new-story-form');if(!form)return;
 const htmlEscape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 function makeZip(files){
  const encoder=new TextEncoder(),parts=[],directory=[];let offset=0;
  const crc32=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
  const header=(size,fill)=>{const b=new Uint8Array(size),v=new DataView(b.buffer);fill(v);return b;};
  const now=new Date(),dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  for(const [filename,content] of files){
   const name=encoder.encode(filename),data=encoder.encode(content),crc=crc32(data);
   const local=header(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(10,dosTime,true);v.setUint16(12,dosDate,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);});
   parts.push(local,name,data);
   const central=header(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(12,dosTime,true);v.setUint16(14,dosDate,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);});
   directory.push(central,name);offset+=local.length+name.length+data.length;
  }
  const directoryLength=directory.reduce((n,b)=>n+b.length,0);
  const end=header(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,directoryLength,true);v.setUint32(16,offset,true);});
  return new Blob([...parts,...directory,end],{type:'application/zip'});
 }
 function downloadZip(name,files){
  const url=URL.createObjectURL(makeZip(files));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 form.addEventListener('submit',e=>{
  e.preventDefault();const title=$('new-title').value.trim(),description=$('new-description').value.trim(),body=$('new-body').value.trim();
  const tags=$('new-tags').value.split(',').map(s=>s.trim()).filter(Boolean);
  const slug=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(!slug||!title||!description||!tags.length||body.length<100){$('new-story-status').textContent='Complétez les champs et prévoyez au moins 100 caractères de récit.';return;}
  const metadata={slug,title,subtitle:'',description,tags,theme:tags[0],emoji:'📖',minutes:'',date:new Date().toISOString().slice(0,10),author:'Griotte Lapone',image:`assets/stories/${slug}.svg`,published:false};
  const paragraphs=body.split(/\n\s*\n/).map(p=>`<p>${htmlEscape(p.trim()).replaceAll('\n','<br>')}</p>`).join('\n');
  downloadZip(`${slug}-brouillon.zip`,[
   [`content/stories/${slug}.json`,JSON.stringify(metadata,null,2)+'\n'],
   [`content/stories/${slug}.html`,paragraphs+'\n']
  ]);
  $('new-story-status').textContent=`Brouillon ${slug} préparé. Dans Git : lancez npm run story:new -- --title "${title}", puis remplacez les fichiers créés par ceux téléchargés et passez published à true pour publier.`;
 });
})();
