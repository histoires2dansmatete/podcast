/**
 * Déverrouillage strictement local pour les prévisualisations du calendrier.
 * Ce module n'est importé que par le serveur Node de développement :
 * Cloudflare applique toujours christmasAccess() sans exception.
 */
import {christmasPath,christmasAudioDay,christmasIntroductionAudio} from '../functions/_lib/christmas.js';

export function localChristmasPreview(url,{hostname='127.0.0.1',enabled=false}={}) {
  if(!['localhost','127.0.0.1','::1'].includes(hostname))return false;
  const requestUrl=url instanceof URL?url:new URL(url,'http://localhost');
  const path=requestUrl.pathname;
  if(!christmasPath(path)&&christmasAudioDay(path)===null&&!christmasIntroductionAudio(path))return false;
  return enabled||requestUrl.searchParams.get('preview')==='1';
}
