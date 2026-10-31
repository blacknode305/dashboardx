// Sega Mega Drive / Genesis via official EmulatorJS stable CDN.
// Keep EmulatorJS in its own iframe so it does not change DashboardX DOM or globals.
export const SEGA_ROM_EXTENSIONS=Object.freeze(['md','bin','gen','smd','zip']);
export function checkSegaRom(file){
  if(!file||typeof file.name!=='string'||typeof file.size!=='number')throw Error('Выберите файл игры Sega.');
  const extension=file.name.split('.').pop().toLowerCase();
  if(!SEGA_ROM_EXTENSIONS.includes(extension))throw Error('Нужен Mega Drive ROM: .md, .bin, .gen, .smd или .zip.');
  const max=extension==='zip'?64*1024*1024:24*1024*1024;
  if(file.size<128||file.size>max)throw Error('Неверный размер ROM (допускается до '+(max/1024/1024)+' МБ).');
  return extension;
}
export function segaPlayerURL(moduleUrl,token){
  if(!token||typeof token!=='string')throw Error('Не указан ключ запуска Sega.');
  const url=new URL('../../../sega-player.html',moduleUrl);
  url.searchParams.set('v','sega-local-runtime-20261101');
  url.hash=new URLSearchParams({token}).toString();
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
    this.romFile=null;this.token=null;this.loaded=false;this.uiReady=false;this.destroyed=false;
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
        event.source.postMessage({type:'dashboardx:sega-rom',token:this.token,file:this.romFile},event.origin);
        this.setStatus('ROM передан эмулятору · загрузка ядра…');
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
        if(this.romFile)this.openRom(this.romFile);
        return;
      }
      if(event.data?.type==='dashboardx:sega-start'){
        this.uiReady=true;
        this.setStatus('Игра запущена · управление внутри экрана');
        this.led.textContent='● PLAYING';this.led.classList.add('is-running');
        window.dispatchEvent(new CustomEvent('dashboardx:media-playing',{detail:{id:widget.instanceId,kind:'sega'}}));
      }
      if(event.data?.type==='dashboardx:sega-error')
        this.setStatus(event.data.reason||'Не удалось загрузить EmulatorJS с CDN. Проверьте интернет.');
    });
    on(this.frame,'load',()=>{
      if(this.loaded&&!this.uiReady&&this.romFile)this.setStatus('Эмулятор открыт · ожидаем передачу ROM…');
    });
    on(document,'fullscreenchange',()=>this.fullscreen.setAttribute('aria-pressed',String(document.fullscreenElement===this.stage)));
    this.setStatus('Выберите Sega ROM на устройстве');
  }
  setStatus(message){if(this.status)this.status.textContent=message;}
  openRom(file){
    try{checkSegaRom(file)}catch(error){this.setStatus(error.message);return false;}
    this.stopGame();
    this.romFile=file;
    this.uiReady=false;
    this.token=String(this.widget.instanceId)+'-'+Math.random().toString(36).slice(2);
    try{
      // A real same-origin HTML document avoids srcdoc bootstrapping issues.
      // The ROM stays in memory; deliver it as the original structured File.
      this.frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-pointer-lock allow-forms');
      this.frame.setAttribute('allow','fullscreen; autoplay; gamepad');
      this.frame.src=segaPlayerURL(import.meta.url,this.token);
    }catch(error){
      this.stopGame();this.setStatus(error.message);return false;
    }
    this.loaded=true;
    this.frame.hidden=false;this.placeholder.hidden=true;
    this.name.textContent=file.name;
    this.led.textContent='● LOADING';this.led.classList.remove('is-running');
    this.stop.disabled=false;this.fullscreen.disabled=false;
    this.widget.activate?.();
    this.setStatus('Запуск ядра Sega Mega Drive…');
    return true;
  }
  stopGame(){
    if(document.fullscreenElement===this.stage)document.exitFullscreen?.().catch(()=>{});
    this.loaded=false;
    this.frame.hidden=true;
    this.frame.removeAttribute('srcdoc');
    this.frame.src='about:blank';
    this.placeholder.hidden=false;
    this.led.textContent='● STANDBY';this.led.classList.remove('is-running');
    this.name.textContent='Нет загруженной игры';
    this.stop.disabled=true;this.fullscreen.disabled=true;
    this.romFile=null;this.token=null;this.uiReady=false;
    this.setStatus('ROM выгружен');
  }
  destroy(){
    if(this.destroyed)return;
    this.destroyed=true;
    this.unbind.forEach(fn=>fn());this.unbind.length=0;
    this.stopGame();
  }
}
