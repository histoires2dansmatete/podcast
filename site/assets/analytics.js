/* Statistiques facultatives : rien n'est envoyé sans consentement préalable. */
(()=>{
'use strict';
const consentKey='dmt_analytics_optin_v1';
const isAdmin=location.pathname.startsWith('/admin')||location.pathname.startsWith('/api/');
if(isAdmin||/\b(?:localhost|127\.0\.0\.1)\b/.test(location.hostname))return;
function state(){try{return localStorage.getItem(consentKey)}catch{return null}}
function setState(v){try{localStorage.setItem(consentKey,v)}catch{}}
let accepted=state()==='yes';
let session;
const sessionId=()=>{
 if(!session){try{session=sessionStorage.getItem('dmt_session_v1');if(!session){session=crypto.randomUUID();sessionStorage.setItem('dmt_session_v1',session)}}catch{session=crypto.randomUUID()}}
 return session;
};
const device=()=>{const ua=navigator.userAgent||'';return /iPad|Tablet/i.test(ua)?'tablet':/Mobile|Android|iPhone/i.test(ua)?'mobile':'desktop'};
const page=()=>location.pathname==='/'?'/':location.pathname;
const browser=()=>{const ua=navigator.userAgent||'';return /Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'other'};
function track(event='pageview'){
 if(!accepted)return;
 const data={consent:true,session:sessionId(),page:page(),event,referrer:(()=>{try{return new URL(document.referrer).origin}catch{return ''}})(),device:device(),browser:browser()};
 fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true,credentials:'omit'}).catch(()=>{});
}
function showBanner(){
 if(state()!==null)return;
 const box=document.createElement('aside');box.className='analytics-consent';box.setAttribute('aria-label','Choix des statistiques');
 const txt=document.createElement('p');txt.textContent='Pour comprendre quelles histoires plaisent le plus, nous proposons des statistiques anonymisées (pages vues, provenance générale, appareils). Rien n’est envoyé sans votre accord. Vous pouvez changer d’avis sur la page Confidentialité.';
 const actions=document.createElement('div');
 const no=document.createElement('button');no.type='button';no.textContent='Refuser';
 const yes=document.createElement('button');yes.type='button';yes.className='consent-yes';yes.textContent='Accepter les statistiques';
 no.addEventListener('click',()=>{setState('no');box.remove()});
 yes.addEventListener('click',()=>{accepted=true;setState('yes');box.remove();track()});
 actions.append(no,yes);box.append(txt,actions);document.body.append(box);
}
window.DMT_ANALYTICS={track,withdraw(){accepted=false;setState('no')},accept(){accepted=true;setState('yes');track()},status:()=>state()};
window.addEventListener('DOMContentLoaded',()=>{document.getElementById('analytics-deny')?.addEventListener('click',e=>{window.DMT_ANALYTICS.withdraw();e.target.textContent='Statistiques désactivées'});document.getElementById('analytics-allow')?.addEventListener('click',e=>{window.DMT_ANALYTICS.accept();e.target.textContent='Statistiques activées'});});
if(accepted)track(); else if(state()===null)window.addEventListener('DOMContentLoaded',showBanner,{once:true});
window.addEventListener('click',event=>{
 if(!accepted)return;
 const node=event.target.closest('a');
 if(node && (node.matches('[data-platform]')||/spotify\.com|podcasts\.apple\.com|deezer\.com|music\.amazon\./i.test(node.href)))track('platform_click');
});
const reading=document.querySelector('.reading-end');
if(reading&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();track('story_end')}},{threshold:0.7});observer.observe(reading)}
window.addEventListener('play',event=>{if(event.target instanceof HTMLAudioElement)track('audio_play')},true);
})();
