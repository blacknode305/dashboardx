const AUDIOBOT_URL='https://audiobot.site/';

// AudioBot is a third-party website. No audio data is downloaded or proxied.
export default class AudioBotVkWidget {
  constructor(widget){
    this.frame=widget.querySelector('[data-role="audiobot-frame"]');
    this.reload=widget.querySelector('[data-action="reload"]');
    this.hint=widget.querySelector('[data-role="audiobot-hint"]');
    if(!this.frame||!this.reload)throw new Error('AudioBot widget template unavailable');
    this.onReload=()=>{
      // Reload only on explicit request; never reset the frame when moving/resizing.
      this.frame.src=AUDIOBOT_URL;
    };
    this.onError=()=>{
      this.hint.textContent='Не удалось загрузить AudioBot внутри DashboardX. Откройте сайт в новой вкладке.';
    };
    this.reload.addEventListener('click',this.onReload);
    this.frame.addEventListener('error',this.onError);
    // A frame "load" event does not prove a cross-origin site allowed embedding.
  }
  destroy(){
    this.reload?.removeEventListener('click',this.onReload);
    this.frame?.removeEventListener('error',this.onError);
  }
}
