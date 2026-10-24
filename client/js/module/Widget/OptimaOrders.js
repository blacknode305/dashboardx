import { t } from '../i18n.js';
import { getCredential } from '../CredentialStore.js';
import { loadOptima, OPTIMA_BASE, OPTIMA_POLL_MS, norm, rows, branchNames, dateISO } from '../OptimaAPI.js';
import { dayIndex, nextDayDate, orderCards, orderAction, orderDisplayStatus } from '../OptimaOrderPlan.js';

const elem=(tag,content,cls)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(content!==undefined)el.textContent=String(content??'');
 return el;
};
const select=(el,options,keep)=>{
 el.replaceChildren();
 for(const [value,label] of options)el.append(new Option(label,String(value)));
 el.value=options.some(([v])=>String(v)===String(keep))?String(keep):String(options[0]?.[0]??'');
};
const labels=['sun','mon','tue','wed','thu','fri','sat'];
export function filterScheduledOrders(cards,query,status){
 const q=norm(query);
 return cards.filter(c=>{
  const st=orderDisplayStatus(c.order);
  if(status&&status!=='all'&&st!==status)return false;
  return !q||norm([c.branch,c.supplier,...rows(c.plan?.items||c.order?.items).map(x=>x.name||x.product)].join(' ')).includes(q);
 });
}
const stageText=stage=>t('orders.status.'+stage);
export default class OptimaOrdersWidget {
 constructor(widget){
  this.widget=widget;this.id=widget.instanceId;
  this.store=window.dashboardxStore;this.destroyed=false;this.seq=0;
  const saved=this.store?.getWidgetState(this.id)||{};
  this.filters={
   mode:['plan','history','requests'].includes(saved.mode)?saved.mode:'plan',
   branch:typeof saved.branch==='string'?saved.branch:'',
   status:typeof saved.status==='string'?saved.status:'all',
   search:typeof saved.search==='string'?saved.search:'',
   date:typeof saved.date==='string'&&saved.date?saved.date:dateISO()
  };
  this.root=widget.querySelector('.optima-order-widget');
  const query=role=>widget.querySelector('[data-role="'+role+'"]');
  this.els={
   mode:query('orders-mode'),branch:query('orders-branch'),day:query('orders-day'),
   date:query('orders-date'),status:query('orders-status'),search:query('orders-search'),
   refresh:query('orders-refresh'),statusText:query('orders-status-text'),count:query('orders-count'),
   list:query('orders-list'),panel:query('orders-panel'),panelTitle:query('orders-panel-title'),
   panelStatus:query('orders-panel-status'),form:query('orders-form'),items:query('orders-items'),
   pin:query('orders-pin'),error:query('orders-error'),submit:query('orders-submit')
  };
  this.db=null;this.revision=null;this.current=null;this.editing=false;this.busy=false;this.actions=[];
  this.bind=(el,event,fn)=>{
   el.addEventListener(event,fn);
   this.actions.push(()=>el.removeEventListener(event,fn));
  };
  this.renderFilters();
  const changed=()=>{
   this.readFilters();this.renderFilters();this.closePanel();this.render();
   clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.saveFilters(),220);
  };
  this.bind(this.els.mode,'change',changed);
  this.bind(this.els.branch,'change',changed);
  this.bind(this.els.status,'change',changed);
  this.bind(this.els.search,'input',changed);
  this.bind(this.els.date,'change',()=>{
   if(dayIndex(this.els.date.value)<0)return;
   this.els.day.value=String(dayIndex(this.els.date.value));changed();
  });
  this.bind(this.els.day,'change',()=>{
   this.els.date.value=nextDayDate(this.els.date.value||dateISO(),Number(this.els.day.value));
   changed();
  });
  this.bind(this.els.refresh,'click',()=>{if(!this.editing)this.load();});
  this.bind(query('orders-close'),'click',()=>this.closePanel());
  this.bind(query('orders-abort'),'click',()=>this.closePanel());
  this.bind(this.els.form,'submit',event=>{event.preventDefault();this.submit();});
  this.onCredential=event=>{
   if(event.detail?.service!=='optima')return;
   this.db=null;this.closePanel();this.load();
  };
  this.onUpdated=()=>{if(!this.editing)this.load();};
  window.addEventListener('dashboardx:credential-changed',this.onCredential);
  window.addEventListener('dashboardx:optima-updated',this.onUpdated);
  this.load();
  this.poll=setInterval(()=>{if(!document.hidden&&!this.editing)this.load();},OPTIMA_POLL_MS);
 }
 readFilters(){
  this.filters.mode=this.els.mode.value;
  this.filters.branch=this.els.branch.value;
  this.filters.status=this.els.status.value;
  this.filters.search=this.els.search.value;
  this.filters.date=this.els.date.value;
 }
 saveFilters(){this.store?.updateWidgetState(this.id,{...this.filters});}
 renderFilters(){
  const f=this.filters;
  select(this.els.mode,[['plan',t('orders.mode.plan')],['history',t('optima.mode.history')],['requests',t('optima.mode.requests')]],f.mode);
  select(this.els.branch,[['',t('optima.allBranches')],...branchNames(this.db||{}).map(s=>[s,s])],f.branch);
  select(this.els.day,labels.map((key,i)=>[i,t('orders.day.'+key)]),String(Math.max(0,dayIndex(f.date))));
  const statuses=f.mode==='requests'?['all','pending','approved','rejected']:
    f.mode==='history'?['all','received','sent','confirmed','done','cancelled']:
    ['all','new','received','sent','confirmed','done','cancelled'];
  select(this.els.status,statuses.map(s=>[s,s==='all'?t('optima.filter.all'):stageText(s)]),f.status);
  this.els.date.value=f.date;
  this.els.search.value=f.search;
  // Preserve the selected branch until a real DB is successfully loaded.
  if(this.db)f.branch=this.els.branch.value;
  f.status=this.els.status.value;
 }
 setMessage(key,values={}){this.els.statusText.textContent=t(key,values);}
 async load(){
  if(!getCredential('optima')){
   this.controller?.abort();this.db=null;this.render();
   this.setMessage('optima.needToken');return;
  }
  this.controller?.abort();
  const ctrl=new AbortController();this.controller=ctrl;
  const seq=++this.seq;this.els.refresh.disabled=true;this.setMessage('optima.loading');
  try{
   const result=await loadOptima(ctrl.signal);
   if(this.destroyed||ctrl.signal.aborted||seq!==this.seq)return;
   this.db=result.data;this.revision=result.revision;
   this.renderFilters();this.render();
   this.setMessage('optima.connected',{revision:String(result.revision)});
  }catch(error){
   if(this.destroyed||ctrl.signal.aborted||seq!==this.seq)return;
   this.setMessage(error.status===401?'optima.unauthorized':error.status===403?'optima.denied':'optima.offline');
   this.render();
  }finally{if(!this.destroyed&&seq===this.seq)this.els.refresh.disabled=false;}
 }
 render(){
  this.els.list.replaceChildren();
  this.els.count.textContent='';
  if(!this.db)return;
  const f=this.filters,items=this.getCards();
  const summary={
   all:items.length,new:items.filter(x=>!x.order).length,
   sent:items.filter(x=>orderDisplayStatus(x.order)==='sent').length,
   completed:items.filter(x=>['confirmed','done'].includes(orderDisplayStatus(x.order))).length
  };
  this.els.count.textContent=f.mode==='plan'
   ?t('orders.summary',Object.fromEntries(Object.entries(summary).map(([k,v])=>[k,String(v)])))
   :t('optima.found',{count:String(items.length),total:String(items.length)});
  if(!items.length){
   this.els.list.append(elem('p',t(f.mode==='plan'?'orders.noPlan':'orders.noRecords'),'optima-empty'));return;
  }
  for(const item of items.slice(0,200))this.els.list.append(this.card(item));
  if(items.length>200)this.els.list.append(elem('p',t('optima.limit',{count:'200'}),'optima-hint'));
 }
 getCards(){
  const f=this.filters,db=this.db;
  if(f.mode==='plan'){
   return filterScheduledOrders(orderCards(db,f.branch,f.date),f.search,f.status);
  }
  const all=f.mode==='requests'?rows(db.dateRequests):rows(db.history);
  return all.filter(o=>{
   if(f.branch&&norm(f.branch)!==norm(o.branch))return false;
   const stage=f.mode==='requests'?String(o.status||'pending'):orderDisplayStatus(o);
   if(f.status!=='all'&&f.status!==stage)return false;
   if(f.date&&(f.mode==='requests'?String(o.requestedDate||o.createdAt||'').slice(0,10)!==f.date:
     String(o.requestDate||'')!==f.date))return false;
   const text=[o.supplier,o.branch,o.reason,...rows(o.items).map(x=>x.product||x.name)].join(' ');
   return !norm(f.search)||norm(text).includes(norm(f.search));
  }).sort((a,b)=>String(b.createdAt||b.requestDate||'').localeCompare(String(a.createdAt||a.requestDate||'')))
  .map(order=>({order,plan:null,branch:order.branch,supplier:order.supplier||'—',requestMode:f.mode==='requests'}));
 }
 card(item){
  const o=item.order;
  const state=item.requestMode?(o.status||'pending'):orderDisplayStatus(o);
  const card=elem('article',undefined,'optima-order-card');
  const top=elem('div',undefined,'optima-order-card-head');
  const names=elem('div',undefined,'optima-order-card-names');
  names.append(elem('strong',item.supplier),elem('span',item.branch));
  const badge=elem('span',t('orders.status.'+state),'optima-order-badge optima-order-'+state);
  top.append(names,badge);card.append(top);
  const dates=elem('div',undefined,'optima-order-card-dates');
  const date=o?.requestDate||item.plan?.requestDate||o?.requestedDate||'—';
  const delivery=o?.deliveryDate||item.plan?.deliveryDate||o?.requestedDeliveryDate||'—';
  dates.append(elem('span',t('orders.requestDate')+': '+date),
   elem('span',t('optima.delivery')+': '+delivery));
  card.append(dates);
  const parts=rows(o?.items||item.plan?.items);
  card.append(elem('div',t('orders.itemsCount',{count:String(parts.length)}),'optima-order-card-meta'));
  const buttons=elem('div',undefined,'optima-order-card-actions');
  if(item.requestMode){
   const view=elem('button',t('orders.view'),'');
   view.type='button';view.addEventListener('click',()=>this.view(item));
   buttons.append(view);
  }else{
   const action=orderAction(o,item.plan);
   if(action==='fill'||action==='correct'){
    const button=elem('button',t(action==='correct'?'orders.correct':'orders.fill'),'optima-order-primary');
    button.type='button';button.addEventListener('click',()=>this.openForm(item));
    buttons.append(button);
    if(o){
     const view=elem('button',t('orders.view'));
     view.type='button';view.addEventListener('click',()=>this.view(item));
     buttons.append(view);
    }
   }else{
    const view=elem('button',t('orders.view'));
    view.type='button';view.addEventListener('click',()=>this.view(item));
    buttons.append(view);
   }
  }
  card.append(buttons);
  if(!o&&item.plan)card.append(elem('p',t('orders.notSubmitted'),'optima-order-notice'));
  return card;
 }
 openPanel(item,readonly){
  this.current=item;this.editing=true;
  this.els.panel.hidden=false;this.els.form.hidden=readonly;
  this.els.items.replaceChildren();this.els.pin.value='';this.els.error.textContent='';
  this.els.panelTitle.textContent=item.supplier+' · '+item.branch;
  const o=item.order;
  this.els.panelStatus.textContent=t('orders.requestDate')+': '+(o?.requestDate||item.plan?.requestDate||'—')+
   ' · '+t('optima.delivery')+': '+(o?.deliveryDate||item.plan?.deliveryDate||'—')+
   ' · '+stageText(item.requestMode?String(o?.status||'pending'):orderDisplayStatus(o));
  return o;
 }
 view(item){
  const o=this.openPanel(item,true);
  const items=rows(o?.items||item.plan?.items);
  if(item.requestMode){
   this.els.items.append(elem('p',String(o?.reason||o?.decisionNote||''),'optima-order-item'));
  }
  for(const x of items){
   const used=x.used!==false;
   const line=elem('div',undefined,'optima-order-read-item');
   line.append(elem('strong',x.product||x.name||'—'),
    elem('span',t('orders.stock')+': '+(used?String(x.stock??'—'):'—')+' '+String(x.stockUnit||x.unit||'')),
    elem('span',t('orders.qty')+': '+String(x.expected??x.qty??0)+' '+String(x.unit||'')));
   if(x.confirmed!==undefined&&x.confirmed!==null)
    line.append(elem('span',t('orders.confirmed')+': '+String(x.confirmed)));
   if(x.delivered!==undefined&&x.delivered!==null)
    line.append(elem('span',t('orders.delivered')+': '+String(x.delivered)));
   this.els.items.append(line);
  }
  if(!items.length)this.els.items.append(elem('p',t('orders.noItems'),'optima-empty'));
 }
 openForm(item){
  if(!item.plan)return this.view(item);
  const o=this.openPanel(item,false);
  const previous=new Map(rows(o?.items).map(x=>[String(x.productId||x.product),x]));
  for(const p of item.plan.items){
   const old=previous.get(String(p.productId))||previous.get(String(p.name))||{};
   const line=elem('div',undefined,'optima-order-edit-item');
   line.dataset.productId=String(p.productId);
   line.append(elem('strong',p.name));
   const stock=elem('label');
   stock.append(elem('span',t('orders.stock')));
   const stockValue=elem('input');stockValue.type='text';stockValue.inputMode='decimal';
   stockValue.value=String(old.stock??'');
   stockValue.placeholder='0';stockValue.dataset.field='stock';stock.append(stockValue);
   const stockUnit=elem('input');stockUnit.type='text';stockUnit.value=String(old.stockUnit||p.unit||'');
   stockUnit.dataset.field='stockUnit';stockUnit.setAttribute('aria-label',t('orders.stockUnit'));stock.append(stockUnit);
   const qty=elem('label');qty.append(elem('span',t('orders.qty')));
   const qtyInput=elem('input');qtyInput.type='text';qtyInput.inputMode='decimal';
   qtyInput.value=String(old.expected??'');qtyInput.dataset.field='expected';qtyInput.placeholder='0';qty.append(qtyInput);
   const unit=elem('input');unit.type='text';unit.value=String(old.unit||p.unit||'');
   unit.dataset.field='unit';unit.setAttribute('aria-label',t('optima.unit'));qty.append(unit);
   line.append(stock,qty);this.els.items.append(line);
  }
  this.els.submit.textContent=t(o?.stage==='sent'?'orders.resubmit':'orders.submit');
  this.els.panel.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 }
 closePanel(){
  if(this.busy)return;
  this.current=null;this.editing=false;
  this.els.pin.value='';this.els.items.replaceChildren();this.els.panel.hidden=true;
 }
 static number(value,allowDash=false){
  const text=String(value||'').trim().replace(',','.');
  if(allowDash&&text==='-')return '-';
  if(!text)return 0;
  const n=Number(text);
  if(!Number.isFinite(n)||n<0)throw new Error('invalid quantity');
  return n;
 }
 collectItems(){
  const plan=this.current?.plan;
  return rows(plan?.items).map((p,i)=>{
   const row=this.els.items.children[i];
   const get=name=>row.querySelector('[data-field="'+name+'"]')?.value??'';
   const stock=OptimaOrdersWidget.number(get('stock'),true);
   const expected=OptimaOrdersWidget.number(get('expected'));
   const unit=get('unit').trim()||p.unit||'';
   return {
    productId:p.productId,product:p.name,stock,stockUnit:get('stockUnit').trim()||p.unit||'',
    expected:stock==='-'?0:expected,unit,used:stock!=='-',
    delivered:null,deliveredUnit:unit
   };
  });
 }
 async submit(){
  if(this.busy||!this.current?.plan)return;
  const pin=this.els.pin.value.trim(),item=this.current;
  if(!pin){this.els.error.textContent=t('orders.pinRequired');return;}
  let items;
  try {items=this.collectItems();}
  catch{this.els.error.textContent=t('orders.badQuantity');return;}
  if(!items.some(x=>x.used&&x.expected>0)){
   this.els.error.textContent=t('orders.emptyQuantities');return;
  }
  if(!window.confirm(t('orders.submitConfirm')))return;
  this.busy=true;this.els.submit.disabled=true;this.els.error.textContent=t('optima.saving');
  this.els.pin.value='';
  try{
   // One-time branch PIN is not persisted in localStorage or instance state.
   const authResponse=await fetch(OPTIMA_BASE+'/api/operator/login',{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({branch:item.branch,pin})
   });
   if(!authResponse.ok){
    this.els.error.textContent=t('orders.pinInvalid');return;
   }
   const auth=await authResponse.json();
   if(!auth?.token){this.els.error.textContent=t('orders.pinInvalid');return;}
   const payload={
    id:item.order?.id||undefined,supplierId:item.plan.supplierId,
    requestDate:item.plan.requestDate,deliveryDate:item.plan.deliveryDate,
    items,stage:'sent',correction:!!item.order
   };
   const response=await fetch(OPTIMA_BASE+'/api/operator/orders',{
    method:'POST',cache:'no-store',
    headers:{'Authorization':'Bearer '+auth.token,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
   });
   if(!response.ok){
    this.els.error.textContent=t(response.status===409?'orders.conflict':
      response.status===403?'orders.notAllowed':'orders.submitError');return;
   }
   this.current=null;this.editing=false;this.els.panel.hidden=true;
   this.els.items.replaceChildren();
   await this.load();
  }catch{
   if(!this.destroyed)this.els.error.textContent=t('orders.submitError');
  }finally{
   this.busy=false;if(!this.destroyed)this.els.submit.disabled=false;
  }
 }
 destroy(){
  this.destroyed=true;this.controller?.abort();clearInterval(this.poll);clearTimeout(this.saveTimer);
  this.els.pin.value='';this.saveFilters();
  this.actions.forEach(fn=>fn());
  window.removeEventListener('dashboardx:credential-changed',this.onCredential);
  window.removeEventListener('dashboardx:optima-updated',this.onUpdated);
 }
}
