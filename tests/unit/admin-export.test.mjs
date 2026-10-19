import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TextEncoder,TextDecoder} from 'node:util';
import vm from 'node:vm';

test('Le formulaire prépare un seul ZIP valide contenant les deux fichiers d’une histoire',async()=>{
 const src=await readFile('site/assets/admin.js','utf8');
 const start=src.indexOf(' function makeZip(files){'),end=src.indexOf('\n function downloadZip(',start);
 assert.ok(start!==-1&&end>start,'Mécanisme ZIP de l’éditeur absent');
 const zipFn=vm.runInNewContext(src.slice(start,end)+'\nmakeZip',{TextEncoder,DataView,Uint8Array,Blob,Date});
 const entries=[['content/stories/petit-ami.json','{"title":"L’amitié"}'],['content/stories/petit-ami.html','<p>Un petit ami aimait lire.</p>']];
 const bytes=new Uint8Array(await zipFn(entries).arrayBuffer());
 const view=new DataView(bytes.buffer),decoder=new TextDecoder();
 let offset=0;
 for(const [name,text] of entries){
  assert.equal(view.getUint32(offset,true),0x04034b50,'Signature de fichier ZIP');
  const nameLen=view.getUint16(offset+26,true),dataLen=view.getUint32(offset+18,true);
  const file=decoder.decode(bytes.subarray(offset+30,offset+30+nameLen));
  assert.equal(file,name);assert.equal(decoder.decode(bytes.subarray(offset+30+nameLen,offset+30+nameLen+dataLen)),text);
  offset+=30+nameLen+dataLen;
 }
 assert.equal(view.getUint32(offset,true),0x02014b50,'Index central ZIP');
 assert.ok(bytes.length>offset+46);
 assert.match(src,/published:false/, 'Toute nouvelle histoire doit démarrer en brouillon');
});
