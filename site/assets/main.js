(() => {
  'use strict';
  const nav = document.getElementById('primary-nav');
  const toggle = document.querySelector('.menu-toggle');
  if (toggle && nav) {
    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
      nav.classList.remove('is-open');
    };
    toggle.addEventListener('click', () => {
      const opened = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!opened));
      toggle.setAttribute('aria-label', opened ? 'Ouvrir le menu' : 'Fermer le menu');
      nav.classList.toggle('is-open', !opened);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
  }

  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('.story-card'));
  const empty = document.getElementById('filter-empty');
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let displayed = 0;
    cards.forEach(card => {
      const matched = filter === 'toutes' || (card.dataset.categories || '').split(' ').includes(filter);
      card.hidden = !matched;
      if (matched) displayed++;
    });
    if (empty) empty.hidden = displayed !== 0;
  }));

  // Un lien n'est activé QUE si l'adresse exacte a été ajoutée dans config.js.
  const platforms = window.PODCAST_CONFIG?.platforms || {};
  let available = 0;
  document.querySelectorAll('[data-platform]').forEach(link => {
    const url = link.getAttribute('href') || platforms[link.dataset.platform];
    if (typeof url !== 'string' || !/^https:\/\/[^\s]+$/i.test(url)) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return;
      link.href = parsed.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.removeAttribute('aria-disabled');
      link.classList.add('is-available');
      const status = link.querySelector('.platform-status');
      if (status) status.textContent = 'Écouter ↗';
      available++;
    } catch (_) { /* URL manquante ou incorrecte : plateforme laissée en attente */ }
  });
  const disclaimer = document.getElementById('platform-disclaimer');
  if (available > 0 && disclaimer) {
    disclaimer.textContent = available === 4
      ? 'Le podcast est disponible ! Choisissez votre application préférée pour l’écouter.'
      : 'Le podcast est disponible sur les plateformes indiquées « Écouter ». Les autres liens seront ajoutés prochainement.';
    const pill = document.querySelector('.listen-pill');
    if (pill) pill.innerHTML = '<span class="pulse-dot"></span> Le podcast est disponible !';
  }

  document.querySelectorAll('img[data-fallback]').forEach(img => {
    img.addEventListener('error', function fallback() {
      this.removeEventListener('error', fallback);
      this.src = this.dataset.fallback;
    }, { once: true });
  });
  document.querySelectorAll('img[data-episode-image]').forEach(img => {
    img.addEventListener('error', () => {img.hidden = true;const symbol = img.nextElementSibling;if(symbol)symbol.hidden=false;}, {once:true});
  });
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Les couvertures retirées de publication ne doivent plus figurer sur l'accueil.
  const coverNodes = [...document.querySelectorAll('.cover-card[data-story-slug]')];
  if(coverNodes.length){
    fetch('/data/histoires.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(stories=>{
      const active=new Set(stories.map(s=>s.slug));
      const bySlug=new Map(stories.map(s=>[s.slug,s]));
      coverNodes.forEach(card=>{const s=bySlug.get(card.dataset.storySlug);const img=card.querySelector('img.cover-image');if(s&&img){img.dataset.fallback=`/assets/stories/${s.slug}.svg`;img.src=`/${s.image.replace(/^\//,'')}`;}
        if(s){const ready=Boolean(s.audioUrl || Object.values(s.platforms||{}).some(Boolean));const badge=card.querySelector('.cover-status');card.dataset.podcastStatus=ready?'available':'upcoming';if(badge){badge.className=`cover-status cover-status-${card.dataset.podcastStatus}`;badge.textContent=ready?'♫ Podcast disponible':'◷ Podcast à venir';}const footnote=card.querySelector('.cover-footnote');if(footnote)footnote.textContent=ready?'DÉJÀ À ÉCOUTER':'À LIRE, BIENTÔT À ÉCOUTER';}
      });
      coverNodes.forEach(card=>{if(!active.has(card.dataset.storySlug)){card.remove();}});
      const cards=[...document.querySelectorAll('.cover-card[data-cover]')];
      cards.forEach((card,n)=>card.dataset.cover=String(n));
      if(cards.length)document.querySelector('.hero-art')?.dispatchEvent(new Event('covers:updated'));
    }).catch(()=>{coverNodes.forEach(card=>card.hidden=true);});
  }

  // Galerie de couvertures : avance automatiquement, arrêt au survol et au clavier.
  const covers = [...document.querySelectorAll('.cover-card[data-cover]')];
  const coverArea = document.querySelector('.hero-art');
  if (covers.length > 1 && coverArea) {
    let active = 0; let paused = false;
    const indexLabel = document.querySelector('.cover-index');
    const show = (i) => {
      const visible=covers.filter(c=>c.isConnected && !c.hidden);
      if(!visible.length)return;
      active = (i + visible.length) % visible.length;
      visible.forEach((card, n) => {
        const delta = (n - active + visible.length) % visible.length;
        card.classList.toggle('cover-card-active',delta===0);
        card.classList.toggle('cover-card-stacked',delta!==0);
        card.style.setProperty('--stack',delta);
        card.setAttribute('aria-hidden',String(delta!==0));
      });
      if(indexLabel) indexLabel.textContent = `${active + 1} / ${visible.length}`;
      const sticker=coverArea.querySelector('.floating-sticker');
      if(sticker){const ready=visible[active].dataset.podcastStatus==='available';const caption=sticker.querySelector('span:first-child');const title=sticker.querySelector('strong');if(caption)caption.textContent=ready?'À écouter':'Le podcast';if(title)title.textContent=ready?'ici !':'arrive !';sticker.setAttribute('aria-label',ready?'Un podcast est disponible':'Le podcast arrive bientôt');}
      const controls=document.querySelector('.cover-controls');if(controls)controls.hidden=visible.length<2;
    };
    document.querySelector('.cover-prev')?.addEventListener('click',()=>show(active-1));
    document.querySelector('.cover-next')?.addEventListener('click',()=>show(active+1));
    coverArea.addEventListener('covers:updated',()=>show(0));
    let swipeX=null,swipeY=null;
    coverArea.addEventListener('touchstart',e=>{const touch=e.changedTouches?.[0];if(touch){swipeX=touch.clientX;swipeY=touch.clientY;}},{passive:true});
    coverArea.addEventListener('touchend',e=>{const touch=e.changedTouches?.[0];if(!touch||swipeX===null)return;const dx=touch.clientX-swipeX,dy=touch.clientY-swipeY;swipeX=null;swipeY=null;if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.3)show(active+(dx<0?1:-1));},{passive:true});
    coverArea.addEventListener('mouseenter',()=>{paused=true;});
    coverArea.addEventListener('mouseleave',()=>{paused=false;});
    coverArea.addEventListener('focusin',()=>{paused=true;});
    coverArea.addEventListener('focusout',()=>{paused=false;});
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    show(0);
    const rotationMs=Math.max(2000,Math.min(30000,Number(document.querySelector('.cover-controls')?.dataset.rotationMs)||4600));
    window.setInterval(()=>{if(!paused && !document.hidden && !reduce.matches) show(active+1);},rotationMs);
  }
})();

