// Sega cartridge player with local ROM normalization and EmulatorJS runtime.
import { SEGA_EXTENSIONS,validateSegaFile,prepareSegaRom } from './SegaRom.js?v=sega-rom-compat-20261101';
// Keep EmulatorJS in its own iframe so it does not change DashboardX DOM or globals.
export const SEGA_ROM_EXTENSIONS=SEGA_EXTENSIONS;
export const checkSegaRom=validateSegaFile;
export function segaPlayerURL(moduleUrl,token,mode='local'){
  if(!token||typeof token!=='string')throw Error('Не указан ключ запуска Sega.');
  const url=new URL('../../../sega-player.html',moduleUrl);
  url.searchParams.set('v','sega-rom-compat-20261101');
  url.hash=new URLSearchParams({token,...(mode==='stable'?{mode:'stable'}:{})}).toString();
  return url.href;
}
export default class SegaEmulatorWidget{
  constructor(widget){
    this.widget=widget;
    this.scope=widget.querySelector('.dx-sega');
    this.stage=widget.querySelector('[data-role="sega-screen"]');
    this.frame=widget.querySelector('[data-role="sega-frame"]');
    this.placeholder=widget.querySelector('[data-role="sega-placeholder"]');
    this.fileInput=widget.querySelector('[data-role="sega-rom"]');
    this.name=widget.querySelector('[data-role="sega-game-name"]');
    this.status=widget.querySelector('[data-role="sega-status"]');
    this.led=widget.querySelector('[data-role="sega-led"]');
    this.crt=widget.querySelector('[data-role="sega-crt"]');
    this.play=widget.querySelector('[data-action="sega-play"]');
    this.stop=widget.querySelector('[data-action="sega-stop"]');
    this.fullscreen=widget.querySelector('[data-action="sega-fullscreen"]');
    this.romFile=null;this.romSource=null;this.romNotes=[];
    this.token=null;this.loaded=false;this.uiReady=false;this.destroyed=false;
    this.loadVersion=0;this.core='segaMD';this.mode='local';
    this.unbind=[];
    const state=window.dashboardxStore?.getWidgetState(widget.instanceId)||{};
    this.crt.checked=state.segaCrt===true;
    this.stage.classList.toggle('is-crt',this.crt.checked);
    const on=(node,type,fn,options)=>{
      node?.addEventListener(type,fn,options);
      this.unbind.push(()=>node?.removeEventListener(type,fn,options));
    };
    on(this.crt,'change',()=>{
      this.stage.classList.toggle('is-crt',this.crt.checked);
      window.dashboardxStore?.updateWidgetState(widget.instanceId,{segaCrt:this.crt.checked});
    });
    on(this.fileInput,'change',()=>{
      const file=this.fileInput.files?.[0];this.fileInput.value='';
      if(file)this.openRom(file);
    });
    on(this.play,'click',()=>{
      if(!this.loaded){this.fileInput.click();return;}
      widget.activate?.();
      this.frame.focus({preventScroll:true});
      this.setStatus(this.uiReady?'EmulatorJS готов · нажмите ▶ внутри экрана':
        'Эмулятор ещё загружается. Следите за сообщением на экране.');
    });
    on(this.stop,'click',()=>this.stopGame());
    on(this.fullscreen,'click',async()=>{
      if(!this.loaded)return;
      try{
        if(document.fullscreenElement===this.stage){await document.exitFullscreen();return;}
        if(this.stage.requestFullscreen)await this.stage.requestFullscreen();
        else throw Error('Полноэкранный режим не поддерживается браузером');
        this.frame.focus({preventScroll:true});
      }catch(error){this.setStatus(error.message||'Ошибка полного экрана');}
    });
    on(this.stage,'dragover',e=>{e.preventDefault();this.stage.classList.add('is-drop-target')});
    on(this.stage,'dragleave',()=>this.stage.classList.remove('is-drop-target'));
    on(this.stage,'drop',e=>{
      e.preventDefault();this.stage.classList.remove('is-drop-target');
      const file=e.dataTransfer?.files?.[0];if(file)this.openRom(file);
    });
    on(this.frame,'focus',()=>widget.activate?.());
    on(window,'message',event=>{
      if(!this.loaded||event.origin!==window.location.origin||
        event.source!==this.frame.contentWindow||event.data?.token!==this.token)return;
      if(event.data?.type==='dashboardx:sega-ready'){
        if(!this.romFile)return;
        // Structured cloning preserves the File's name, extension and contents.
        event.source.postMessage({type:'dashboardx:sega-rom',token:this.token,
          file:this.romFile,core:this.core,originalName:this.romSource?.name,
          notes:this.romNotes},event.origin);
        this.setStatus('ROM передан · ядро '+this.core+' · загрузка…');
      }
      if(event.data?.type==='dashboardx:sega-received'){
        this.setStatus('ROM распознан: '+event.data.name+' · подключение EmulatorJS…');
      }
      if(event.data?.type==='dashboardx:sega-status'){
        this.setStatus(String(event.data.message||'Загрузка EmulatorJS…'));
      }
      if(event.data?.type==='dashboardx:sega-ui-ready'){
        this.uiReady=true;
        this.setStatus('EmulatorJS готов · нажмите ▶ на экране');
        this.led.textContent='● READY';
      }
      if(event.data?.type==='dashboardx:sega-retry'){
        if(this.romSource)this.openRom(this.romSource,this.mode==='local'?'stable':'local');
        return;
      }
      if(event.data?.type==='dashboardx:sega-start'){
        this.uiReady=true;
        this.setStatus('Игра запущена · управление внутри экрана');
        this.led.textContent='● PLAYING';this.led.classList.add('is-running');
        window.dispatchEvent(new CustomEvent('dashboardx:media-playing',{detail:{id:widget.instanceId,kind:'sega'}}));
      }
      if(event.data?.type==='dashboardx:sega-error'){
        this.led.textContent='● ERROR';
        this.led.classList.remove('is-running');
        this.setStatus(event.data.reason||'Не удалось запустить ROM. Проверьте файл и интернет.');
      }
    });
    on(this.frame,'load',()=>{
      if(this.loaded&&!this.uiReady&&this.romFile)this.setStatus('Эмулятор открыт · ожидаем передачу ROM…');
    });
    on(document,'fullscreenchange',()=>this.fullscreen.setAttribute('aria-pressed',String(document.fullscreenElement===this.stage)));
    this.setStatus('Выберите Sega ROM на устройстве');
  }
  setStatus(message){if(this.status)this.status.textContent=message;}
  async openRom(file,mode='local'){
    try{checkSegaRom(file)}catch(error){this.setStatus(error.message);return false;}
    this.stopGame();
    const sequence=this.loadVersion;
    this.mode=mode;
    this.setStatus('Проверяем формат ROM: '+file.name+'…');
    this.name.textContent=file.name;
    this.led.textContent='● CHECK';
    let prepared;
    try{
      prepared=await prepareSegaRom(file);
      if(this.destroyed||this.loadVersion!==sequence)return false;
    }catch(error){
      if(this.loadVersion===sequence){
        this.led.textContent='● ERROR';
        this.setStatus(error.message||'Не удалось разобрать ROM.');
      }
      return false;
    }
    this.romSource=file;
    this.romFile=prepared.file;
    this.romNotes=prepared.notes;
    this.core=prepared.system;
    this.uiReady=false;
    this.token=String(this.widget.instanceId)+'-'+Math.random().toString(36).slice(2);
    try{
      // The same-origin frame receives the prepared ROM through structured cloning.
      this.frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-pointer-lock allow-forms');
      this.frame.setAttribute('allow','fullscreen; autoplay; gamepad');
      this.frame.src=segaPlayerURL(import.meta.url,this.token,mode);
    }catch(error){
      this.stopGame();this.setStatus(error.message);return false;
    }
    this.loaded=true;
    this.frame.hidden=false;this.placeholder.hidden=true;
    this.name.textContent=prepared.name;
    this.led.textContent='● LOADING';this.led.classList.remove('is-running');
    this.stop.disabled=false;this.fullscreen.disabled=false;
    this.widget.activate?.();
    const detail=prepared.notes.length?' · '+prepared.notes.join('; '):'';
    this.setStatus('Запуск '+this.core+(mode==='stable'?' · резервный CDN':'')+detail);
    return true;
  }
  stopGame(){
    this.loadVersion++;
    if(document.fullscreenElement===this.stage)document.exitFullscreen?.().catch(()=>{});
    this.loaded=false;
    this.frame.hidden=true;
    this.frame.removeAttribute('srcdoc');
    this.frame.src='about:blank';
    this.placeholder.hidden=false;
    this.led.textContent='● STANDBY';this.led.classList.remove('is-running');
    this.name.textContent='Нет загруженной игры';
    this.stop.disabled=true;this.fullscreen.disabled=true;
    this.romFile=null;this.romSource=null;this.romNotes=[];
    this.token=null;this.uiReady=false;
    this.setStatus('ROM выгружен');
  }
  destroy(){
    if(this.destroyed)return;
    this.destroyed=true;
    this.unbind.forEach(fn=>fn());this.unbind.length=0;
    this.stopGame();
  }
}
