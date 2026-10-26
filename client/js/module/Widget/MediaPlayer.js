const validUrl=text=>{
 try{
  const u=new URL(text);
  if((u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password)return u.href;
 }catch{}
 return '';
};
const format=seconds=>{
 if(!Number.isFinite(seconds)||seconds<0)return '00:00';
 const s=Math.floor(seconds),m=Math.floor(s/60);
 return String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
};
export default class MediaPlayerWidget {
 constructor(widget){
  this.widget=widget;this.type=widget.templateId;this.isAudio=this.type==='audioPlayer';
  this.media=widget.querySelector('[data-role="player"]');
  this.files=widget.querySelector('[data-role="files"]');
  this.urlInput=widget.querySelector('[data-role="url"]');
  this.status=widget.querySelector('[data-role="state"]');
  this.now=widget.querySelector('[data-role="now"]');
  this.store=window.dashboardxStore;this.id=widget.instanceId;
  const state=this.store.getWidgetState(this.id)||{};
  this.playlist=this.isAudio&&Array.isArray(state.playlist)?state.playlist.filter(x=>x?.url&&validUrl(x.url)).slice(0,100):[];
  this.currentIndex=-1;this.objectUrls=new Set();this.listeners=[];this.loop=false;
  const on=(el,name,cb)=>{
   el?.addEventListener(name,cb);this.listeners.push(()=>el?.removeEventListener(name,cb));
  };
  this.bind=on;
  this.media.volume=Math.min(1,Math.max(0,Number(state.volume??.7)));
  const volume=widget.querySelector('[data-role="volume"]');
  if(volume)volume.value=String(Math.round(this.media.volume*100));
  on(volume,'input',()=>{this.media.volume=Number(volume.value)/100;this.persist({volume:this.media.volume});});
  on(this.files,'change',()=>{
   const files=Array.from(this.files.files||[]).slice(0,this.isAudio?80:1);
   if(this.isAudio){
    const entries=files.filter(f=>f.type.startsWith('audio/')||/\.(mp3|ogg|wav|flac|m4a)$/i.test(f.name))
      .map(f=>({name:f.name.slice(0,120),url:URL.createObjectURL(f),local:true}));
    entries.forEach(e=>this.objectUrls.add(e.url));
    if(this.playlist.length+entries.length>150){this.message('Слишком много файлов');return;}
    this.playlist.push(...entries);this.renderPlaylist();
    if(this.currentIndex<0&&this.playlist.length)this.select(0);
   }else if(files.length){this.openLocal(files[0]);}
   this.files.value='';
  });
  on(widget.querySelector('[data-action="add-url"]'),'click',()=>{
   const url=validUrl(this.urlInput.value.trim());
   if(!url){this.message('Нужна корректная прямая ссылка https://…');return;}
   if(this.isAudio){
    if(this.playlist.length>=150){this.message('Лимит 150 треков');return;}
    this.playlist.push({name:decodeURIComponent(new URL(url).pathname.split('/').pop()||'Онлайн-трек').slice(0,120),url,local:false});
    this.persistPlaylist();this.renderPlaylist();
    if(this.currentIndex<0)this.select(0);
   }else {
    this.openUrl(url);
    this.persist({videoUrl:url});
   }
   this.urlInput.value='';
  });
  on(widget.querySelector('[data-action="play"]'),'click',()=>this.toggle());
  on(widget.querySelector('[data-action="prev"]'),'click',()=>this.select(Math.max(0,(this.currentIndex-1+this.playlist.length)%this.playlist.length),true));
  on(widget.querySelector('[data-action="next"]'),'click',()=>this.select((this.currentIndex+1)%this.playlist.length,true));
  on(widget.querySelector('[data-action="clear"]'),'click',()=>{
   this.media.pause();this.media.removeAttribute('src');this.media.load();
   this.playlist=[];this.currentIndex=-1;this.revokeFiles();
   this.persistPlaylist();this.renderPlaylist();this.message('Плейлист очищен');
  });
  on(widget.querySelector('[data-action="loop"]'),'click',()=>{
   this.loop=!this.loop;
   widget.querySelector('[data-action="loop"]').setAttribute('aria-pressed',String(this.loop));
   this.message(this.loop?'Повтор включён':'Повтор выключен');
  });
  on(widget.querySelector('[data-action="back"]'),'click',()=>{this.media.currentTime=Math.max(0,this.media.currentTime-10)});
  on(widget.querySelector('[data-action="forward"]'),'click',()=>{this.media.currentTime=Math.min(this.media.duration||Infinity,this.media.currentTime+10)});
  const speed=widget.querySelector('[data-role="speed"]');
  on(speed,'change',()=>{this.media.playbackRate=Number(speed.value);this.persist({speed:this.media.playbackRate});});
  if(speed&&[...speed.options].some(o=>o.value===String(state.speed)))speed.value=String(state.speed);
  if(speed)this.media.playbackRate=Number(speed.value);
  on(widget.querySelector('[data-action="pip"]'),'click',async()=>{
   try{
    if(document.pictureInPictureElement)await document.exitPictureInPicture();
    else await this.media.requestPictureInPicture();
   }catch{this.message('PiP недоступен для этого видео');}
  });
  on(widget.querySelector('[data-action="fullscreen"]'),'click',async()=>{
   try{
    if(document.fullscreenElement===this.media)await document.exitFullscreen();
    else await this.media.requestFullscreen();
   }catch{this.message('Полный экран недоступен');}
  });
  on(this.media,'error',()=>this.message('Не удалось воспроизвести файл или ссылку'));
  on(this.media,'playing',()=>{
   this.message('Воспроизведение');
   window.dispatchEvent(new CustomEvent('dashboardx:media-playing',{detail:{id:this.id}}));
  });
  on(this.media,'pause',()=>{if(!this.media.ended)this.message('Пауза');});
  on(window,'dashboardx:media-playing',e=>{if(e.detail?.id!==this.id)this.media.pause();});
  on(this.media,'ended',()=>{
   if(this.isAudio&&this.playlist.length){
    if(this.loop)this.select(this.currentIndex,true);
    else if(this.currentIndex+1<this.playlist.length)this.select(this.currentIndex+1,true);
   }
  });
  const seek=widget.querySelector('[data-role="seek"]'),clock=widget.querySelector('[data-role="clock"]');
  on(this.media,'timeupdate',()=>{
   if(clock)clock.textContent=format(this.media.currentTime)+' / '+format(this.media.duration);
   if(seek)seek.value=Number.isFinite(this.media.duration)&&this.media.duration>0?
    String(Math.round(this.media.currentTime/this.media.duration*1000)):'0';
  });
  on(seek,'input',()=>{
   if(Number.isFinite(this.media.duration)&&this.media.duration>0)
    this.media.currentTime=Number(seek.value)/1000*this.media.duration;
  });
  this.keyboardHandler=e=>{

   if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target?.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;
   if(e.code==='Space'){e.preventDefault();this.toggle();}
   if(!this.isAudio&&['ArrowLeft','ArrowRight'].includes(e.code)){
    e.preventDefault();this.media.currentTime=Math.max(0,this.media.currentTime+(e.code==='ArrowRight'?10:-10));
   }
   if(!this.isAudio&&e.code==='KeyF'){e.preventDefault();widget.querySelector('[data-action="fullscreen"]').click();}
  };
  on(widget,'keydown',this.keyboardHandler);
  // A click on the video/canvas itself is focusable using the normal widget wrapper.
  // Across audio/video/NES, only the chosen player continues playing.
  on(window,'dashboardx:nes-playing',()=>this.media.pause());
  if(this.isAudio)this.renderPlaylist();
  else if(validUrl(state.videoUrl))this.openUrl(state.videoUrl);
 }
 persist(change){this.store.updateWidgetState(this.id,change);}
 persistPlaylist(){this.persist({playlist:this.playlist.filter(x=>!x.local).slice(0,100)});}
 message(value){this.status.textContent=value;}
 openLocal(file){
  if(!(file.type.startsWith('video/')||/\.(mp4|webm|mov|m4v)$/i.test(file.name))||file.size>1_000_000_000){
   this.message('Выберите видеофайл до 1 ГБ');return;
  }
  this.revokeFiles();
  const url=URL.createObjectURL(file);this.objectUrls.add(url);
  this.media.pause();this.media.src=url;this.media.load();
  this.now.textContent=file.name;this.message('Локальный файл готов');
  this.persist({videoUrl:''});
 }
 openUrl(url){
  this.media.pause();this.revokeFiles();
  this.media.src=url;this.media.load();
  this.now.textContent=url;this.message('Ссылка загружена');
 }
 select(index,autoplay=false){
  if(!this.isAudio||!this.playlist.length||!Number.isInteger(index)||index<0||index>=this.playlist.length)return;
  this.currentIndex=index;const item=this.playlist[index];
  this.media.pause();this.media.src=item.url;this.media.load();
  this.now.textContent=item.name;
  this.renderPlaylist();this.message('Выбран трек: '+item.name);
  if(autoplay)void this.play();
 }
 renderPlaylist(){
  const list=this.widget.querySelector('[data-role="playlist"]');list.replaceChildren();
  if(!this.playlist.length){list.textContent='Плейлист пока пуст';return;}
  this.playlist.forEach((item,i)=>{
   const row=document.createElement('div');row.className='dx-media-track'+(i===this.currentIndex?' is-active':'');
   const select=document.createElement('button');select.type='button';select.textContent=(i+1)+'. '+item.name;
   select.addEventListener('click',()=>this.select(i,true));row.append(select);
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Убрать трек';
   remove.addEventListener('click',()=>{
    const wasCurrent=i===this.currentIndex;if(wasCurrent){this.media.pause();this.media.removeAttribute('src');}
    const [deleted]=this.playlist.splice(i,1);
    if(deleted.local){URL.revokeObjectURL(deleted.url);this.objectUrls.delete(deleted.url);}
    if(wasCurrent){this.currentIndex=-1;this.now.textContent='Выберите трек';}
    else if(i<this.currentIndex)this.currentIndex--;
    this.persistPlaylist();this.renderPlaylist();
   });row.append(remove);list.append(row);
  });
 }
 async play(){
  try{await this.media.play()}catch{this.message('Нажмите Play после загрузки медиа');}
 }
 toggle(){
  if(this.media.paused){
   if(this.isAudio&&this.currentIndex<0&&this.playlist.length)this.select(0);
   void this.play();
  }else this.media.pause();
 }
 revokeFiles(){for(const url of this.objectUrls)URL.revokeObjectURL(url);this.objectUrls.clear();}
 destroy(){
  this.listeners.forEach(fn=>fn());this.listeners=[];
  this.media.pause();this.media.removeAttribute('src');this.media.load();
  this.revokeFiles();
 }
}
