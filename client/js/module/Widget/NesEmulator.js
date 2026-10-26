const BUTTONS={ArrowUp:4,ArrowDown:5,ArrowLeft:6,ArrowRight:7,KeyW:4,KeyS:5,KeyA:6,KeyD:7,KeyZ:0,KeyJ:0,KeyX:1,KeyK:1,Enter:3,ShiftLeft:2,ShiftRight:2};
const now=()=>performance.now();
const INPUT_CODES=new Set(Object.keys(BUTTONS));
const RESERVED=new Set(['Escape','F5','F9','KeyP','KeyR','KeyM']);
const GAME_KEYS=['KeyZ','KeyX','Enter','ShiftRight'];
const isTyping=el=>!!el?.closest?.('input,textarea,select,[contenteditable="true"]');
const romId=bytes=>{
 let hash=2166136261;
 for(let i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619)>>>0;
 return bytes.length.toString(16)+'-'+hash.toString(16);
};
function toBinary(bytes){
 let result='';
 for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return result;
}
export default class NesEmulatorWidget {
 constructor(widget){
  this.widget=widget;this.scope=widget.querySelector('.dx-nes');
  this.screen=widget.querySelector('[data-role="screen"]');
  this.canvas=widget.querySelector('canvas');this.ctx=this.canvas?.getContext('2d');
  this.status=widget.querySelector('[data-role="game-status"]');
  this.name=widget.querySelector('[data-role="game-name"]');
  this.input=widget.querySelector('[data-role="romLoader"]');
  this.saveInput=widget.querySelector('[data-role="saveLoader"]');
  this.buttons={};for(const a of ['pause','reset','mute','fullscreen','save','load','export'])
   this.buttons[a]=widget.querySelector('[data-action="'+a+'"]');
  this.active=false;this.loaded=false;this.paused=true;this.muted=false;
  this.keyOverrides={};this.remapTarget=null;this.speed=1;this.scanlines=false;
  this.stateStore=window.dashboardxStore;
  const saved=this.stateStore?.getWidgetState(widget.instanceId)||{};
  if(saved.nesControls&&typeof saved.nesControls==='object'){
   for(const key of GAME_KEYS){
    const value=saved.nesControls[key];
    if(typeof value==='string'&&/^([A-Za-z][a-zA-Z0-9]+)$/.test(value)&&!RESERVED.has(value))
      this.keyOverrides[key]=value;
   }
  }
  this.speed=[0.5,1,1.5,2].includes(Number(saved.nesSpeed))?Number(saved.nesSpeed):1;
  this.scanlines=saved.nesScanlines===true;
  this.pressed=new Set();this.audioQueue=[];this.audioIndex=0;
  this.lastTime=0;this.raf=0;this.fps=60;this.clock=0;this.unbind=[];
  this.gamepadButtons=new Set();this.romKey='';
  this.audioCtx=null;this.audioNode=null;this.nes=null;
  this.image=this.ctx?.createImageData(256,240);
  this.settings=widget.querySelector('[data-role="nes-speed"]');
  this.scanlineToggle=widget.querySelector('[data-role="nes-scanlines"]');
  this.mapping=widget.querySelector('[data-role="nes-mapping"]');
  this.capture=widget.querySelector('[data-role="nes-capture"]');
  if(this.settings)this.settings.value=String(this.speed);
  if(this.scanlineToggle)this.scanlineToggle.checked=this.scanlines;
  this.screen?.classList.toggle('is-scanlined',this.scanlines);
  this.renderMapping();
  if(!this.ctx||!window.jsnes?.NES){
   this.setStatus('Не удалось загрузить jsnes. Проверьте соединение.');return;
  }
  this.nes=new window.jsnes.NES({
   onFrame:frame=>this.draw(frame),
   onAudioSample:(l,r)=>this.pushAudio(l,r),
   sampleRate:44100
  });
  const on=(node,type,cb,opts)=>{
   node?.addEventListener(type,cb,opts);
   this.unbind.push(()=>node?.removeEventListener(type,cb,opts));
  };
  on(this.input,'change',async()=>{
   const file=this.input.files?.[0];if(!file)return;
   try {await this.openRom(file);}catch(e){this.setStatus('Ошибка ROM: '+(e.message||e));}
   this.input.value='';
  });
  on(this.saveInput,'change',async()=>{
   const file=this.saveInput.files?.[0];if(!file)return;
   try{
    if(file.size>8_000_000)throw Error('Файл сохранения слишком большой');
    const entry=JSON.parse(await file.text());this.applyState(entry);
   }catch(e){this.setStatus('Не удалось загрузить save: '+(e.message||e));}
   this.saveInput.value='';
  });
  on(this.settings,'change',()=>{
    this.speed=Number(this.settings.value)||1;
    this.stateStore?.updateWidgetState(widget.instanceId,{nesSpeed:this.speed});
    this.setStatus('Скорость: '+this.speed+'×');
  });
  on(this.scanlineToggle,'change',()=>{
    this.scanlines=this.scanlineToggle.checked;
    this.screen.classList.toggle('is-scanlined',this.scanlines);
    this.stateStore?.updateWidgetState(widget.instanceId,{nesScanlines:this.scanlines});
  });
  on(widget.querySelector('[data-action="nes-controls-reset"]'),'click',()=>{
    this.keyOverrides={};this.remapTarget=null;this.stateStore?.updateWidgetState(widget.instanceId,{nesControls:{}});
    this.renderMapping();this.setStatus('Управление восстановлено');
  });
  on(this.mapping,'click',event=>{
    const button=event.target.closest?.('[data-map-key]');
    if(!button)return;
    this.remapTarget=button.dataset.mapKey;
    this.setStatus('Нажмите новую клавишу для '+this.remapTarget+' (Esc — отмена)');
    this.renderMapping();
  });
  on(this.buttons.pause,'click',()=>this.togglePause());
  on(this.buttons.reset,'click',()=>this.reset());
  on(this.buttons.mute,'click',()=>this.toggleMute());
  on(this.buttons.fullscreen,'click',()=>this.toggleFullscreen());
  on(this.buttons.save,'click',()=>this.saveLocal());
  on(this.buttons.load,'click',()=>this.loadLocal());
  on(this.buttons.export,'click',()=>this.exportState());
  on(this.screen,'pointerdown',()=>{
    this.active=true;widget.activate?.();this.screen.focus();
    this.unlockAudio();
  });
  on(this.screen,'dragover',event=>{event.preventDefault();this.screen.classList.add('is-drop-target');});
  on(this.screen,'dragleave',()=>this.screen.classList.remove('is-drop-target'));
  on(this.screen,'drop',async event=>{
    event.preventDefault();this.screen.classList.remove('is-drop-target');
    const file=event.dataTransfer?.files?.[0];
    if(!file)return;
    try{await this.openRom(file);}catch(error){this.setStatus('Ошибка ROM: '+(error.message||error));}
  });
  on(widget,'focusin',()=>{this.active=true;});
  on(widget,'focusout',event=>{
   if(!widget.contains(event.relatedTarget))this.releaseAll();
  });
  on(document,'visibilitychange',()=>{if(document.hidden){this.releaseAll();this.pause('Пауза: вкладка скрыта');}});
  on(window,'blur',()=>{this.releaseAll();this.pause('Пауза: окно неактивно');});
  on(window,'keydown',e=>this.onKey(e,true));
  on(window,'keyup',e=>this.onKey(e,false));
  on(window,'dashboardx:media-playing',()=>{if(this.loaded&&!this.paused)this.pause('Пауза: воспроизводится другое медиа');});
  on(window,'dashboardx:nes-playing',event=>{
    if(event.detail?.id!==this.widget.instanceId&&this.loaded&&!this.paused)
      this.pause('Пауза: активна другая консоль');
  });
  on(document,'fullscreenchange',()=>{this.releaseAll();});
  on(widget,'pointerdown',()=>{this.active=true;this.unlockAudio();});
  for(const button of widget.querySelectorAll('[data-nes]')){
   const code=button.dataset.nes;
   on(button,'pointerdown',event=>{
    event.preventDefault();this.active=true;widget.activate?.();
    button.setPointerCapture?.(event.pointerId);
    this.button(code,true,true);button.classList.add('pressed');this.unlockAudio();
   });
   const off=e=>{e.preventDefault();this.button(code,false,true);button.classList.remove('pressed');};
   on(button,'pointerup',off);on(button,'pointercancel',off);on(button,'lostpointercapture',off);
  }
  this.setStatus('Загрузите игру в формате .nes');
 }
 setStatus(value){if(this.status)this.status.textContent=value;}
 renderMapping(){
  if(!this.mapping)return;
  this.mapping.replaceChildren();
  for(const [physical,label] of [['KeyZ','A'],['KeyX','B'],['Enter','START'],['ShiftRight','SELECT']]){
   const button=document.createElement('button');button.type='button';
   button.dataset.mapKey=physical;
   button.textContent=label+': '+(this.keyOverrides[physical]||physical.replace(/^Key/,''))+
     (this.remapTarget===physical?' ⌨':'');
   button.setAttribute('aria-pressed',String(this.remapTarget===physical));
   this.mapping.append(button);
  }
 }
 keyToNes(code){
  for(const [physical,mapped] of Object.entries(this.keyOverrides))if(mapped===code)return BUTTONS[physical];
  if(Object.keys(this.keyOverrides).includes(code))return undefined;
  return BUTTONS[code];
 }
 canCapture(e){
  if(!this.loaded||!this.active||document.hidden||isTyping(e.target)||e.altKey||e.metaKey||e.ctrlKey)return false;
  if(!this.widget.isConnected || this.widget.style?.display==='none')return false;
  // WidgetBase marks the active window. Do not hijack shortcuts from other widgets.
  return this.widget.classList.contains('is-focus') ||
   this.widget.contains(document.activeElement);
 }
 onKey(e,down){
  if(this.remapTarget&&down&&!e.repeat&&!isTyping(e.target)&&
     this.widget.classList.contains('is-focus')){
   e.preventDefault();
   if(e.code==='Escape'){this.remapTarget=null;this.renderMapping();return;}
   const allowed=/^(Key[A-Z]|Digit[0-9]|Arrow(?:Up|Down|Left|Right)|Space|Shift(?:Left|Right))$/.test(e.code);
   if(!allowed||RESERVED.has(e.code)){
    this.setStatus('Эта клавиша недоступна. Выберите букву, цифру, стрелку, Shift или пробел.');
    return;
   }
   for(const [key,value] of Object.entries(this.keyOverrides))if(value===e.code)delete this.keyOverrides[key];
   this.keyOverrides[this.remapTarget]=e.code;
   this.remapTarget=null;this.releaseAll();this.renderMapping();
   this.stateStore?.updateWidgetState(this.widget.instanceId,{nesControls:{...this.keyOverrides}});
   this.setStatus('Клавиша управления сохранена');
   return;
  }
  if(!this.canCapture(e))return;
  const code=e.code;
  if(this.keyToNes(code)!==undefined){
   e.preventDefault();if(down&&e.repeat)return;
   this.button(code,down);return;
  }
  if(!down||e.repeat)return;
  const action={KeyP:()=>this.togglePause(),KeyR:()=>this.reset(),
    KeyM:()=>this.toggleMute(),F5:()=>this.saveLocal(),F9:()=>this.loadLocal()}[code];
  if(action){e.preventDefault();action();}
 }
 button(code,down,virtual=false){
  const number=virtual?BUTTONS[code]:this.keyToNes(code);
  if(number===undefined||!this.loaded)return;
  const key=(virtual?'virtual:':'keyboard:')+code;
  if(down&&!this.pressed.has(key)){
   this.pressed.add(key);
   this.nes.buttonDown(1,number);
  }else if(!down&&this.pressed.has(key)){
   this.pressed.delete(key);
   if(!this.isButtonHeld(number))this.nes.buttonUp(1,number);
  }
 }
 heldNumber(key){
  return key.startsWith('virtual:')?BUTTONS[key.slice(8)]:this.keyToNes(key.slice(9));
 }
 isButtonHeld(number){
  return [...this.pressed].some(key=>this.heldNumber(key)===number) ||
    [...this.gamepadButtons].some(key=>BUTTONS[key]===number);
 }
 releaseAll(){
  for(const key of [...this.pressed])
   this.button(key.slice(key.indexOf(':')+1),false,key.startsWith('virtual:'));
  for(const code of [...this.gamepadButtons])
   if(![...this.pressed].some(key=>this.heldNumber(key)===BUTTONS[code]))
    this.nes?.buttonUp(1,BUTTONS[code]);
  this.gamepadButtons.clear();
 }
 pollGamepad(){
  if(!navigator.getGamepads||!this.active||!this.widget.classList.contains('is-focus')){
   if(this.gamepadButtons.size){
    for(const code of this.gamepadButtons){
     if(![...this.pressed].some(key=>this.heldNumber(key)===BUTTONS[code]))this.nes.buttonUp(1,BUTTONS[code]);
    }
    this.gamepadButtons.clear();
   }
   return;
  }
  const pad=Array.from(navigator.getGamepads()||[]).find(x=>x?.connected);
  const keys=pad?[
   ['KeyZ',!!pad.buttons[0]?.pressed],['KeyX',!!pad.buttons[1]?.pressed],
   ['ShiftRight',!!pad.buttons[8]?.pressed],['Enter',!!pad.buttons[9]?.pressed],
   ['ArrowUp',!!pad.buttons[12]?.pressed||pad.axes[1]<-.45],
   ['ArrowDown',!!pad.buttons[13]?.pressed||pad.axes[1]>.45],
   ['ArrowLeft',!!pad.buttons[14]?.pressed||pad.axes[0]<-.45],
   ['ArrowRight',!!pad.buttons[15]?.pressed||pad.axes[0]>.45]
  ]:[];
  const next=new Set(keys.filter(([,v])=>v).map(([k])=>k));
  for(const code of this.gamepadButtons){
   if(!next.has(code)&&![...this.pressed].some(k=>this.heldNumber(k)===BUTTONS[code]))
    this.nes.buttonUp(1,BUTTONS[code]);
  }
  for(const code of next){
   if(!this.gamepadButtons.has(code)&&![...this.pressed].some(k=>this.keyToNes(k)===BUTTONS[code]))
    this.nes.buttonDown(1,BUTTONS[code]);
  }
  this.gamepadButtons=next;
 }
 async openRom(file){
  if(file.size<16||file.size>5_000_000||!file.name.toLowerCase().endsWith('.nes'))throw Error('Нужен ROM .nes размером до 5 МБ');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(String.fromCharCode(...bytes.subarray(0,4))!=='NES\x1a')throw Error('Некорректный заголовок iNES');
  this.pause();this.releaseAll();
  this.nes.loadROM(toBinary(bytes));
  this.romKey=romId(bytes);this.name.textContent=file.name.slice(0,100);
  this.loaded=true;this.paused=false;this.active=true;
  this.screen.focus();
  for(const name of ['pause','reset','save','load','export'])this.buttons[name].disabled=false;
  this.buttons.pause.textContent='⏸ Пауза · P';
  this.setStatus('Игра запущена · окно активно');
  this.unlockAudio();
  this.clock=0;this.lastTime=0;this.loop();
  window.dispatchEvent(new CustomEvent('dashboardx:nes-playing',{detail:{id:this.widget.instanceId}}));
 }
 draw(frame){
  if(!this.image||!this.ctx)return;
  const arr=this.image.data;
  for(let i=0,j=0;i<frame.length;i++,j+=4){
   const c=frame[i];arr[j]=c&255;arr[j+1]=(c>>8)&255;arr[j+2]=(c>>16)&255;arr[j+3]=255;
  }
  this.ctx.putImageData(this.image,0,0);
 }
 pushAudio(l,r){
  if(this.muted||!this.audioCtx)return;
  if(this.audioQueue.length-this.audioIndex>8192)return;
  this.audioQueue.push([l*.35,r*.35]);
 }
 unlockAudio(){
  if(!this.nes)return;
  try{
   if(!this.audioCtx){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    this.audioCtx=new Audio({sampleRate:44100});
    this.audioNode=this.audioCtx.createScriptProcessor(2048,0,2);
    this.audioNode.onaudioprocess=e=>{
     const l=e.outputBuffer.getChannelData(0),r=e.outputBuffer.getChannelData(1);
     for(let i=0;i<l.length;i++){
      const sample=!this.muted&&this.audioIndex<this.audioQueue.length?
       this.audioQueue[this.audioIndex++]:null;
      l[i]=sample?.[0]||0;r[i]=sample?.[1]||0;
     }
     if(this.audioIndex>4096){this.audioQueue=this.audioQueue.slice(this.audioIndex);this.audioIndex=0;}
    };
    this.audioNode.connect(this.audioCtx.destination);
   }
   if(this.audioCtx.state==='suspended')void this.audioCtx.resume().catch(()=>{});
  }catch{this.setStatus('Игра работает без звука');}
 }
 loop(){
  cancelAnimationFrame(this.raf);
  const step=time=>{
   if(this.destroyed||this.paused)return;
   this.raf=requestAnimationFrame(step);
   if(!this.widget.isConnected)return;
   if(document.hidden||this.widget.style?.display==='none'){this.lastTime=0;this.clock=0;return;}
   const dt=this.lastTime?Math.min(100,time-this.lastTime):16.667;
   this.lastTime=time;this.clock+=dt;
   this.pollGamepad();
   let steps=0;
   while(this.clock>=1000/(this.fps*this.speed)&&steps++<5){
    try{this.nes.frame();}catch(e){this.pause('Ошибка эмулятора: '+(e.message||e));break;}
    this.clock-=1000/(this.fps*this.speed);
   }
   if(steps>5)this.clock=0;
  };
  this.raf=requestAnimationFrame(step);
 }
 pause(label){
  if(!this.loaded)return;
  this.paused=true;cancelAnimationFrame(this.raf);this.raf=0;
  this.releaseAll();this.audioQueue=[];this.audioIndex=0;
  this.buttons.pause.textContent='▶ Продолжить · P';
  this.setStatus(label||'Пауза');
 }
 togglePause(){
  if(!this.loaded)return;
  if(!this.paused){this.pause();return;}
  this.paused=false;this.active=true;
  this.clock=0;this.lastTime=0;this.unlockAudio();this.loop();
  this.buttons.pause.textContent='⏸ Пауза · P';this.setStatus('Игра запущена');
  window.dispatchEvent(new CustomEvent('dashboardx:nes-playing',{detail:{id:this.widget.instanceId}}));
 }
 reset(){
  if(!this.loaded)return;
  this.nes.reset();this.releaseAll();this.setStatus('Консоль сброшена');
  if(this.paused)this.togglePause();
 }
 toggleMute(){this.muted=!this.muted;this.buttons.mute.textContent=this.muted?'🔇 Без звука · M':'🔊 Звук · M';}
 async toggleFullscreen(){
  try{
   if(document.fullscreenElement===this.screen)await document.exitFullscreen();
   else await this.screen.requestFullscreen();
  }catch{this.setStatus('Полный экран недоступен');}
 }
 saveObject(){
  if(!this.loaded)throw Error('Сначала загрузите ROM');
  return {format:'dashboardx-nes-save-v1',romKey:this.romKey,
   romName:this.name.textContent,createdAt:new Date().toISOString(),state:this.nes.toJSON()};
 }
 localKey(){return 'dashboardx.nes.save.'+this.widget.instanceId+'.'+this.romKey;}
 saveLocal(){
  try{
   const data=JSON.stringify(this.saveObject());
   localStorage.setItem(this.localKey(),data);
   this.setStatus('Сохранено в браузере · F9 загрузить');
  }catch(e){this.setStatus('Нет места для save. Используйте «Экспорт save».');}
 }
 loadLocal(){
  if(!this.loaded)return;
  try{
   const data=localStorage.getItem(this.localKey());
   if(!data)throw Error('Сохранения для этого ROM нет');
   this.applyState(JSON.parse(data));
  }catch(e){this.setStatus(e.message||'Не удалось загрузить save');}
 }
 applyState(entry){
  if(!this.loaded)throw Error('Сначала загрузите тот же ROM');
  if(entry?.format!=='dashboardx-nes-save-v1'||entry.romKey!==this.romKey||!entry.state)
   throw Error('Сохранение от другой игры или версия неверна');
  this.nes.fromJSON(entry.state);this.releaseAll();
  this.setStatus('Состояние восстановлено');
 }
 exportState(){
  try{
   const blob=new Blob([JSON.stringify(this.saveObject())],{type:'application/json'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=(this.name.textContent||'game').replace(/[^a-z0-9._-]/gi,'_')+'.save.json';
   link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   this.setStatus('Файл сохранения подготовлен');
  }catch(e){this.setStatus('Ошибка экспорта: '+(e.message||e));}
 }
 destroy(){
  this.destroyed=true;this.paused=true;cancelAnimationFrame(this.raf);this.releaseAll();
  for(const cleanup of this.unbind)cleanup();this.unbind=[];
  this.audioNode?.disconnect();this.audioNode=null;
  if(this.audioCtx)void this.audioCtx.close().catch(()=>{});this.audioCtx=null;
  this.audioQueue=[];this.nes=null;
 }
}
