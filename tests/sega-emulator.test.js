import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {checkSegaRom,segaPlayerURL,SEGA_ROM_EXTENSIONS} from '../client/js/module/Widget/SegaEmulator.js';

const playerHTML=readFileSync(fileURLToPath(new URL('../client/sega-player.html',import.meta.url)),'utf8');
const vendorRoot=new URL('../client/vendor/emulatorjs/data/',import.meta.url);

function harness(rejectImport=false) {
  const inline=playerHTML.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);
  new vm.Script(inline);
  const listeners=new Map(), messages=[], scripts=[], imports=[], timeouts=[];
  const elements=new Map();
  ['#status','#boot','#progress','#again'].forEach(name=>{
    elements.set(name,{textContent:'',hidden:false,addEventListener:(event,cb)=>{
      listeners.set('button:'+event,cb);
    }});
  });
  let startButtonVisible=false,observerTick=null;
  elements.set('#game',{querySelector:selector=>startButtonVisible&&selector==='.ejs_start_button'?{}:null});
  class MutationObserverMock {
    constructor(cb){observerTick=cb}
    observe(){}
    disconnect(){}
  }
  const parent={postMessage:(data,origin)=>messages.push({data,origin})};
  const window={addEventListener:(event,cb)=>listeners.set('window:'+event,cb)};
  const document={querySelector:selector=>elements.get(selector),
    createElement:()=>({src:'',onerror:null,onload:null}),
    head:{append:script=>scripts.push(script)}};
  const location={origin:'https://dashboard.example',
    href:'https://dashboard.example/client/sega-player.html#token=session-12',
    hash:'#token=session-12'};
  class FileMock {constructor(name,size){this.name=name;this.size=size}}
  // Substitute only the module network request, not any loader/configuration logic.
  const simulated=inline.replace('await import(moduleURL)','await mockImport(moduleURL)');
  const mockImport=async url=>{
    imports.push(url);
    if(rejectImport)throw Error('Local module blocked');
    return {default:class EmulatorJS{}};
  };
  vm.runInNewContext(simulated,{window,document,location,parent,File:FileMock,
    URLSearchParams,URL,MutationObserver:MutationObserverMock,mockImport,
    clearTimeout:()=>{},setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length;}},
    {timeout:1000});
  const file=new FileMock('Ultimate Mortal Kombat 3 (USA).gen',4194304);
  return {window,location,file,parent,document,elements,messages,scripts,imports,timeouts,
    trigger:()=>listeners.get('window:message')({
      source:parent,origin:location.origin,
      data:{type:'dashboardx:sega-rom',token:'session-12',file}
    }),
    foreign:()=>listeners.get('window:message')({
      source:parent,origin:'https://evil.example',
      data:{type:'dashboardx:sega-rom',token:'session-12',file}
    }),
    showStart:()=>{startButtonVisible=true;observerTick?.();}
  };
}

test('Sega ROM .gen validation includes a 4 MiB game',()=>{
  assert.deepEqual(SEGA_ROM_EXTENSIONS,['md','bin','gen','smd','zip']);
  assert.equal(checkSegaRom({name:'Ultimate Mortal Kombat 3 (USA).gen',size:4194304}),'gen');
  assert.equal(checkSegaRom({name:'homebrew.zip',size:10000}),'zip');
  assert.throws(()=>checkSegaRom({name:'malware.exe',size:1024}),/ROM/);
  assert.throws(()=>checkSegaRom({name:'invalid.gen',size:42}),/размер/);
});
test('Sega player URL resolves to a same-origin static page',()=>{
  const url=segaPlayerURL('https://example.com/dashboardx/client/js/module/Widget/SegaEmulator.js','abc');
  assert.equal(new URL(url).pathname,'/dashboardx/client/sega-player.html');
  assert.equal(new URL(url).hash,'#token=abc');
  assert.throws(()=>segaPlayerURL('https://example.com/widget.js',''),/ключ/);
});
test('Local EmulatorJS frontend and same-origin File handshake',async()=>{
  const s=harness();
  s.foreign();assert.equal(s.scripts.length,0);
  s.trigger();
  assert.equal(s.window.EJS_gameUrl,s.file);
  assert.equal(s.window.EJS_core,'segaMD');
  assert.equal(s.window.EJS_controlScheme,'segaMD');
  await new Promise(setImmediate);
  assert.equal(s.imports.length,1);
  assert.equal(s.imports[0],'https://dashboard.example/client/vendor/emulatorjs/data/src/emulator.js');
  assert.equal(s.window.EJS_pathtodata,'https://cdn.emulatorjs.org/latest/data/');
  assert.equal(s.window.EJS_paths['emulator.js'],s.imports[0]);
  assert.equal(s.window.EJS_paths['emulator.css'],'https://dashboard.example/client/vendor/emulatorjs/data/emulator.css');
  assert.equal(s.scripts.length,1);
  assert.equal(s.scripts[0].src,'https://dashboard.example/client/vendor/emulatorjs/data/loader.js');
  assert.ok(s.messages.some(m=>m.data.type==='dashboardx:sega-received'));
  s.trigger();
  assert.equal(s.scripts.length,1,'must not launch loader twice');
  s.showStart();
  assert.equal(s.elements.get('#boot').hidden,true);
  assert.equal(s.messages.filter(m=>m.data.type==='dashboardx:sega-ui-ready').length,1);
  s.window.EJS_ready();
  assert.equal(s.messages.filter(m=>m.data.type==='dashboardx:sega-ui-ready').length,1);
});
test('Local JavaScript import failure falls back with a visible status',async()=>{
  const s=harness(true);
  s.trigger();await new Promise(setImmediate);
  assert.equal(s.scripts.length,1);
  assert.equal(s.scripts[0].src,'https://cdn.emulatorjs.org/stable/data/loader.js');
  assert.equal(s.window.EJS_DEBUG_XX,false);
  assert.equal(s.window.EJS_paths,undefined);
  assert.ok(s.messages.some(x=>x.data.message?.includes('Local module blocked')));
});
test('Source module import graph is bundled with DashboardX',()=>{
  const files=[
    'loader.js','emulator.css','src/emulator.js','src/frontend.js',
    'src/GameManager.js','src/cache.js','src/compression.js','src/consts.js',
    'src/gamepad.js','src/license.js','src/netplay.js','src/setup.js',
    'src/shaders.js','src/storage.js','src/utils.js',
    'src/vendor/nipplejs.js','src/vendor/socket.io.min.js'
  ];
  files.forEach(path=>assert.equal(existsSync(fileURLToPath(new URL(path,vendorRoot))),true,path));
  assert.equal(existsSync(fileURLToPath(new URL('../LICENSE',vendorRoot))),true);
});
test('Visible error message identifies failed module stage, not a generic ROM error',()=>{
  assert.match(playerHTML,/Локальный интерфейс недоступен/);
  assert.match(playerHTML,/Последний этап/);
  assert.match(playerHTML,/loadEmulator\(\)/);
  assert.match(playerHTML,/window\.EJS_ready/);
});
