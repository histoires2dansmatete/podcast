/** Initialise une authentification locale sans inscrire de mot de passe dans Git. */
import {passwordHash} from '../functions/_lib/access.js';
import {randomBytes} from 'node:crypto';
import {writeFile,readFile} from 'node:fs/promises';
import {stdin as input,stdout as output} from 'node:process';
let pw='';
if(input.isTTY&&input.setRawMode){
 output.write('Choisissez un mot de passe administrateur (12 caractères minimum) : ');
 input.setRawMode(true);input.resume();
 try{
  pw=await new Promise((resolve,reject)=>{
   let value='';function onData(chunk){for(const ch of chunk.toString('utf8')){
    if(ch==='\r'||ch==='\n'){input.off('data',onData);output.write('\n');resolve(value);return;}
    if(ch==='\u0003'){input.off('data',onData);reject(Error('Annulé'));return;}
    if(ch==='\u007f'||ch==='\b'){value=value.slice(0,-1);continue;}
    if(value.length<256)value+=ch;
   }}input.on('data',onData);
  });
 }finally{input.setRawMode(false);input.pause();}
}else{
 output.write('Mot de passe administrateur (entrée non masquée : utilisez un vrai terminal pour plus de confidentialité) : ');
 for await(const chunk of input){pw+=chunk.toString();if(pw.includes('\n'))break;}
 pw=pw.trimEnd();
}
if(pw.length<12)throw Error('Mot de passe trop court : au moins 12 caractères.');
const hash=await passwordHash(pw);
const secret=randomBytes(32).toString('base64url');
const lines=`# Ne jamais committer ce fichier. Gardez les mêmes valeurs dans Cloudflare Pages Secrets.\nADMIN_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${secret}\n`;
await writeFile('.env.local',lines,{mode:0o600});
console.log('\n✓ .env.local créé. Lancez npm run dev, puis ouvrez http://localhost:5173/admin/');
console.log('✓ Pour la production : copiez les deux variables de .env.local dans les secrets Cloudflare Pages.');
console.log('Attention : regénérer les valeurs invalide toutes les sessions existantes.');
