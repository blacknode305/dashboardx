const SPEC={
 wishlistGames:{status:['Хочу поиграть','В процессе','Пройдено','Отложено'],fields:['name','platform','link']},
 wishlistPrice:{status:['Хочу купить','Коплю','Куплено'],fields:['name','target','saved','link']},
 torrentTracker:{status:['В очереди','Загружается внешним клиентом','Готово','Приостановлено'],fields:['name','link']}
};
function safeLink(value,kind){
 if(!value)return '';
 try{
  const url=new URL(value);
  if(url.username||url.password)return '';
  if(kind==='torrentTracker'&&url.protocol==='magnet:'&&url.searchParams.get('xt')?.startsWith('urn:btih:'))
   return url.href;
  return (url.protocol==='https:'||url.protocol==='http:')?url.href:'';
 }catch{return '';}
}
const text=(tag,value,klass)=>{
 const el=document.createElement(tag);if(value!==undefined)el.textContent=String(value);
 if(klass)el.className=klass;return el;
};
export default class LocalCollectionWidget {
 constructor(widget){
  this.widget=widget;this.type=widget.templateId;
  this.config=SPEC[this.type];if(!this.config)throw Error('Unknown list');
  this.store=window.dashboardxStore;
  this.form=widget.querySelector('[data-role="add-form"]');
  this.search=widget.querySelector('[data-role="search"]');
  this.filter=widget.querySelector('[data-role="filter"]');
  this.list=widget.querySelector('[data-role="results"]');
  this.message=widget.querySelector('[data-role="message"]');
  this.count=widget.querySelector('[data-role="count"]');
  const state=this.store.getWidgetState(widget.instanceId)||{};
  this.rows=Array.isArray(state.items)?state.items.filter(x=>x&&typeof x.name==='string').slice(0,300):[];
  this.search.value='';this.filter.append(new Option('Все статусы',''));
  for(const s of this.config.status)this.filter.append(new Option(s,s));
  this.unbind=[];
  const on=(el,event,handler)=>{
   el.addEventListener(event,handler);this.unbind.push(()=>el.removeEventListener(event,handler));
  };
  on(this.form,'submit',event=>{
   event.preventDefault();
   const data=Object.fromEntries(new FormData(this.form));
   const name=String(data.name||'').trim();
   if(!name)return;
   if(this.rows.length>=300){this.say('Не больше 300 записей в одном виджете.');return;}
   const item={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
    name:name.slice(0,120),status:this.config.status[0]};
   for(const key of this.config.fields){
    if(key==='name')continue;
    const raw=String(data[key]||'').trim();
    item[key]=key==='target'||key==='saved'?Math.max(0,Number(raw)||0):raw.slice(0,2000);
   }
   if(item.link&&!safeLink(item.link,this.type)){this.say('Только безопасные HTTPS/HTTP'+(this.type==='torrentTracker'?' или magnet':'')+' ссылки.');return;}
   this.rows.unshift(item);this.persist();this.form.reset();this.render();
  });
  on(this.search,'input',()=>this.render());
  on(this.filter,'change',()=>this.render());
  on(widget.querySelector('[data-action="export"]'),'click',()=>this.export());
  const file=widget.querySelector('[data-role="import"]');
  on(file,'change',async()=>{
   const selected=file.files?.[0];if(!selected)return;
   try{
    if(selected.size>800_000)throw Error('Слишком большой файл (макс. 800 КБ)');
    const parsed=JSON.parse(await selected.text());
    if(parsed?.kind!==this.type||!Array.isArray(parsed.items))throw Error('Неверный тип списка');
    const clean=parsed.items.slice(0,300).map(p=>this.clean(p)).filter(Boolean);
    if(!window.confirm('Заменить текущий список ('+this.rows.length+' записей) на '+clean.length+'?'))return;
    this.rows=clean;this.persist();this.render();this.say('Импортировано: '+clean.length);
   }catch(e){this.say('Не удалось импортировать: '+(e.message||e));}
   finally{file.value='';}
  });
  this.render();
 }
 clean(p){
  if(!p||typeof p!=='object'||!String(p.name||'').trim())return null;
  const row={id:String(p.id||Date.now())+'-'+Math.random().toString(36).slice(2,6),
    name:String(p.name).slice(0,120),status:this.config.status.includes(p.status)?p.status:this.config.status[0]};
  for(const key of this.config.fields){
   if(key==='name')continue;
   if(key==='target'||key==='saved')row[key]=Math.max(0,Math.min(1e12,Number(p[key])||0));
   else row[key]=String(p[key]||'').slice(0,2000);
  }
  if(row.link&&!safeLink(row.link,this.type))row.link='';
  return row;
 }
 persist(){
  if(!this.store.updateWidgetState(this.widget.instanceId,{items:this.rows}))this.say('Не хватает памяти браузера для сохранения списка.');
  window.dispatchEvent(new CustomEvent('dashboardx:collection-updated',{detail:{type:this.type,id:this.widget.instanceId,count:this.rows.length}}));
 }
 say(value){this.message.textContent=value;}
 export(){
  const blob=new Blob([JSON.stringify({kind:this.type,version:1,items:this.rows},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=this.type+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 render(){
  const q=this.search.value.toLocaleLowerCase(),status=this.filter.value;
  const rows=this.rows.filter(r=>(!status||r.status===status)&&
   [r.name,r.platform,r.link].some(v=>String(v||'').toLocaleLowerCase().includes(q)));
  this.count.textContent=rows.length+' / '+this.rows.length;
  this.list.replaceChildren();
  if(!rows.length)this.list.append(text('p','Пока нет записей для этих условий.','dx-muted'));
  for(const r of rows){
   const card=text('article',undefined,'dx-collection-card');
   const heading=text('div',undefined,'dx-collection-heading');
   heading.append(text('strong',r.name));
   const select=document.createElement('select');select.setAttribute('aria-label','Статус');
   for(const option of this.config.status)select.append(new Option(option,option));
   select.value=r.status;
   select.addEventListener('change',()=>{r.status=select.value;this.persist();this.render();});
   heading.append(select);card.append(heading);
   if(r.platform)card.append(text('p','Платформа: '+r.platform,'dx-muted'));
   if(this.type==='wishlistPrice'){
    const goal=Number(r.target||0),saved=Number(r.saved||0),pct=goal>0?Math.min(100,Math.round(saved/goal*100)):0;
    card.append(text('p','Накоплено: '+saved.toLocaleString('ru-RU')+' / '+goal.toLocaleString('ru-RU')+' ('+pct+'%)','dx-muted'));
    const progress=document.createElement('progress');progress.max=100;progress.value=pct;card.append(progress);
    const edit=text('button','Изменить накопления');edit.type='button';
    edit.addEventListener('click',()=>{
      const value=window.prompt('Новая накопленная сумма (положительное число)',String(saved));
      if(value===null)return;const n=Number(value.replace(',','.'));
      if(!Number.isFinite(n)||n<0)return this.say('Неверная сумма');
      r.saved=n;this.persist();this.render();
    });card.append(edit);
   }
   const actions=text('div',undefined,'dx-experience-toolbar');
   const href=safeLink(r.link,this.type);
   if(href){
    const anchor=text('a',this.type==='torrentTracker'?'Открыть в торрент-клиенте':'Открыть ссылку');
    anchor.href=href;anchor.rel='noopener noreferrer';anchor.target='_blank';actions.append(anchor);
   }
   const share=text('button','В Telegram');share.type='button';
   share.title='Передать название и ссылку в черновик Telegram';
   share.addEventListener('click',()=>{
    const lines=[r.name,r.platform?'Платформа: '+r.platform:'',
      this.type==='wishlistPrice'?'Цель: '+String(r.target||0):'',
      href||''].filter(Boolean);
    window.dispatchEvent(new CustomEvent('dashboardx:share-text',{
     detail:{text:lines.join('\n'),url:href||''}
    }));
    this.say('Передано в черновик Telegram (если виджет открыт)');
   });
   actions.append(share);
   const remove=text('button','Удалить');remove.type='button';
   remove.addEventListener('click',()=>{
    if(!window.confirm('Удалить «'+r.name+'»?'))return;
    this.rows=this.rows.filter(x=>x.id!==r.id);this.persist();this.render();
   });actions.append(remove);card.append(actions);this.list.append(card);
  }
 }
 destroy(){this.unbind.forEach(fn=>fn());this.unbind=[];}
}
