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
 const monthAndDay=()=>{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return {month:Number(parts.find(x=>x.type==='month').value),day:Number(parts.find(x=>x.type==='day').value)};
 };
 const localPreview=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&new URLSearchParams(location.search).get('preview')==='1';
 const introductionAudio=document.getElementById('christmas-intro-audio');
 if(introductionAudio){
  const source=introductionAudio.dataset.src;
  if(source)introductionAudio.src=source.startsWith('https://')?source:'/'+source+(localPreview?'?preview=1':'');
  introductionAudio.addEventListener('play',()=>content.querySelector('audio')?.pause());
 }
 const {month,day}=monthAndDay();
 const unlocked=localPreview?25:(month===12&&day<=26?Math.min(day,25):0);
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
  button.setAttribute('aria-label',allowed?`Ouvrir la case ${n}`:`Case ${n}, disponible le ${n} décembre`);
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
   }else{p.textContent='Cette partie est prête à être racontée. Son enregistrement audio sera bientôt ajouté.';content.append(p);}
   panel.hidden=false;panel.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  });
 });
 status.textContent=localPreview?'Mode aperçu local : les 25 cases sont ouvertes.':unlocked===0?'Les portes sont en place ! La première s’ouvrira le 1er décembre.':unlocked===25?'Les 25 cases sont ouvertes ! Vous pouvez écouter toute l’histoire.':`${unlocked} case${unlocked>1?'s':''} ouverte${unlocked>1?'s':''} sur 25. Revenez demain pour la suite !`;
})();
