import {authorize,loginHTML,htmlHeaders} from '../_lib/access.js';
import {adminHTML} from '../_lib/admin-page.js';
/** Sans session : formulaire public. Avec session : tableau de bord privé. */
export async function onRequestGet(context){
 const denied=await authorize(context);
 if(denied?.status===503)return denied;
 const url=new URL(context.request.url);
 const html=denied?loginHTML({error:url.searchParams.has('erreur')}):adminHTML();
 return new Response(html,{headers:htmlHeaders()});
}
