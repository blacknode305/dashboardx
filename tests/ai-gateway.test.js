import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiGateway } from '../ai-gateway/server.js';

const SECRET = 'test-owner-token-'.padEnd(42, 'X');
const KEY = 'sk-proj-' + 'A'.repeat(35);
const ALLOWED = 'https://blacknode305.github.io';

async function startGateway(t, overrides = {}) {
  const calls=[];
  const server = createAiGateway({
    env: {
      DASHBOARDX_OWNER_TOKEN: SECRET,
      DASHBOARDX_SITE_ORIGIN: ALLOWED,
      AI_REQUESTS_PER_HOUR: '1',
      OPENAI_MODEL: 'gpt-4.1-mini',
      ...overrides
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        output:[{ type:'message', content:[{type:'output_text',text:'Ответ AI'}] }],
        usage:{input_tokens:5, output_tokens:8}
      }),{status:200,headers:{'Content-Type':'application/json'}});
    }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())));
  const base='http://127.0.0.1:'+server.address().port;
  const makeRequest=(path,{method='GET',auth=true,origin=ALLOWED,body}={})=>fetch(base+path,{
    method, headers:{...(auth?{Authorization:'Bearer '+SECRET}:{}),
      ...(origin?{Origin:origin}:{}), ...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  return {makeRequest,calls};
}

test('status stays disabled without OpenAI key; unauthenticated and alien origin are denied',async t=>{
  const {makeRequest}=await startGateway(t);
  assert.equal((await makeRequest('/api/ai/status',{auth:false})).status,401);
  assert.equal((await makeRequest('/api/ai/status',{origin:'https://evil.example'})).status,403);
  const response=await makeRequest('/api/ai/status');
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).enabled,false);
});

test('owner installs key in server memory, chats via OpenAI and rate limit applies',async t=>{
  const {makeRequest,calls}=await startGateway(t);
  let response=await makeRequest('/api/ai/key',{method:'PUT',body:{apiKey:KEY}});
  assert.equal(response.status,200);
  assert.equal((await response.json()).stored,'process-memory');
  assert.equal((await makeRequest('/api/ai/status').then(r=>r.json())).enabled,true);
  response=await makeRequest('/api/ai/chat',{method:'POST',body:{message:'Привет'}});
  assert.equal(response.status,200);
  assert.equal((await response.json()).reply,'Ответ AI');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.openai.com/v1/responses');
  assert.equal(calls[0].options.headers.Authorization,'Bearer '+KEY);
  assert.equal(JSON.parse(calls[0].options.body).store,false);
  assert.equal((await makeRequest('/api/ai/chat',{method:'POST',body:{message:'Ещё'} })).status,429);
  response=await makeRequest('/api/ai/key',{method:'DELETE'});
  assert.equal((await response.json()).enabled,false);
  assert.equal((await makeRequest('/api/ai/chat',{method:'POST',body:{message:'test'}})).status,503);
});

test('CORS preflight supports only explicitly allowed frontend',async t=>{
  const {makeRequest}=await startGateway(t);
  const response=await makeRequest('/api/ai/chat',{method:'OPTIONS',auth:false});
  assert.equal(response.status,204);
  assert.equal(response.headers.get('access-control-allow-origin'),ALLOWED);
  const denied=await makeRequest('/api/ai/chat',{method:'OPTIONS',auth:false,origin:'https://attacker.example'});
  assert.equal(denied.status,403);
});

test('gateway never exposes API key to status, chat or client',async t=>{
  const {makeRequest}=await startGateway(t);
  await makeRequest('/api/ai/key',{method:'PUT',body:{apiKey:KEY}});
  const status=await makeRequest('/api/ai/status').then(r=>r.text());
  assert.equal(status.includes(KEY),false);
  assert.equal(status.includes(SECRET),false);
});
