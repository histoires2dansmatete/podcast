import {authorize,noStore} from '../_lib/access.js';
import {adminHTML} from '../_lib/admin-page.js';
/** HTML privé après vérification cryptographique d'un JWT Access. */
export async function onRequestGet(context){
 const denied=await authorize(context);if(denied)return denied;
 return new Response(adminHTML(),{headers:{...noStore,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
