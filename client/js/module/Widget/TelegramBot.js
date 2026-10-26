export default class TelegramBotWidget {
 constructor(widget){
  this.widget=widget;this.store=window.dashboardxStore;this.id=widget.instanceId;
  this.message=widget.querySelector('[data-role="message"]');
  this.url=widget.querySelector('[data-role="url"]');
  this.status=widget.querySelector('[data-role="status"]');
  const saved=this.store.getWidgetState(this.id)||{};
  this.message.value=typeof saved.message==='string'?saved.message.slice(0,4000):'';
  this.url.value=typeof saved.url==='string'?saved.url:'';
  this.unbind=[];this.timer=0;
  const on=(node,event,fn)=>{node.addEventListener(event,fn);this.unbind.push(()=>node.removeEventListener(event,fn));};
  const save=()=>{clearTimeout(this.timer);this.timer=setTimeout(()=>{
   this.store.updateWidgetState(this.id,{message:this.message.value,url:this.url.value});
  },250);};
  on(this.message,'input',save);on(this.url,'input',save);
  on(widget.querySelector('[data-action="copy"]'),'click',async()=>{
   if(!this.message.value.trim()){this.status.textContent='Введите текст';return;}
   try{await navigator.clipboard.writeText(this.message.value);this.status.textContent='Скопировано';}
   catch{this.message.select();this.status.textContent='Выделено — нажмите Cmd/Ctrl+C';}
  });
  on(widget.querySelector('[data-action="share"]'),'click',()=>{
   if(!this.message.value.trim()){this.status.textContent='Введите текст';return;}
   const raw=this.url.value.trim();let url='';
   if(raw){try{const u=new URL(raw);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();url=u.href;}
    catch{this.status.textContent='Укажите корректный URL';return;}}
   const share=new URL('https://t.me/share/url');
   share.searchParams.set('url',url);
   share.searchParams.set('text',this.message.value);
   window.open(share.href,'_blank','noopener,noreferrer');
   this.status.textContent='Открылось окно Telegram; выберите получателя и подтвердите отправку';
  });
  on(widget.querySelector('[data-action="clear"]'),'click',()=>{
   this.message.value='';this.url.value='';save();this.status.textContent='Черновик очищен';
  });
 }
 destroy(){
  clearTimeout(this.timer);
  this.store.updateWidgetState(this.id,{message:this.message.value,url:this.url.value});
  this.unbind.forEach(fn=>fn());
  this.unbind=[];
 }
}