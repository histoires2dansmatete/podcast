(()=>{
 'use strict';
 const node=document.getElementById('christmas-data');
 if(!node)return;
 let data;
 try{data=JSON.parse(node.textContent);}catch{return;}
 const status=document.getElementById('christmas-status');
 const panel=document.getElementById('christmas-player');
 const content=document.getElementById('christmas-player-content');
 const close=document.getElementById('christmas-close');
 const schedule=data.schedule||{teaserStart:'11-01',calendarStart:'11-25',firstEpisode:'12-01',calendarEnd:'12-26'};
 const DAY=86400000;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const value=type=>Number(parts.find(p=>p.type===type)?.value);
 const year=value('year'),today=Date.UTC(year,value('month')-1,value('day'));
 const stamp=(y,md)=>Date.UTC(y,Number(md.slice(0,2))-1,Number(md.slice(3)));
 const next=(y,md,after)=>{let d=stamp(y,md);if(d<after)d=stamp(y+1,md);return d;};
 let opening=null,firstEpisode=null,unlocked=0;
 for(const y of [year-1,year]){
  const teaser=stamp(y,schedule.teaserStart),start=next(y,schedule.calendarStart,teaser),first=next(y,schedule.firstEpisode,start),end=next(y,schedule.calendarEnd,first);
  if(today>=start&&today<=end){opening=start;firstEpisode=first;unlocked=today>=first?Math.min(25,Math.floor((today-first)/DAY)+1):0;break;}
 }
 const localPreview=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&new URLSearchParams(location.search).get('preview')==='1';
 if(localPreview)unlocked=25;
 const episodeLabel=n=>{
  // Ancre stable, même pendant un aperçu local hors saison.
  const first=firstEpisode??next(year,schedule.firstEpisode,next(year,schedule.calendarStart,stamp(year,schedule.teaserStart)));
  return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(first+(n-1)*DAY));
 };
 const introductionAudio=document.getElementById('christmas-intro-audio');
 if(introductionAudio){
  const source=introductionAudio.dataset.src;
  if(source)introductionAudio.src=source.startsWith('https://')?source:'/'+source+(localPreview?'?preview=1':'');
  introductionAudio.addEventListener('play',()=>content.querySelector('audio')?.pause());
 }
 const opened=new Set();
 const episodes=new Map(data.episodes.map(e=>[e.day,e]));
 const closePanel=()=>{content.querySelector('audio')?.pause();content.replaceChildren();panel.hidden=true;};
 close.addEventListener('click',closePanel);
 document.querySelectorAll('.christmas-door').forEach(button=>{
  const n=Number(button.dataset.day),allowed=n<=unlocked;
  button.disabled=!allowed;
  button.classList.toggle('is-unlocked',allowed);
  button.classList.toggle('is-locked',!allowed);
  button.querySelector('.door-caption').textContent=allowed?'Ouvrir la case':'Bientôt…';
  button.setAttribute('aria-label',allowed?`Ouvrir la case ${n}`:`Case ${n}, disponible le ${episodeLabel(n)}`);
  button.addEventListener('click',()=>{
   if(!allowed)return;
   closePanel();
   introductionAudio?.pause();
   opened.add(n);button.classList.add('is-listened');
   const episode=episodes.get(n);
   document.getElementById('christmas-player-day').textContent=`CASE ${n} SUR 25`;
   document.getElementById('christmas-player-title').textContent=episode.title;
   const p=document.createElement('p');
   if(episode.src){
    const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=episode.src.startsWith('https://')?episode.src:'/'+episode.src+(localPreview?'?preview=1':'');
    audio.setAttribute('aria-label',`Écouter la partie ${n} de l’histoire de Noël`);
    content.append(audio);
   }else if(!episode.platformUrl){p.textContent='Cette partie est prête à être racontée. Son enregistrement audio sera bientôt ajouté.';content.append(p);}
   if(episode.platformUrl){const link=document.createElement('a');link.className='christmas-platform-link';link.href=episode.platformUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Écouter cet épisode sur la plateforme ↗';content.append(link);}
   panel.hidden=false;panel.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  });
 });
 status.textContent=localPreview?'Mode aperçu local : les 25 cases sont ouvertes.':unlocked===0?`Les portes sont en place ! La première s’ouvrira le ${episodeLabel(1)}.`:unlocked===25?'Les 25 cases sont ouvertes ! Vous pouvez écouter toute l’histoire.':`${unlocked} case${unlocked>1?'s':''} ouverte${unlocked>1?'s':''} sur 25. Revenez demain pour la suite !`;
})();
