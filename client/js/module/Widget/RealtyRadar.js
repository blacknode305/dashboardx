import { RADAR_TABS, normalizeListings, analyzeListings } from './RealtyRadarAnalysis.js?v=realty-radar-20261101';
const STREETS=['Нуркена Абдирова','Лободы','Ерубаева','Гоголя'];
const DEFAULT_STREETS={monthly:STREETS,buyout:STREETS,short:STREETS,sale:[]};
const DEFAULT_MAX={monthly:150000,buyout:150000,short:25000,sale:40000000};
const SALE_LINKS={
  krisha:'https://krisha.kz/prodazha/kvartiry/karaganda/',
  olx:'https://www.olx.kz/nedvizhimost/prodazha-kvartir/karaganda/',
  kn:'https://www.kn.kz/karaganda/prodazha-kvartir'
};
const SHORT_LINKS={
  krisha:'https://krisha.kz/arenda/kvartiry-posutochno/karaganda/',
  olx:'https://www.olx.kz/nedvizhimost/arenda-pochasovo-posutochno/kvartiry/karaganda/',
  kn:'https://www.kn.kz/karaganda/arenda-kvartir'
};
const RENT_LINKS={
  krisha:'https://krisha.kz/arenda/kvartiry/karaganda/',
  olx:'https://www.olx.kz/nedvizhimost/arenda-kvartiry/karaganda/',
  kn:'https://www.kn.kz/karaganda/arenda-kvartir'
};
const nfmt = n => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
const priceLabel = row => (row.priceUnit==='hour'?' / час':row.priceUnit==='day'?' / сутки':row.priceUnit==='month'?' / мес.':'');
const node=(tag,className,value)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(value!==undefined)el.textContent=String(value);
  return el;
};
const safeURL=value=>{
  try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
};
function cleanSettings(value,tab){
  const src=value&&typeof value==='object'?value:{};
  return {
    max:Number.isFinite(Number(src.max))&&Number(src.max)>0?Number(src.max):DEFAULT_MAX[tab],
    rooms:['','1','2','3','all'].includes(src.rooms)?src.rooms:'',
    kind:['','apartment','house','land','commercial'].includes(src.kind)?src.kind:(tab==='sale'?'':'apartment'),
    sort:['score','price','recent','discount'].includes(src.sort)?src.sort:'score',
    query:String(src.query||'').slice(0,100),
    streets:Array.isArray(src.streets)?src.streets.filter(s=>STREETS.includes(s)):DEFAULT_STREETS[tab]
  };
}
export default class RealtyRadarWidget {
  constructor(widget) {
    this.widget=widget;
    this.store=window.dashboardxStore;
    this.id=widget.instanceId;
    const state=this.store?.getWidgetState(this.id)||{};
    this.tab=RADAR_TABS.includes(state.tab)?state.tab:'monthly';
    this.settings=Object.fromEntries(RADAR_TABS.map(tab=>[tab,cleanSettings(state.settings?.[tab],tab)]));
    this.feedUrl=safeURL(state.feedUrl||'');
    this.items=normalizeListings(state.items||[]);
    this.favorites=new Set(Array.isArray(state.favorites)?state.favorites.filter(x=>typeof x==='string') : []);
    this.favoritesOnly=false;
    this.lastOpenedBefore=Date.parse(state.lastOpened||'')||0;
    this.lastUpdated=state.lastUpdated||null;
    this.lastFetchedAt=Number(state.lastFetchedAt)||0;
    this.listeners=[];
    this.dead=false;
    this.busy=false;
    const q=selector=>widget.querySelector(selector);
    this.q=q;
    this.status=q('[data-role="status"]');
    this.results=q('[data-role="results"]');
    this.upload=q('[data-role="import"]');
    this.feedInput=q('[data-role="feed"]');
    this.feedInput.value=this.feedUrl;
    const listen=(el,type,fn)=>{
      if(!el)return;
      el.addEventListener(type,fn);
      this.listeners.push(()=>el.removeEventListener(type,fn));
    };
    for(const el of widget.querySelectorAll('[data-tab]')){
      listen(el,'click',()=>{this.tab=el.dataset.tab;this.applyControls();this.persist();this.render();});
    }
    for(const role of ['search','max','rooms','kind','sort']){
      const el=q('[data-role="'+role+'"]');
      listen(el,role==='search'||role==='max'?'input':'change',()=>{
        const value=role==='max'?Number(el.value):el.value;
        this.settings[this.tab][role==='search'?'query':role]=value;
        this.persist();if(role==='kind')this.applyControls();this.render();
      });
    }
    for(const el of widget.querySelectorAll('[data-street]')){
      listen(el,'change',()=>{
        this.settings[this.tab].streets=[...widget.querySelectorAll('[data-street]:checked')].map(c=>c.value);
        this.persist();this.render();
      });
    }
    listen(q('[data-action="favorites"]'),'click',()=>{
      this.favoritesOnly=!this.favoritesOnly;this.render();
    });
    listen(q('[data-action="refresh"]'),'click',()=>void this.refresh(true));
    listen(q('[data-action="save-feed"]'),'click',()=>{
      const raw=this.feedInput.value.trim();
      const url=raw?safeURL(raw):'';
      if(raw&&!url){this.say('Нужен HTTPS URL без логина, пароля или токена в адресе.',true);return;}
      this.feedUrl=url;this.persist();
      this.say(url?'Источник сохранён. Нажмите «Проверить источник».':'Автоматический источник отключён.');
    });
    listen(q('[data-action="export"]'),'click',()=>this.exportJSON());
    const refreshOnReturn=()=>{
      if(this.feedUrl&&!this.busy&&Date.now()-this.lastFetchedAt>6*60*60*1000)void this.refresh(false);
    };
    listen(window,'focus',refreshOnReturn);
    listen(document,'visibilitychange',()=>{if(!document.hidden)refreshOnReturn();});
    listen(this.upload,'change',()=>void this.importJSON());
    listen(this.results,'click',event=>{
      const button=event.target.closest('[data-favorite]');
      if(!button)return;
      const id=button.dataset.favorite;
      if(this.favorites.has(id))this.favorites.delete(id);
      else this.favorites.add(id);
      this.persist();this.render();
    });
    this.applyControls();
    this.persist();
    this.render();
    if(this.feedUrl)void this.refresh(false);
    else this.say('Источники объявлений не подключены. Откройте Krisha / OLX / KN или импортируйте JSON. Фильтры и анализ готовы.');
  }
  say(message,error=false){
    this.status.textContent=message;
    this.status.classList.toggle('is-error',error);
  }
  persist(){
    if(this.dead)return;
    // Kept per widget instance (DashboardX local state); never touch PRO OPTIMA state.
    this.store?.updateWidgetState(this.id,{
      tab:this.tab,settings:this.settings,feedUrl:this.feedUrl,
      items:this.items.slice(0,300),favorites:[...this.favorites].slice(0,400),
      lastOpened:new Date().toISOString(),lastUpdated:this.lastUpdated,lastFetchedAt:this.lastFetchedAt
    });
  }
  applyControls(){
    const s=this.settings[this.tab];
    for(const el of this.widget.querySelectorAll('[data-tab]')){
      el.setAttribute('aria-pressed',String(el.dataset.tab===this.tab));
    }
    this.q('[data-role="search"]').value=s.query;
    this.q('[data-role="max"]').value=s.max;
    this.q('[data-role="rooms"]').value=s.rooms;
    this.q('[data-role="kind"]').value=s.kind;
    this.q('[data-role="sort"]').value=s.sort;
    for(const el of this.widget.querySelectorAll('[data-street]'))el.checked=s.streets.includes(el.value);
    const links=this.tab==='sale'?{
      ...SALE_LINKS,krisha:s.kind==='land'?'https://krisha.kz/prodazha/uchastkov/karaganda/':
      s.kind==='house'?'https://krisha.kz/prodazha/doma-dachi/karaganda/':SALE_LINKS.krisha
    }:this.tab==='short'?SHORT_LINKS:RENT_LINKS;
    for(const [source,url] of Object.entries(links)){
      this.q('[data-source="'+source+'"]').href=url;
    }
  }
  async refresh(manual){
    if(this.busy)return;
    if(!this.feedUrl){
      this.say('Нет разрешённой JSON-ленты. Для ежедневного просмотра доступны ссылки на сайты и импорт JSON.',true);
      return;
    }
    this.busy=true;
    this.lastFetchedAt=Date.now();this.persist();
    this.say('Загрузка разрешённой ленты объявлений…');
    const abort=new AbortController();
    const timer=setTimeout(()=>abort.abort(),14000);
    try{
      const response=await fetch(this.feedUrl,{cache:'no-store',signal:abort.signal,credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok)throw Error('HTTP '+response.status);
      const size=Number(response.headers.get('content-length')||0);
      if(size>3_000_000)throw Error('Файл слишком большой (максимум 3 МБ)');
      const body=await response.text();
      if(body.length>3_000_000)throw Error('Лента слишком большая');
      const data=JSON.parse(body);
      if(!data||!Array.isArray(data.items))throw Error('Ожидается JSON с массивом items');
      const normalized=normalizeListings(data.items);
      if(data.items.length&&!normalized.length)throw Error('Не найдено корректных объявлений в ленте');
      this.merge(normalized,true);
      this.lastUpdated=(typeof data.generatedAt==='string'&&!Number.isNaN(Date.parse(data.generatedAt)))?new Date(data.generatedAt).toISOString():new Date().toISOString();
      const age=Date.now()-Date.parse(this.lastUpdated);
      this.persist();this.render();
      this.say('Источник загружен: '+normalized.length+' объявлений. '+(age>2*86400000?'Внимание: данные источника старше 48 часов.':'Обновление '+new Date(this.lastUpdated).toLocaleString('ru-RU')+'.'));
    }catch(error){
      this.say('Источник недоступен: '+(error?.name==='AbortError'?'тайм-аут':error?.message||'CORS или соединение')+'. Сохранённые объявления доступны.',true);
    }finally{clearTimeout(timer);this.busy=false;}
  }
  merge(incoming,fromFeed){
    const old=new Map(this.items.map(x=>[x.url,x]));
    const seen=new Set();
    const merged=[];
    for(const row of incoming){
      const prev=old.get(row.url);
      seen.add(row.url);
      merged.push({...row,firstSeen:prev?.firstSeen||row.firstSeen,
        previousPrice:prev?.price!==row.price?(prev?.price||null):(prev?.previousPrice||null),
        lastSeen:new Date().toISOString(),missing:false});
    }
    // Retain previously seen items for history; mark absent ones rather than inventing availability.
    for(const prev of this.items)if(!seen.has(prev.url)){
      merged.push({...prev,missing:Boolean(fromFeed)||Boolean(prev.missing)});
    }
    this.items=merged.slice(0,300);
  }
  async importJSON(){
    const file=this.upload.files?.[0];
    if(!file)return;
    try{
      if(file.size>3_000_000)throw Error('Максимум 3 МБ');
      const data=JSON.parse(await file.text());
      if(!Array.isArray(data)&&!Array.isArray(data?.items))throw Error('Нужен массив или объект {items:[...]}');
      const incoming=normalizeListings(data);
      if(!incoming.length)throw Error('Не найдено корректных объявлений; нужны URL, название и цена');
      this.merge(incoming,false);
      this.lastUpdated=(typeof data.generatedAt==='string'&&Number.isFinite(Date.parse(data.generatedAt)))?data.generatedAt:new Date().toISOString();
      this.persist();this.render();
      this.say('Импортировано '+incoming.length+' объявлений. Обновление выполнено вручную, актуальность проверьте на исходных сайтах.');
    }catch(e){this.say('Ошибка импорта: '+e.message,true);}
    finally{this.upload.value='';}
  }
  exportJSON(){
    const content=JSON.stringify({kind:'dashboardx-realty-radar',exportedAt:new Date().toISOString(),items:this.items},null,2);
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='dashboardx-realty-karaganda.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  filters(){
    const s=this.settings[this.tab];
    return {tab:this.tab,maxPrice:s.max,kind:s.kind,rooms:s.rooms&&!['','all'].includes(s.rooms)?[Number(s.rooms)]:[],
      streets:s.streets,sort:s.sort,query:s.query};
  }
  pill(value,kind=''){
    return node('span','dx-realty-pill '+kind,value);
  }
  card(row){
    const card=node('article','dx-realty-card');
    const head=node('div','dx-realty-card-head');
    const names=node('div');
    names.append(node('h3','',row.title),node('small','',row.address||'Адрес не указан'));
    head.append(names,node('small','',row.source));
    card.append(head);
    const price=node('div','dx-realty-price',nfmt(row.price)+' ₸'+priceLabel(row));
    card.append(price);
    const pills=node('div','dx-realty-card-pills');
    if(row.rooms)pills.append(this.pill(row.rooms+' комн.'));
    if(row.area)pills.append(this.pill(row.area+' м²'));
    if(row.tab==='sale'&&row.area)pills.append(this.pill(nfmt(row.unitCost)+' ₸/м²'));
    if(row.kind==='land')pills.append(this.pill('Земельный участок'));
    if(row.tab==='buyout'){
      pills.append(this.pill('Возможность выкупа · проверить','warn'));
      if(row.contractPayment)pills.append(this.pill('Платёж по выкупу: '+nfmt(row.contractPayment)+' ₸','warn'));
      if(row.purchasePrice)pills.append(this.pill('Выкуп: '+nfmt(row.purchasePrice)+' ₸'));
    }
    if(row.discount!==null&&row.discount>=12)pills.append(this.pill('−'+row.discount+'% к медиане','good'));
    else if(row.discount!==null&&row.discount<=-15)pills.append(this.pill('+'+Math.abs(row.discount)+'% к медиане','warn'));
    if(row.firstSeen&&Date.parse(row.firstSeen)>this.lastOpenedBefore&&this.lastOpenedBefore)pills.append(this.pill('Новое','good'));
    if(row.previousPrice&&row.previousPrice>row.price)pills.append(this.pill('Цена снижена на '+nfmt(row.previousPrice-row.price)+' ₸','good'));
    if(row.missing)pills.append(this.pill('Нет в последней загрузке','warn'));
    card.append(pills);
    if(row.description)card.append(node('div','dx-realty-hint',row.description.slice(0,210)));
    if(row.reasons?.length)card.append(node('div','dx-realty-hint',row.reasons.join(' · ')));
    if(row.discount===null)card.append(node('small','','Недостаточно похожих объявлений для оценки цены'));
    const footer=node('div','dx-realty-card-footer');
    const link=node('a','', 'Открыть объявление ↗');
    link.href=row.url;link.target='_blank';link.rel='noopener noreferrer';
    const fav=node('button','',this.favorites.has(row.id)?'★':'☆');
    fav.type='button';fav.dataset.favorite=row.id;
    fav.title=this.favorites.has(row.id)?'Удалить из избранного':'В избранное';
    footer.append(link,fav);card.append(footer);
    return card;
  }
  render(){
    const current=analyzeListings(this.items,this.filters());
    const filtered=this.favoritesOnly?current.filter(x=>this.favorites.has(x.id)):current;
    this.q('[data-role="total"]').textContent=nfmt(this.items.length);
    this.q('[data-role="visible"]').textContent='Найдено: '+filtered.length;
    this.q('[data-role="deals"]').textContent='Ниже медианы на ≥12%: '+filtered.filter(x=>x.discount!==null&&x.discount>=12).length;
    this.q('[data-role="updated"]').textContent='Данные: '+(this.lastUpdated?new Date(this.lastUpdated).toLocaleString('ru-RU'):'не загружены');
    this.q('[data-action="favorites"]').textContent=this.favoritesOnly?'★ Показать все':'☆ Избранное ('+this.favorites.size+')';
    this.results.replaceChildren();
    if(!filtered.length){
      this.results.append(node('div','dx-realty-empty',this.items.length?
        'По выбранным фильтрам объявлений нет. Уберите ограничения цены, комнатности или улиц.':
        'Объявлений пока нет. Подключите разрешённую ленту или импортируйте JSON. Ссылки на сайты сверху открывают поиск.'));
      return;
    }
    for(const row of filtered.slice(0,150))this.results.append(this.card(row));
  }
  destroy(){
    this.dead=true;
    this.listeners.splice(0).forEach(fn=>fn());
  }
}
