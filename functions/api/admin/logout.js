import {authorize} from '../../_lib/access.js';
import {logout} from '../../_lib/login.js';
export async function onRequestPost(context){const denied=await authorize(context);if(denied)return denied;return logout(context);}
