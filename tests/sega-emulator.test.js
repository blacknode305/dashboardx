import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSegaRom,segaEmbedHTML,SEGA_ROM_EXTENSIONS} from '../client/js/module/Widget/SegaEmulator.js';

test('Sega ROM formats and local size limits',()=>{
  assert.deepEqual(SEGA_ROM_EXTENSIONS,['md','bin','gen','smd','zip']);
  assert.equal(checkSegaRom({name:'Sonic.MD',size:524288}),'md');
  assert.equal(checkSegaRom({name:'homebrew.zip',size:4096}),'zip');
  assert.throws(()=>checkSegaRom({name:'notes.txt',size:1000}),/ROM/);
  assert.throws(()=>checkSegaRom({name:'broken.md',size:32}),/размер/);
  assert.throws(()=>checkSegaRom({name:'huge.bin',size:26*1024*1024}),/размер/);
});
test('EmulatorJS Sega iframe uses stable Sega MD core and local blob ROM',()=>{
  const html=segaEmbedHTML({gameUrl:'blob:https://dashboard.example/test-rom',gameName:'Homebrew.md',token:'a1'});
  assert.match(html,/EJS_core='segaMD'/);
  assert.match(html,/EJS_controlScheme='segaMD'/);
  assert.match(html,/cdn\.emulatorjs\.org\/stable\/data\/loader\.js/);
  assert.match(html,/window\.EJS_gameUrl="blob:https:\/\/dashboard\.example\/test-rom"/);
  assert.match(html,/dashboardx:sega-start/);
  assert.match(html,/f5/);
  assert.match(html,/f9/);
  assert.throws(()=>segaEmbedHTML({gameUrl:'https://example.org/copyrighted.bin',gameName:'ROM',token:'a'}),/локальным blob/);
});
test('Untrusted ROM filename cannot inject HTML scripts into iframe bootstrap',()=>{
  const payload='abc</script><script>window.hijacked=true</script>.md';
  const html=segaEmbedHTML({gameUrl:'blob:https://dashboard.example/123',gameName:payload,token:'safe'});
  assert.equal((html.match(/<script/g)||[]).length,1);
  assert.equal(html.includes(payload),false);
  assert.equal(html.includes('window.hijacked=true</script>'),false);
  assert.match(html,/\\u003c\/script>/);
});
