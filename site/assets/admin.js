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
$('days').addEventListener('change',load);load();
})();
