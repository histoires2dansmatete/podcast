import {login} from '../../_lib/login.js';
export async function onRequestPost(context){return login(context);}
