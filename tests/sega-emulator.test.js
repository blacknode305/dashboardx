import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {checkSegaRom,segaPlayerURL,SEGA_ROM_EXTENSIONS} from '../client/js/module/Widget/SegaEmulator.js';

const playerHTML=readFileSync(fileURLToPath(new URL('../client/sega-player.html',import.meta.url)),'utf8');
test('Sega ROM .gen validation',()=>{
  assert.deepEqual(SEGA_ROM_EXTENSIONS,['md','bin','gen','smd','zip']);
  assert.equal(checkSegaRom({name:'Ultimate Mortal Kombat 3 (USA).gen',size:4194304}),'gen');
  assert.equal(checkSegaRom({name:'homebrew.zip',size:10000}),'zip');
  assert.throws(()=>checkSegaRom({name:'malware.exe',size:1024}),/ROM/);
  assert.throws(()=>checkSegaRom({name:'invalid.gen',size:42}),/размер/);
});
test('Sega boot URL resolves to actual HTML file on DashboardX origin',()=>{
  const url=segaPlayerURL('https://example.com/dashboardx/client/js/module/Widget/SegaEmulator.js?v=1','session-12');
  assert.equal(new URL(url).pathname,'/dashboardx/client/sega-player.html');
  assert.equal(new URL(url).hash,'#token=session-12');
  assert.throws(()=>segaPlayerURL('https://example.com/widget.js',''),/ключ/);
});
test('Sega player transfers the original File and starts stable loader after valid handshake',()=>{
  const inline=playerHTML.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);
  new vm.Script(inline);
  const listeners=new Map(),messages=[],scripts=[];
  const elements=new Map();
  ['#status','#boot','#progress','#again'].forEach(name=>{
    elements.set(name,{textContent:'',hidden:false,addEventListener:(event,cb)=>{
      listeners.set('button:'+event,cb);
    }});
  });
  const parent={postMessage:(data,origin)=>messages.push({data,origin})};
  const window={addEventListener:(event,cb)=>listeners.set('window:'+event,cb)};
  const document={querySelector:selector=>elements.get(selector),
    createElement:()=>({src:'',onerror:null,onload:null}),
    head:{append:script=>scripts.push(script)}};
  const location={origin:'https://example.com',hash:'#token=session-12'};
  class FileMock {constructor(name,size){this.name=name;this.size=size}}
  vm.runInNewContext(inline,{window,document,location,parent,File:FileMock,URLSearchParams,
    clearTimeout:()=>{},setTimeout:()=>9},{timeout:1000});
  assert.equal(messages[0].data.type,'dashboardx:sega-ready');
  const file=new FileMock('Ultimate Mortal Kombat 3 (USA).gen',4194304);
  const handler=listeners.get('window:message');
  handler({source:parent,origin:'https://malicious.example',data:{type:'dashboardx:sega-rom',token:'session-12',file}});
  assert.equal(scripts.length,0,'reject foreign origins');
  handler({source:parent,origin:location.origin,data:{type:'dashboardx:sega-rom',token:'wrong',file}});
  assert.equal(scripts.length,0,'reject mismatched tokens');
  handler({source:parent,origin:location.origin,data:{type:'dashboardx:sega-rom',token:'session-12',file}});
  assert.equal(window.EJS_gameUrl,file,'must pass original file with .gen extension');
  assert.equal(window.EJS_core,'segaMD');
  assert.equal(scripts.length,1);
  assert.equal(scripts[0].src,'https://cdn.emulatorjs.org/stable/data/loader.js');
  assert.ok(messages.some(m=>m.data.type==='dashboardx:sega-received'));
  handler({source:parent,origin:location.origin,data:{type:'dashboardx:sega-rom',token:'session-12',file}});
  assert.equal(scripts.length,1,'loader must only start once');
  window.EJS_ready();
  assert.equal(elements.get('#boot').hidden,true,'boot overlay clears once EmulatorJS UI is ready');
  assert.ok(messages.some(m=>m.data.type==='dashboardx:sega-ui-ready'));
});
test('Sega loader has fallback and visible diagnostics',()=>{
  assert.match(playerHTML,/cdn\.emulatorjs\.org\/latest\/data\//);
  assert.match(playerHTML,/EmulatorJS не запустился за 30 секунд/);
  assert.match(playerHTML,/id="again"/);
  assert.match(playerHTML,/window\.addEventListener\('unhandledrejection'/);
});
