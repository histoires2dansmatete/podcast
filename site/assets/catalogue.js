(() => {
  'use strict';
  const grid=document.getElementById('catalogue-grid');if(!grid)return;
  const search=document.getElementById('story-search');const theme=document.getElementById('story-theme');
  const count=document.getElementById('catalogue-count');const empty=document.getElementById('catalogue-empty');
  const make=(tag,name,value)=>{const el=document.createElement(tag);if(name)el.className=name;if(value)el.textContent=value;return el;};
  const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const tagsOf=s=>Array.isArray(s.tags)&&s.tags.length?s.tags:s.theme?.split(/\s*[&·]\s*/).filter(Boolean)||[];
  // Même règle de sécurité que scripts/local-image-path.mjs : les WebP optimisés
  // peuvent résider dans assets/images/optimized/ et ses sous-dossiers.
  const localCover=url=>typeof url==='string'
    && /^assets\/(?:stories|images)\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:svg|png|jpe?g|webp|avif|tiff?|bmp)$/i.test(url)
    && !url.split('/').some(part=>part==='.'||part==='..');
  function card(s){
    const article=make('article','story-card catalogue-card');
    const link=`/histoires/${encodeURIComponent(s.slug)}/`;
    const image=make('a','story-image');image.href=link;image.setAttribute('aria-label',`Découvrir ${s.title}`);
    image.style.background='#ead7c5';image.append(make('span','card-fallback',s.emoji||'✦'));
    if(localCover(s.image)){const img=make('img');img.src=`/${s.image.replace(/^\//,'')}`;img.alt=`Couverture de ${s.title}`;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>{img.src=`/assets/stories/${s.slug}.svg`;},{once:true});image.append(img);}
    image.append(make('span','story-sticker',s.audioUrl ? '♫ Écouter le podcast' : '♫ Bientôt en podcast'));
    const content=make('div','story-content');const category=make('div','catalogue-tag',tagsOf(s).join(' · ')||'Une belle histoire');content.append(category);
    content.append(make('h3','',s.title));if(s.subtitle)content.append(make('div','catalogue-subtitle',s.subtitle));
    content.append(make('p','',s.description||'Une aventure à découvrir en lecture.'));
    const more=make('a','story-link','Découvrir l’histoire ↗');more.href=link;content.append(more);
    article.append(image,content);return article;
  }
  fetch('/data/histoires.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('Catalogue indisponible'))).then(stories=>{
    if(!Array.isArray(stories))throw Error('Catalogue invalide');
    const themes=[...new Set(stories.flatMap(tagsOf).map(t=>t.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
    themes.forEach(t=>{const opt=document.createElement('option');opt.value=t;opt.textContent=t;theme.append(opt)});
    function update(){
      const key=normalize(search.value.trim()),selected=theme.value;
      const filtered=stories.filter(s=>(!selected||tagsOf(s).includes(selected))&&normalize([s.title,s.subtitle,s.description,...tagsOf(s)].join(' ')).includes(key));
      grid.replaceChildren(...filtered.map(card));count.textContent=`${filtered.length} histoire${filtered.length>1?'s':''} à découvrir`;
      empty.hidden=filtered.length>0;
    }
    search.addEventListener('input',update);theme.addEventListener('change',update);update();
  }).catch(()=>{count.textContent='Le catalogue est temporairement indisponible.';empty.textContent='Veuillez réessayer plus tard.';empty.hidden=false;});
})();
