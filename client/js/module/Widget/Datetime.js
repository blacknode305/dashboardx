import { locale } from '../i18n.js';
const ZONES=['local','Asia/Almaty','Europe/Moscow','Europe/London','America/New_York','Asia/Tokyo','UTC'];
export default class DatetimeWidget {
 constructor(widget){
  this.widget=widget;this.store=window.dashboardxStore;this.id=widget.instanceId;
  const saved=this.store.getWidgetState(this.id)||{};
  this.zone=ZONES.includes(saved.zone)?saved.zone:'local';
  this.hour12=saved.hour12===true;
  this.time=widget.querySelector('[data-role="time"]');this.date=widget.querySelector('[data-role="date"]');
  this.name=widget.querySelector('[data-role="tz-name"]');
  this.zoneSelect=widget.querySelector('[data-role="timezone"]');
  this.format=widget.querySelector('[data-role="format"]');
  this.zoneSelect.value=this.zone;this.format.value=this.hour12?'12':'24';
  this.unbind=[];
  const on=(el,e,cb)=>{el.addEventListener(e,cb);this.unbind.push(()=>el.removeEventListener(e,cb));};
  const change=()=>{
   this.zone=this.zoneSelect.value;this.hour12=this.format.value==='12';
   this.store.updateWidgetState(this.id,{zone:this.zone,hour12:this.hour12});this.update();
  };
  on(this.zoneSelect,'change',change);on(this.format,'change',change);
  on(widget.querySelector('[data-action="copy-time"]'),'click',async()=>{
   try{await navigator.clipboard.writeText(this.date.textContent+' '+this.time.textContent);}
   catch{this.name.textContent='Копирование недоступно';}
  });
  this.update();this.timer=setInterval(()=>{if(!document.hidden)this.update();},1000);
 }
 update(){
  const opts=this.zone==='local'?{}:{timeZone:this.zone},now=new Date();
  this.time.textContent=now.toLocaleTimeString(locale(),{...opts,
   hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:this.hour12});
  this.date.textContent=now.toLocaleDateString(locale(),{...opts,
   weekday:'long',year:'numeric',month:'long',day:'numeric'});
  this.name.textContent=this.zoneSelect.selectedOptions?.[0]?.textContent||this.zone;
 }
 destroy(){clearInterval(this.timer);this.unbind.forEach(fn=>fn());}
}