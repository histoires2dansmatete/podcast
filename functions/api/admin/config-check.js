/** Diagnostic de concordance des secrets (aucun secret retourné). */
import {isConfigured,noStore} from '../../_lib/access.js';
import {verifyProof} from '../../_lib/admin-config-proof.js';
const json=(message,status)=>Response.json(message,{status,headers:{...noStore,'X-Robots-Tag':'noindex, nofollow'}});
export async function onRequestPost({request,env}){
 if(!isConfigured(env))return json({match:false,error:'Configuration administrateur indisponible.'},503);
 if(request.headers.get('Sec-Fetch-Site')==='cross-site')return json({match:false},403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return json({match:false},415);
 if(Number(request.headers.get('Content-Length')||0)>512)return json({match:false},413);
 let raw;try{raw=await request.text();}catch{return json({match:false},400)}
 if(raw.length>512)return json({match:false},413);
 let input;try{input=JSON.parse(raw)}catch{return json({match:false},400)}
 const match=await verifyProof(env,input);
 return json({match},match?200:409);
}
