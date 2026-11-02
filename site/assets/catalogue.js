(() => {
  'use strict';
  const grid=document.getElementById('catalogue-grid');if(!grid)return;
  const search=document.getElementById('story-search');const theme=document.getElementById('story-theme');
  const count=document.getElementById('catalogue-count');const empty=document.getElementById('catalogue-empty');
  const audioFilters=[...document.querySelectorAll('[data-audio-filter]')];let audioFilter='all';
  const hasPodcast=s=>Boolean(s.audioUrl||Object.values(s.platforms||{}).some(Boolean));
  const make=(tag,name,value)=>{const el=document.createElement(tag);if(name)el.className=name;if(value)el.textContent=value;return el;};
  const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const tagsOf=s=>Array.isArray(s.tags)&&s.tags.length?s.tags:s.theme?.split(/\s*[&·]\s*/).filter(Boolean)||[];
  // Même règle de sécurité que scripts/local-image-path.mjs : les WebP optimisés
  // peuvent résider dans assets/images/optimized/ et ses sous-dossiers.
  const localCover=url=>typeof url==='string'
    && /^assets\/(?:stories|images)\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:svg|png|jpe?g|webp|avif|tiff?|bmp)$/i.test(url)
    && !url.split('/').some(part=>part==='.'||part==='..');
  // La vignette Noël est une collection spéciale, pas une histoire WordPress.
  // La date est calculée au chargement pour respecter les réglages du JSON,
  // même après minuit, sans publier les liens des 25 épisodes.
  function christmasAccess(schedule){
    if(!schedule||!['teaserStart','calendarStart','firstEpisode','calendarEnd'].every(k=>/^\d{2}-\d{2}$/.test(schedule[k]||'')))return {open:false,preview:false};
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value=key=>Number(parts.find(part=>part.type===key)?.value);
    const year=value('year'),today=Date.UTC(year,value('month')-1,value('day'));
    const stamp=(y,day)=>Date.UTC(y,Number(day.slice(0,2))-1,Number(day.slice(3)));
    const next=(y,day,after)=>{let date=stamp(y,day);if(date<after)date=stamp(y+1,day);return date;};
    let open=false;
    for(const y of [year-1,year]){
      const teaser=stamp(y,schedule.teaserStart),start=next(y,schedule.calendarStart,teaser);
      const first=next(y,schedule.firstEpisode,start),end=next(y,schedule.calendarEnd,first);
      if(today>=start&&today<=end){open=true;break;}
    }
    const preview=/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('noel-preview');
    return {open,preview};
  }
  function christmasCard(info,preview){
    const story={title:info.title,subtitle:info.subtitle,description:info.description,
      tags:['Noël'],slug:'noel',isChristmas:true,audioUrl:info.hasPodcast?'special:noel':'',platforms:{}};
    const article=make('article','story-card catalogue-card catalogue-card-christmas');
    const link=preview?'/noel/?preview=1':'/noel/';
    const image=make('a','story-image');image.href=link;image.setAttribute('aria-label',`Découvrir le calendrier de Noël : ${story.title}`);
    image.append(make('span','card-fallback','✦'));
    if(localCover(info.image)){
      const img=make('img');img.src=`/${info.image}`;img.alt='Illustration du calendrier de Noël';
      img.loading='eager';img.decoding='async';img.width=600;img.height=470;
      img.addEventListener('error',()=>{img.src='/assets/images/noel-teaser.svg';},{once:true});
      image.append(img);
    }
    image.append(make('span','story-sticker',story.audioUrl?'♫ Calendrier audio':'✦ Spécial Noël'));
    const content=make('div','story-content');content.append(make('div','catalogue-tag','✦ Histoire spéciale Noël'));
    content.append(make('h3','',story.title));if(story.subtitle)content.append(make('div','catalogue-subtitle',story.subtitle));
    content.append(make('p','',story.description||'25 cases à découvrir pendant les fêtes.'));
    const more=make('a','story-link','Découvrir les 25 cases ↗');more.href=link;content.append(more);
    article.append(image,content);
    return {story,node:article};
  }
  function card(s,index){
    const article=make('article','story-card catalogue-card');
    const link=`/histoires/${encodeURIComponent(s.slug)}/`;
    const image=make('a','story-image');image.href=link;image.setAttribute('aria-label',`Découvrir ${s.title}`);
    image.style.background='#ead7c5';image.append(make('span','card-fallback',s.emoji||'✦'));
    if(localCover(s.image)){const img=make('img');img.src=`/${s.image.replace(/^\//,'')}`;img.alt=`Couverture de ${s.title}`;img.loading=index<6?'eager':'lazy';img.decoding='async';img.width=600;img.height=470;if(index>=6)img.fetchPriority='low';img.addEventListener('error',()=>{img.src=`/assets/stories/${s.slug}.svg`;},{once:true});image.append(img);}
    image.append(make('span','story-sticker',hasPodcast(s) ? '♫ Podcast disponible' : '◷ À lire · podcast à venir'));
    const content=make('div','story-content');const category=make('div','catalogue-tag',tagsOf(s).join(' · ')||'Une belle histoire');content.append(category);
    content.append(make('h3','',s.title));if(s.subtitle)content.append(make('div','catalogue-subtitle',s.subtitle));
    content.append(make('p','',s.description||'Une aventure à découvrir en lecture.'));
    const more=make('a','story-link',hasPodcast(s)?'Lire ou écouter l’histoire ↗':'Lire l’histoire ↗');more.href=link;content.append(more);
    article.append(image,content);return article;
  }
  Promise.all([
    fetch('/data/histoires.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('Catalogue indisponible'))),
    fetch('/data/noel-promo.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([stories,promo])=>{
    if(!Array.isArray(stories))throw Error('Catalogue invalide');
    let seasonal=null;
    if(promo && typeof promo==='object' && typeof promo.title==='string' && promo.title.trim() && typeof promo.hasPodcast==='boolean'){
      const season=christmasAccess(promo.schedule);
      if(season.open||season.preview)seasonal=christmasCard(promo,season.preview && !season.open);
    }
    const themes=[...new Set([...stories.flatMap(tagsOf),...(seasonal?['Noël']:[])].map(t=>t.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
    themes.forEach(t=>{const opt=document.createElement('option');opt.value=t;opt.textContent=t;theme.append(opt)});
    // Construire chaque carte une seule fois : changer un filtre ne doit jamais
    // retirer/recréer les balises <img> (source des flashes observés).
    const rendered=stories.map((s,index)=>({story:s,node:card(s,index)}));
    if(seasonal)rendered.unshift(seasonal);
    grid.replaceChildren(...rendered.map(item=>item.node));
    function update(){
      const key=normalize(search.value.trim()),selected=theme.value;
      let visible=0;
      for(const {story,node} of rendered){
        const matches=(!selected||tagsOf(story).includes(selected))
          &&(audioFilter==='all'||(audioFilter==='audio' ? hasPodcast(story):(!hasPodcast(story)&&!story.isChristmas)))
          &&normalize([story.title,story.subtitle,story.description,...tagsOf(story)].join(' ')).includes(key);
        node.hidden=!matches;
        if(matches)visible++;
      }
      count.textContent=`${visible} histoire${visible>1?'s':''} à découvrir`;
      empty.hidden=visible>0;
    }
    audioFilters.forEach(button=>button.addEventListener('click',()=>{audioFilter=button.dataset.audioFilter;audioFilters.forEach(b=>{b.classList.toggle('is-active',b===button);b.setAttribute('aria-pressed',String(b===button));});update();}));
    search.addEventListener('input',update);theme.addEventListener('change',update);update();
  }).catch(()=>{count.textContent='Le catalogue est temporairement indisponible.';empty.textContent='Veuillez réessayer plus tard.';empty.hidden=false;});
})();
