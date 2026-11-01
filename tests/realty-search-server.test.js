import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('backend boots without paid credentials and does not invent listings',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'dx-realty-test-'));
 const port=18093;
 const server=spawn(process.execPath,['realty-search/server.mjs'],{
   env:{...process.env,PORT:String(port),DATA_DIR:dir,DATAFORSEO_LOGIN:'',DATAFORSEO_PASSWORD:''},
   stdio:'ignore'
 });
 try{
   let response=null;
   for(let i=0;i<45;i++){
     if(server.exitCode!==null)throw Error('Server exited before healthcheck');
     try{response=await fetch('http://127.0.0.1:'+port+'/health');break;}
     catch{await delay(90);}
   }
   assert.ok(response?.ok,'Healthcheck did not start');
   const health=await response.json();
   assert.equal(health.status,'configuration_required');
   const feed=await (await fetch('http://127.0.0.1:'+port+'/api/realty/feed.json')).json();
   assert.deepEqual(feed.items,[]);
   assert.equal(feed.status,'configuration_required');
   const noAuth=await fetch('http://127.0.0.1:'+port+'/api/realty/refresh',{method:'POST'});
   assert.equal(noAuth.status,401);
 }finally{
   server.kill('SIGTERM');
   await delay(120);
   await rm(dir,{recursive:true,force:true});
 }
});
