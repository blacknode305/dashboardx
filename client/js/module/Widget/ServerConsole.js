import eventBus from '../EventBus.js';
const EVENTS=[
 ['dashboardx:widget-action','Виджет'],
 ['dashboardx:workspace-command','Рабочий стол'],
 ['dashboardx:media-playing','Медиа'],
 ['dashboardx:collection-updated','Список'],
 ['dashboardx:credential-changed','Подключение'],
 ['dashboardx:ai-config','AI'],
 ['dashboardx:nes-playing','NES'],
 ['dashboardx:share-text','Передача текста']
];
export default class ServerConsoleWidget {
 constructor(widget){
  this.widget=widget;this.output=widget.querySelector('[data-role="server-console"]');
  this.count=widget.querySelector('[data-role="count"]');
  this.items=[];this.listeners=[];this.max=120;
  this.append('Диагностика DashboardX запущена');
  for(const [key,label] of EVENTS){
   const handler=event=>{
    // Never serialize event.detail; credentials and user content may be present.
    if(key==='dashboardx:credential-changed')this.append('Настройки подключения изменены');
    else if(key==='dashboardx:media-playing')this.append('Медиаплеер начал воспроизведение');
    else if(key==='dashboardx:collection-updated')this.append('Локальный список обновлён');
    else if(key==='dashboardx:share-text')this.append('Текст передан между виджетами');
    else if(key==='dashboardx:nes-playing')this.append('NES запущена');
    else this.append(label+': событие');
   };
   window.addEventListener(key,handler);
   this.listeners.push(()=>window.removeEventListener(key,handler));
  }
  const onFinance=()=>this.append('Финансовые данные обновлены');
  eventBus.on('finance:dayBalanceWidget:updated',onFinance);
  this.listeners.push(()=>eventBus.off('finance:dayBalanceWidget:updated',onFinance));
  const clear=widget.querySelector('[data-action="clear"]');
  const exportButton=widget.querySelector('[data-action="export"]');
  const onClear=()=>{this.items=[];this.output.replaceChildren();this.count.textContent='0';this.append('Журнал очищен');};
  const onExport=()=>{
   const blob=new Blob([this.items.map(x=>x.time+'  '+x.text).join('\n')],{type:'text/plain;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dashboardx-events.txt';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  clear.addEventListener('click',onClear);exportButton.addEventListener('click',onExport);
  this.listeners.push(()=>clear.removeEventListener('click',onClear),
   ()=>exportButton.removeEventListener('click',onExport));
 }
 append(value){
  const item={time:new Date().toLocaleTimeString('ru-RU'),text:String(value)};
  this.items.push(item);if(this.items.length>this.max)this.items.shift();
  const row=document.createElement('div');row.className='dx-event-row';
  const time=document.createElement('small');time.textContent=item.time;
  const message=document.createElement('span');message.textContent=item.text;
  row.append(time,message);this.output.append(row);
  if(this.output.children.length>this.max)this.output.firstElementChild?.remove();
  this.count.textContent=String(this.items.length);
 }
 destroy(){this.listeners.forEach(fn=>fn());this.listeners=[];}
}
