/** Endpoint d'analyse opt-in ; paramètres strictement limités. */
const response=(obj,status=200)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'null','X-Content-Type-Options':'nosniff'}});
const digest=async (session,day,salt)=>{
 const data=new TextEncoder().encode(`${salt}:${day}:${session}`);
 const hash=await crypto.subtle.digest('SHA-256',data);
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
};
export async function onRequestPost({request,env}){
 if(!env.ANALYTICS_DB || !env.ANALYTICS_SALT)return response({error:'Statistiques non configurées'},503);
 if(Number(request.headers.get('content-length')||'0')>2048)return response({error:'Trop volumineux'},413);
 const url=new URL(request.url);
 const origin=request.headers.get('Origin');
 if(origin!==url.origin)return response({error:'Origine refusée'},403);
 if(request.headers.get('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site')!=='same-origin')return response({error:'Site refusé'},403);
 if(request.headers.get('Content-Type')?.split(';')[0] !== 'application/json')return response({error:'Type invalide'},415);
 let b;try{b=await request.json();}catch{return response({error:'JSON invalide'},400)}
 if(!b||b.consent!==true||typeof b.session!=='string'||!/^[a-f0-9-]{20,50}$/i.test(b.session))return response({error:'Consentement ou session invalide'},400);
 const event=String(b.event||'');
 if(!['pageview','audio_play','platform_click','story_end'].includes(event))return response({error:'Événement invalide'},400);
 const page=String(b.page||'');
 if(!/^\/$|^\/(?:index|histoires|ecouter|qui-suis-je|confidentialite)\.html$|^\/histoires\/[a-z0-9-]+\/$/.test(page)||page.length>150)return response({error:'Chemin invalide'},400);
 const device=['mobile','tablet','desktop'].includes(b.device)?b.device:'other';
 const browser=['Chrome','Safari','Firefox','Edge','other'].includes(b.browser)?b.browser:'other';
 let referrer='direct';
 if(typeof b.referrer==='string' && b.referrer.length<=250){try{const host=new URL(b.referrer).hostname.toLowerCase();if(/^[a-z0-9.-]{3,100}$/.test(host))referrer=host;}catch{}}
 const cf=request.cf||{};
 const country=/^[A-Z]{2}$/.test(cf.country||'')?cf.country:'XX';
 const now=new Date(); const day=now.toISOString().slice(0,10);
 const hash=await digest(b.session,day,String(env.ANALYTICS_SALT));
 try{
  // Nettoyage automatique des mesures anciennes, sans conserver les identifiants des visiteurs.
  await env.ANALYTICS_DB.prepare("DELETE FROM visits WHERE day < date('now','-90 days')").run();
  // Déduplication simple des événements répétés dans les 5 secondes.
  const existing=await env.ANALYTICS_DB.prepare("SELECT 1 FROM visits WHERE session_digest=? AND page=? AND event=? AND time > datetime('now','-5 seconds') LIMIT 1").bind(hash,page,event).first();
  if(existing)return response({ok:true});
  await env.ANALYTICS_DB.prepare('INSERT INTO visits(day,time,session_digest,page,event,referrer_host,country,device,browser) VALUES(?,?,?,?,?,?,?,?,?)').bind(day,now.toISOString().replace('T',' ').replace('Z',''),hash,page,event,referrer,country,device,browser).run();
  return response({ok:true});
 }catch(error){console.error('D1 analytics:',error.message);return response({error:'Service indisponible'},503)}
}
export const onRequestGet=()=>response({error:'Méthode interdite'},405);
