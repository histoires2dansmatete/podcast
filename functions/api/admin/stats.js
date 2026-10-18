import {authorize,noStore} from '../../_lib/access.js';
export async function onRequestGet(context){
 const denied=await authorize(context);if(denied)return denied;
 const db=context.env.ANALYTICS_DB;
 if(!db)return Response.json({error:'D1 non configurée : liaison ANALYTICS_DB manquante'},{status:503,headers:noStore});
 const n=Number(new URL(context.request.url).searchParams.get('days'));
 const days=[7,30,90].includes(n)?n:30;
 const cutoff=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
 try{
  const queries={
   overview:db.prepare("SELECT SUM(CASE WHEN event='pageview' THEN 1 ELSE 0 END) AS pageviews,COUNT(DISTINCT CASE WHEN event='pageview' THEN session_digest END) AS sessions, SUM(CASE WHEN event='audio_play' THEN 1 ELSE 0 END) AS audio_plays, SUM(CASE WHEN event='platform_click' THEN 1 ELSE 0 END) AS platform_clicks FROM visits WHERE day >= ?").bind(cutoff),
   timeline:db.prepare("SELECT day,COUNT(*) AS views,COUNT(DISTINCT session_digest) AS sessions FROM visits WHERE day >= ? AND event='pageview' GROUP BY day ORDER BY day").bind(cutoff),
   pages:db.prepare("SELECT page AS label,COUNT(*) AS count FROM visits WHERE day >= ? AND event='pageview' GROUP BY page ORDER BY count DESC LIMIT 20").bind(cutoff),
   referrers:db.prepare("SELECT referrer_host AS label,COUNT(*) AS count FROM visits WHERE day >= ? AND event='pageview' GROUP BY referrer_host ORDER BY count DESC LIMIT 15").bind(cutoff),
   countries:db.prepare("SELECT country AS label,COUNT(*) AS count FROM visits WHERE day >= ? AND event='pageview' GROUP BY country ORDER BY count DESC LIMIT 15").bind(cutoff),
   browsers:db.prepare("SELECT browser AS label,COUNT(*) AS count FROM visits WHERE day >= ? AND event='pageview' GROUP BY browser ORDER BY count DESC LIMIT 6").bind(cutoff),
   devices:db.prepare("SELECT device AS label,COUNT(*) AS count FROM visits WHERE day >= ? AND event='pageview' GROUP BY device ORDER BY count DESC LIMIT 5").bind(cutoff),
   interactions:db.prepare("SELECT page AS label,event,COUNT(*) AS count FROM visits WHERE day >= ? AND event != 'pageview' GROUP BY page,event ORDER BY count DESC LIMIT 20").bind(cutoff)
  };
  const results=await Promise.all(Object.values(queries).map(q=>q.all()));
  const entries=Object.fromEntries(Object.keys(queries).map((key,i)=>[key,key==='overview'?(results[i].results[0]||{}):results[i].results]));
  return Response.json({days,from:cutoff,to:new Date().toISOString().slice(0,10),...entries,note:'Les sessions sont des identifiants aléatoires éphémères renouvelés chaque jour. Les chiffres concernent seulement les visiteurs ayant accepté le suivi ; ils ne représentent pas toutes les personnes.'},{headers:noStore});
 }catch(error){console.error('Stats:',error.message);return Response.json({error:'Lecture D1 impossible. Exécutez db/schema.sql.'},{status:503,headers:noStore})}
}
