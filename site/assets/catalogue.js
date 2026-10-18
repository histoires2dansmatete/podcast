(() => {
  'use strict';
  const grid = document.getElementById('catalogue-grid');
  if (!grid) return;
  const search = document.getElementById('story-search');
  const theme = document.getElementById('story-theme');
  const count = document.getElementById('catalogue-count');
  const empty = document.getElementById('catalogue-empty');
  const element = (tag, name, value) => { const el = document.createElement(tag); if(name)el.className=name; if(value)el.textContent=value; return el; };
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const validUrl = url => { try {return new URL(url).protocol === 'https:';}catch{return false;} };
  function card(story){
    const article=element('article','story-card catalogue-card');
    const image=element('a','story-image'); image.href=`histoires/${encodeURIComponent(story.slug)}/`;image.setAttribute('aria-label',`Découvrir la fiche de ${story.title}`);
    image.style.background='#ead7c5'; const emoji=element('span','card-fallback',story.emoji || '✦');emoji.setAttribute('aria-hidden','true'); image.append(emoji);
    if(validUrl(story.image)){ const img=element('img','');img.src=story.image;img.alt=`Illustration de ${story.title}`;img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});image.append(img);}
    image.append(element('span','story-sticker','♫ Bientôt en podcast'));
    const content=element('div','story-content');content.append(element('div','catalogue-tag',story.theme||'Une belle histoire'));
    content.append(element('h3','',story.title));if(story.subtitle)content.append(element('div','catalogue-subtitle',story.subtitle));
    content.append(element('p','',story.description||'Une nouvelle aventure à découvrir sur le blog.'));
    const link=element('a','story-link','Découvrir l’histoire ↗');link.href=image.href;content.append(link);
    article.append(image,content);return article;
  }
  fetch('data/histoires.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Impossible de lire le catalogue');return response.json();}).then(stories=>{
    if(!Array.isArray(stories))throw Error('Catalogue invalide');
    [...new Set(stories.map(s=>s.theme).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(t=>{const option=document.createElement('option');option.value=t;option.textContent=t;theme.append(option);});
    function update(){const keyword=normalize(search.value.trim());const filter=theme.value;const matches=stories.filter(s=>(!filter||s.theme===filter) && normalize([s.title,s.subtitle,s.theme,s.description].join(' ')).includes(keyword));grid.replaceChildren(...matches.map(card));count.textContent=`${matches.length} histoire${matches.length>1?'s':''} à découvrir`;empty.hidden=matches.length>0;}
    search.addEventListener('input',update);theme.addEventListener('change',update);update();
  }).catch(()=>{count.textContent='Le catalogue ne peut pas être chargé pour le moment.';empty.textContent='Retrouvez toutes nos histoires sur le blog : histoires2dansmatete.fr';empty.hidden=false;});
})();