// Fonctionnalités légères des pages récit : partage natif et lecture améliorée.
(() => {
 'use strict';
 const share=document.querySelector('[data-story-share]');
 if(share){
  const feedback=document.querySelector('[data-share-feedback]');
  share.addEventListener('click',async()=>{
   const url=new URL(share.dataset.sharePath||location.pathname,location.origin).href;
   const title=share.dataset.shareTitle||document.title;
   try{
    if(navigator.share){await navigator.share({title,url,text:`Découvrez « ${title} »`});if(feedback)feedback.textContent='Histoire partagée !';}
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);if(feedback)feedback.textContent='Lien de l’histoire copié !';}
    else {if(feedback){feedback.replaceChildren();const a=document.createElement('a');a.href=url;a.textContent='Ouvrir le lien de cette histoire';feedback.append(a);}}
   }catch(e){if(e?.name!=='AbortError'&&feedback)feedback.textContent='Le partage est indisponible sur ce navigateur.';}
  });
 }
 const formatTime=s=>Number.isFinite(s)?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'—';
 function setupPlayer(root){
  let audio=root.querySelector('audio');
  const time=root.querySelector('[data-audio-time]');
  const back=root.querySelector('[data-audio-back]');
  const next=root.querySelector('[data-audio-forward]');
  const rate=root.querySelector('[data-audio-rate]');
  if(!audio)return;
  const render=()=>{if(time)time.textContent=`${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;};
  if(back)back.addEventListener('click',()=>{audio.currentTime=Math.max(0,audio.currentTime-15);});
  if(next)next.addEventListener('click',()=>{audio.currentTime=Math.min(Number.isFinite(audio.duration)?audio.duration:Infinity,audio.currentTime+15);});
  if(rate)rate.addEventListener('change',()=>{audio.playbackRate=Number(rate.value)||1;});
  audio.addEventListener('loadedmetadata',render);audio.addEventListener('timeupdate',render);audio.addEventListener('durationchange',render);render();
  if('mediaSession' in navigator && typeof MediaMetadata!=='undefined'){
   try{
    const art=document.querySelector('.episode-visual img')?.src;
    navigator.mediaSession.metadata=new MediaMetadata({title:document.querySelector('.episode-hero h1')?.textContent||document.title,artist:'Les histoires de Dans ma tête',...(art?{artwork:[{src:art}]}:{})});
    navigator.mediaSession.setActionHandler('seekbackward',e=>{audio.currentTime=Math.max(0,audio.currentTime-(e.seekOffset||15));});
    navigator.mediaSession.setActionHandler('seekforward',e=>{audio.currentTime=Math.min(Number.isFinite(audio.duration)?audio.duration:Infinity,audio.currentTime+(e.seekOffset||15));});
   }catch{/* Media Session facultative selon le navigateur */}
  }
 }
 // L'admin peut publier un lien audio dans D1 après le build. Le catalogue
 // public reflète cet état et active le lecteur de la fiche sans redéploiement.
 const slug=location.pathname.match(/^\/histoires\/([a-z0-9-]+)\/?(?:index\.html)?$/)?.[1];
 if(slug){
  fetch('/data/histoires.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(stories=>{
   const s=stories.find(s=>s.slug===slug);if(!s)return;
   const player=document.querySelector('[data-audio-player]');
   const source=s.audioUrl||'';
   const allowed=/^assets\/audio\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:mp3|m4a|ogg)$/i.test(source)||(/^https:\/\//i.test(source)&&!/[\s"<>]/.test(source));
   const nextSrc=allowed?new URL(source.startsWith('assets/')?'/'+source:source,location.origin).href:'';
   if(player){
    const existing=player.querySelector('audio');
    if(nextSrc && existing && existing.src===nextSrc){ /* Conserver l'état du lecteur en cours */ }
    else if(nextSrc){
     existing?.pause();player.replaceChildren();player.classList.remove('episode-player-waiting');
     const illustration=document.querySelector('.episode-visual img');if(illustration){const thumb=illustration.cloneNode(false);thumb.className='player-cover';thumb.alt='';thumb.loading='lazy';thumb.width=72;thumb.height=96;player.append(thumb);}
     const copy=document.createElement('div');copy.className='player-copy';const b=document.createElement('strong');b.textContent='L’épisode à écouter';const desc=document.createElement('span');desc.textContent=s.title;copy.append(b,desc);player.append(copy);
     const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=nextSrc;audio.setAttribute('aria-label','Écouter '+s.title);player.append(audio);
     const tools=document.createElement('div');tools.className='audio-tools';
     tools.innerHTML='<button type="button" data-audio-back aria-label="Reculer de 15 secondes">↶ 15 s</button><button type="button" data-audio-forward aria-label="Avancer de 15 secondes">15 s ↷</button><label for="playback-rate">Vitesse</label><select id="playback-rate" data-audio-rate aria-label="Vitesse de lecture"><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option></select><span data-audio-time aria-live="off">0:00 / —</span>';
     player.append(tools);setupPlayer(player);
    }else if(existing){
     existing.pause();player.replaceChildren();player.classList.add('episode-player-waiting');
     const illustration=document.querySelector('.episode-visual img');if(illustration){const thumb=illustration.cloneNode(false);thumb.className='player-cover';thumb.alt='';thumb.loading='lazy';thumb.width=72;thumb.height=96;player.append(thumb);}
     const copy=document.createElement('div');copy.className='player-copy';const title=document.createElement('strong');title.textContent='Un épisode à découvrir';const desc=document.createElement('span');desc.textContent='Retrouvez les liens d’écoute disponibles ci-dessous, ou lisez le récit.';copy.append(title,desc);player.append(copy);
    }
   }
   const ready=Boolean(nextSrc||Object.values(s.platforms||{}).some(Boolean));
   const episodeCta=document.querySelector('.episode-cta a[href="#audio"]');
   if(episodeCta)episodeCta.textContent=ready?'Écouter l’épisode ♫':'Le podcast arrive ♫';
   for(const link of document.querySelectorAll('.episode-platform[data-platform]')){
    const u=s.platforms?.[link.dataset.platform];let validURL='';
    if(typeof u==='string'&&/^https:\/\//.test(u)){try{const parsed=new URL(u);if(parsed.protocol==='https:')validURL=parsed.href;}catch{}}
    const status=link.querySelector('.platform-status');
    if(validURL){link.href=validURL;link.target='_blank';link.rel='noopener noreferrer';link.removeAttribute('aria-disabled');link.classList.add('episode-platform-ready');if(status)status.textContent='Écouter ↗';}
    else {link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.classList.remove('episode-platform-ready');if(status)status.textContent='À venir';}
   }
  }).catch(()=>{});
 }
 document.querySelectorAll('[data-audio-player]').forEach(setupPlayer);
})();
