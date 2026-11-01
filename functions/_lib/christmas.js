/** Calendrier saisonnier. Les dates MM-JJ sont récurrentes et calculées en Europe/Paris. */
export const DEFAULT_CHRISTMAS_SCHEDULE=Object.freeze({
  teaserStart:'11-01', calendarStart:'11-25', firstEpisode:'12-01', calendarEnd:'12-26'
});
const DAY=86400000;
const dayParts=/^(\d{2})-(\d{2})$/;
function splitDay(value){
  if(typeof value!=='string')throw Error('Noël : date attendue au format MM-JJ');
  const found=dayParts.exec(value);
  if(!found)throw Error(`Noël : date ${value} invalide (format MM-JJ)`);
  const month=Number(found[1]),day=Number(found[2]);
  const valid=new Date(Date.UTC(2025,month-1,day));
  if(valid.getUTCMonth()!==month-1||valid.getUTCDate()!==day)throw Error(`Noël : date ${value} impossible`);
  return {month,day};
}
const utcDate=(year,value)=>{const {month,day}=splitDay(value);return Date.UTC(year,month-1,day);};
function upcoming(year,value,after){
  let date=utcDate(year,value);
  if(date<after)date=utcDate(year+1,value);
  return date;
}
export function validateChristmasSchedule(schedule=DEFAULT_CHRISTMAS_SCHEDULE){
  if(!schedule||typeof schedule!=='object'||Array.isArray(schedule))throw Error('Noël : schedule invalide');
  const fields=['teaserStart','calendarStart','firstEpisode','calendarEnd'];
  for(const field of fields)splitDay(schedule[field]);
  const teaser=utcDate(2025,schedule.teaserStart);
  const opening=upcoming(2025,schedule.calendarStart,teaser);
  const first=upcoming(2025,schedule.firstEpisode,opening);
  const closing=upcoming(2025,schedule.calendarEnd,first);
  if(closing-first<24*DAY)throw Error('Noël : calendarEnd doit permettre le déblocage des 25 cases');
  if(closing-teaser>180*DAY)throw Error('Noël : la saison ne peut pas dépasser 180 jours');
  return {teaserStart:schedule.teaserStart,calendarStart:schedule.calendarStart,firstEpisode:schedule.firstEpisode,calendarEnd:schedule.calendarEnd};
}
export function christmasOpenLabel(schedule=DEFAULT_CHRISTMAS_SCHEDULE){
  const {month,day}=splitDay(validateChristmasSchedule(schedule).calendarStart);
  return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2025,month-1,day)));
}
export function parisDay(at=new Date()) {
  const fields=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
  const get=type=>Number(fields.find(p=>p.type===type)?.value);
  return {year:get('year'),month:get('month'),day:get('day')};
}
export function christmasState(at=new Date(),schedule=DEFAULT_CHRISTMAS_SCHEDULE) {
  const cfg=validateChristmasSchedule(schedule);
  const {month,day,year}=parisDay(at);
  const today=Date.UTC(year,month-1,day);
  for(const seasonYear of [year-1,year]){
    const teaser=utcDate(seasonYear,cfg.teaserStart);
    const opening=upcoming(seasonYear,cfg.calendarStart,teaser);
    const first=upcoming(seasonYear,cfg.firstEpisode,opening);
    const closing=upcoming(seasonYear,cfg.calendarEnd,first);
    if(today>=teaser&&today<=closing){
      const open=today>=opening;
      const unlocked=open && today>=first?Math.min(25,Math.floor((today-first)/DAY)+1):0;
      return {year,open,unlocked,teaserVisible:true};
    }
  }
  return {year,open:false,unlocked:0,teaserVisible:false};
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
  return new Response('Calendrier de Noël fermé pour cette période.',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'text/plain; charset=utf-8'}});
}
export function christmasHeaders(response) {
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','private, no-store, max-age=0');
  headers.set('X-Robots-Tag','noindex, nofollow');
  headers.set('Vary','Accept-Encoding');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
/** Autorisation commune à Cloudflare et localhost. null = route sans rapport. */
export function christmasAccess(pathname,at=new Date(),schedule=DEFAULT_CHRISTMAS_SCHEDULE) {
  let path;
  try {path=decodeURIComponent(pathname);} catch {return false;}
  const audioRoot=path.startsWith('/assets/audio/noel/');
  if(!christmasPath(path) && !audioRoot)return null;
  const season=christmasState(at,schedule);
  if(!season.open)return false;
  if(!audioRoot)return true;
  if(christmasIntroductionAudio(path))return true;
  const day=christmasAudioDay(path);
  return day!==null && day<=season.unlocked;
}
