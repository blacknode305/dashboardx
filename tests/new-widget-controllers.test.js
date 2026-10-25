import test from 'node:test';
import assert from 'node:assert/strict';
import SmartContactsWidget from '../client/js/module/Widget/SmartContacts.js';
import DashboardAIWidget from '../client/js/module/Widget/DashboardAI.js';

test('VCF import searches contacts locally',()=>{
  const widget=new SmartContactsWidget();
  const result=widget.importVCF('BEGIN:VCARD\nVERSION:3.0\nFN:Alex Example\nTEL:+123456\nEMAIL:alex@example.org\nEND:VCARD');
  assert.equal(result.imported,1);
  assert.equal(widget.search('Alex')[0].phone,'+123456');
});
test('AI controller sends no API keys',async()=>{
  let request;
  const ai=new DashboardAIWidget({fetchImpl:async(url,init)=>{request={url,init};return {ok:true,json:async()=>({reply:'Hello'})};}});
  assert.equal(await ai.ask('Hello'),'Hello');
  assert.equal(request.url,'/api/ai/chat');
  assert.equal(request.init.credentials,'same-origin');
  assert.deepEqual(JSON.parse(request.init.body),{message:'Hello',messages:[{role:'user',content:'Hello'}]});
});
test('AI controller rejects untrusted endpoint',()=>{
  assert.throws(()=>new DashboardAIWidget({endpoint:'https://example.org/collect'}));
});

test('AI sends only the recent in-memory dialog as context',async()=>{
  const requests=[];
  const ai=new DashboardAIWidget({fetchImpl:async(_,options)=>{
    requests.push(JSON.parse(options.body));
    return {ok:true,json:async()=>({reply:'Test reply'})};
  }});
  await ai.ask('First question');
  await ai.ask('Follow up');
  assert.deepEqual(requests[1].messages,[
    {role:'user',content:'First question'},
    {role:'assistant',content:'Test reply'},
    {role:'user',content:'Follow up'}
  ]);
});
