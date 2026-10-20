/** Calendrier de Noël : horloge serveur, fuseau Europe/Paris (date civile inclusive). */
export function parisDay(at=new Date()) {
  const fields=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
  const get=type=>Number(fields.find(p=>p.type===type)?.value);
  return {year:get('year'),month:get('month'),day:get('day')};
}
export function christmasState(at=new Date()) {
  const {month,day,year}=parisDay(at);
  const open=(month===11&&day>=25)||(month===12&&day<=26);
  const unlocked=month===12&&day>=1&&day<=26?Math.min(day,25):0;
  return {year,open,unlocked};
}
export function christmasAudioDay(pathname) {
  const match=pathname.match(/^\/assets\/audio\/noel\/(0[1-9]|1[0-9]|2[0-5])\.mp3$/);
  return match?Number(match[1]):null;
}
export function christmasIntroductionAudio(pathname) {
  return pathname==='/assets/audio/noel/introduction.mp3';
}
export function christmasPath(pathname) {
  return /^\/noel(?:\/|$)/.test(pathname) || pathname==='/noel.html';
}
export function christmasDenied() {
  return new Response('Ce calendrier de Noël ouvre du 25 novembre au 26 décembre.',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'text/plain; charset=utf-8'}});
}
export function christmasHeaders(response) {
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','private, no-store, max-age=0');
  headers.set('X-Robots-Tag','noindex, nofollow');
  headers.set('Vary','Accept-Encoding');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

/** Autorisation commune aux serveurs Cloudflare et localhost. null = route sans rapport. */
export function christmasAccess(pathname,at=new Date()) {
  let path;
  try {path=decodeURIComponent(pathname);} catch {return false;}
  const audioRoot=path.startsWith('/assets/audio/noel/');
  if(!christmasPath(path) && !audioRoot)return null;
  const season=christmasState(at);
  if(!season.open)return false;
  if(!audioRoot)return true;
  if(christmasIntroductionAudio(path))return true;
  const day=christmasAudioDay(path);
  return day!==null && day<=season.unlocked;
}
