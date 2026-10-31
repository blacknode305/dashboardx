import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {checkSegaRom,segaEmbedHTML,SEGA_ROM_EXTENSIONS} from '../client/js/module/Widget/SegaEmulator.js';

test('Sega ROM accepts real-sized 4 MiB .gen files and rejects invalid data',()=>{
  assert.deepEqual(SEGA_ROM_EXTENSIONS,['md','bin','gen','smd','zip']);
  assert.equal(checkSegaRom({name:'Ultimate Mortal Kombat 3 (USA).gen',size:4194304}),'gen');
  assert.equal(checkSegaRom({name:'homebrew.zip',size:4096}),'zip');
  assert.throws(()=>checkSegaRom({name:'notes.txt',size:1000}),/ROM/);
  assert.throws(()=>checkSegaRom({name:'broken.md',size:32}),/размер/);
  assert.throws(()=>checkSegaRom({name:'huge.bin',size:26*1024*1024}),/размер/);
});
test('EmulatorJS receives the original File with .gen extension, not a blob UUID',()=>{
  const html=segaEmbedHTML({gameName:'Ultimate Mortal Kombat 3 (USA).gen',token:'test-token'});
  assert.match(html,/EJS_core='segaMD'/);
  assert.match(html,/EJS_controlScheme='segaMD'/);
  assert.match(html,/cdn\.emulatorjs\.org\/stable\/data\/loader\.js/);
  assert.match(html,/window\.EJS_gameUrl=file/);
  assert.match(html,/dashboardx:sega-ready/);
  assert.match(html,/dashboardx:sega-received/);
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);

  const messages=[];
  let messageHandler=null;
  const parent={postMessage:(value,origin)=>messages.push({value,origin})};
  const window={
    parent,location:{origin:'https://dashboard.example'},
    addEventListener:(type,cb)=>{if(type==='message')messageHandler=cb;}
  };
  const scripts=[];
  const document={
    createElement:()=>({src:'',onerror:null}),
    head:{append:script=>scripts.push(script)}
  };
  vm.runInNewContext(inline,{window,document,File},{timeout:1000});
  assert.equal(messages[0].value.type,'dashboardx:sega-ready');
  const file=new File([new Uint8Array(4194304)],'Ultimate Mortal Kombat 3 (USA).gen');
  messageHandler({source:parent,origin:'https://foreign.example',data:{type:'dashboardx:sega-rom',token:'test-token',file}});
  assert.equal(scripts.length,0);
  messageHandler({source:parent,origin:'https://dashboard.example',data:{type:'dashboardx:sega-rom',token:'wrong-token',file}});
  assert.equal(scripts.length,0);
  messageHandler({source:parent,origin:'https://dashboard.example',data:{type:'dashboardx:sega-rom',token:'test-token',file}});
  assert.equal(window.EJS_gameUrl,file);
  assert.equal(window.EJS_gameUrl.name,'Ultimate Mortal Kombat 3 (USA).gen');
  assert.equal(scripts.length,1);
  assert.equal(scripts[0].src,'https://cdn.emulatorjs.org/stable/data/loader.js');
  assert.equal(messages.at(-1).value.type,'dashboardx:sega-received');
  messageHandler({source:parent,origin:'https://dashboard.example',data:{type:'dashboardx:sega-rom',token:'test-token',file}});
  assert.equal(scripts.length,1,'same ROM must not start the loader twice');
});
test('ROM filename is escaped, cannot inject code into the iframe bootstrap',()=>{
  const payload='abc</script><script>window.hijacked=true</script>.gen';
  const html=segaEmbedHTML({gameName:payload,token:'safe'});
  assert.equal((html.match(/<script/g)||[]).length,1);
  assert.equal(html.includes(payload),false);
  assert.equal(html.includes('window.hijacked=true</script>'),false);
  assert.match(html,/\\u003c\/script>/);
  assert.throws(()=>segaEmbedHTML({gameName:'',token:'a'}),/обязательны/);
});
