import { t } from '../i18n.js';
import { getCredential } from '../CredentialStore.js';
import {
  loadOptima, OPTIMA_POLL_MS, norm, rows, branchNames, money,
  stockCell, orderStatus, effectiveOffers, dateISO
} from '../OptimaAPI.js';

const CONFIG={
  optimaProducts:{branch:true,status:['all','used','proposal'],extra:true,date:false,mode:false},
  optimaProposals:{branch:false,status:['all','linked','unlinked'],extra:true,date:false,mode:['catalog','proposals']},
  optimaOffers:{branch:true,status:['all','enabled','disabled','auto'],extra:true,date:false,mode:false},
  optimaCompare:{branch:true,status:['all','allPrices','different'],extra:true,date:false,mode:false},
  optimaStocks:{branch:true,status:['all','unknown','zero','known'],extra:true,date:true,mode:false},
  optimaOrders:{branch:true,status:['all','received','sent','expected','today','overdue','done','pending','approved','rejected'],extra:false,date:true,mode:['history','requests']}
};
const MAX_ROWS=400;
const cellText=(value)=>value===null||value===undefined||value===''?'—':String(value);
const make=(tag,text,cls)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=cellText(text);
  return el;
};
const rowSupplierNames=(p,db)=>rows(p.orderSuppliers).map(link=>
  rows(db.suppliers).find(s=>String(s.id)===String(link.supplierId))?.name||link.supplier||''
).filter(Boolean).join(' / ');
const select=(element,items,selected)=>{
  element.replaceChildren();
  for(const [value,label] of items)element.append(new Option(label,String(value)));
  element.value=items.some(([value])=>String(value)===String(selected))?String(selected):String(items[0]?.[0]??'');
};
const kindLabel=status=>t('optima.stage.'+status);

export function projectOptimaStockRows(db,branch,date,search='',supplierId=''){
  const available=branch? [branch]:branchNames(db);
  const products=rows(db.products).filter(p=>p&&p.catalogStatus!=='proposal');
  return products.filter(p=>{
    if(supplierId&&!rows(p.orderSuppliers).some(x=>String(x.supplierId)===supplierId))return false;
    if(search && !norm(p.name).includes(norm(search))&&!norm(rowSupplierNames(p,db)).includes(norm(search)))return false;
    return true;
  }).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru')).map(product=>({
    product, branches:available.map(name=>({name,...stockCell(db,product,name,date)}))
  }));
}

export default class OptimaDataWidget {
  constructor(widget){
    this.widget=widget;this.id=widget.instanceId;this.type=widget.templateId;
    this.cfg=CONFIG[this.type];if(!this.cfg)throw new Error('Unknown Optima widget: '+this.type);
    this.store=window.dashboardxStore;
    const saved=this.store?.getWidgetState(this.id)||{};
    this.controls={
      search:widget.querySelector('[data-role="data-search"]'),
      branch:widget.querySelector('[data-role="data-branch"]'),
      status:widget.querySelector('[data-role="data-status"]'),
      extra:widget.querySelector('[data-role="data-extra"]'),
      date:widget.querySelector('[data-role="data-date"]'),
      mode:widget.querySelector('[data-role="data-mode"]')
    };
    this.statusText=widget.querySelector('[data-role="data-status-text"]');
    this.summary=widget.querySelector('[data-role="data-summary"]');
    this.results=widget.querySelector('[data-role="data-results"]');
    this.refresh=widget.querySelector('[data-role="data-refresh"]');
    this.productAdd=this.type==='optimaProducts'?widget.querySelector('[data-role="product-add"]'):null;
    this.productDraft=this.type==='optimaProducts'?widget.querySelector('[data-role="product-draft"]'):null;
    this.filters={
      search:typeof saved.search==='string'?saved.search:'',
      branch:typeof saved.branch==='string'?saved.branch:'',
      status:typeof saved.status==='string'?saved.status:'all',
      extra:typeof saved.extra==='string'?saved.extra:'',
      date:typeof saved.date==='string'?saved.date:(this.type==='optimaStocks'?dateISO():''),
      mode:typeof saved.mode==='string'?saved.mode:(this.cfg.mode?.[0]||'')
    };
    this.db=null;this.revision=null;this.destroyed=false;this.seq=0;
    this.controls.search.value=this.filters.search;
    this.controls.date.value=this.filters.date;
    this.controls.branch.hidden=!this.cfg.branch;
    this.controls.status.hidden=!this.cfg.status;
    this.controls.extra.hidden=!this.cfg.extra;
    this.controls.date.hidden=!this.cfg.date;
    this.controls.mode.hidden=!this.cfg.mode;
    this.listeners=[];
    this.listen=(el,event,fn)=>{
      el.addEventListener(event,fn);this.listeners.push(()=>el.removeEventListener(event,fn));
    };
    const onFilter=()=>{
      for(const [key,control] of Object.entries(this.controls))this.filters[key]=control.value;
      this.render();
      clearTimeout(this.saveTimer);
      this.saveTimer=setTimeout(()=>this.saveFilters(),220);
    };
    this.listen(this.controls.search,'input',onFilter);
    for(const key of ['branch','status','extra','date','mode']){
      this.listen(this.controls[key],'change',onFilter);
    }
    if(this.refresh)this.listen(this.refresh,'click',()=>this.load());
    if(this.productAdd){
      const draftForm=widget.querySelector('[data-role="product-draft-form"]');
      const branchContainer=widget.querySelector('[data-role="product-draft-branches"]');
      const branchList=['Анжерская','Горняк','Ермекова','Лободы','Нуркена','Пришахтинск','Сарань'];
      for(const branchName of branchList){
        const label=document.createElement('label');
        const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.name='excludedBranches';checkbox.value=branchName;
        label.append(checkbox,document.createTextNode(branchName));branchContainer.append(label);
      }
      this.listen(this.productAdd,'click',()=>{
        this.productDraft.hidden=false;
        draftForm.elements.namedItem('name')?.focus({preventScroll:true});
      });
      this.listen(widget.querySelector('[data-role="product-draft-cancel"]'),'click',()=>{this.productDraft.hidden=true;});
      this.listen(draftForm,'submit',event=>{
        event.preventDefault();
        widget.querySelector('[data-role="product-draft-info"]').textContent='Это форма-заглушка: сохранение в PRO OPTIMA пока не подключено. Данные не отправлены.';
      });
    }
    const onCredential=event=>{
      if(event.detail?.service!=='optima')return;
      this.controller?.abort();this.db=null;this.render();this.load();
    };
    const onUpdate=()=>{this.load();};
    window.addEventListener('dashboardx:credential-changed',onCredential);
    window.addEventListener('dashboardx:optima-updated',onUpdate);
    this.listeners.push(()=>{
      window.removeEventListener('dashboardx:credential-changed',onCredential);
      window.removeEventListener('dashboardx:optima-updated',onUpdate);
    });
    this.configureSelects();
    this.load();
    this.poll=setInterval(()=>{if(!document.hidden)this.load();},OPTIMA_POLL_MS);
  }
  saveFilters(){this.store?.updateWidgetState(this.id,{...this.filters});}
  configureSelects(){
    const f=this.filters;
    select(this.controls.status,this.cfg.status.map(x=>[x,t('optima.filter.'+x)]),f.status);
    if(this.cfg.mode)select(this.controls.mode,this.cfg.mode.map(x=>[x,t('optima.mode.'+x)]),f.mode);
    else select(this.controls.mode,[['','—']],'');
    const db=this.db||{};
    select(this.controls.branch,[['',t('optima.allBranches')],...branchNames(db).map(x=>[x,x])],f.branch);
    if(this.cfg.extra){
      select(this.controls.extra,[['',t('optima.allSuppliers')],...rows(db.suppliers).map(s=>[s.id,s.name])],f.extra);
    }else select(this.controls.extra,[['','—']],'');
    this.controls.date.value=f.date;
    this.controls.search.value=f.search;
    for(const key of ['branch','status','extra','mode']){
      if(!this.db && (key==='branch'||key==='extra'))continue;
      f[key]=this.controls[key].value;
    }
  }
  setState(key,values={}){this.statusText.textContent=t('optima.'+key,values);}
  async load(){
    if(!getCredential('optima')){
      this.controller?.abort();this.db=null;this.configureSelects();
      this.setState('needToken');this.render();return;
    }
    this.controller?.abort();
    const ctrl=new AbortController();this.controller=ctrl;
    const seq=++this.seq;if(this.refresh)this.refresh.disabled=true;this.setState('loading');
    try{
      const result=await loadOptima(ctrl.signal);
      if(this.destroyed||ctrl.signal.aborted||seq!==this.seq)return;
      this.db=result.data;this.revision=result.revision;
      this.configureSelects();this.render();
      this.setState('connected',{revision:String(this.revision??'—')});
    }catch(error){
      if(this.destroyed||ctrl.signal.aborted||seq!==this.seq)return;
      this.setState(error.status===401?'unauthorized':error.status===403?'denied':'offline');
      this.render();
    }finally{if(!this.destroyed&&seq===this.seq&&this.refresh)this.refresh.disabled=false;}
  }
  buildTable(columns,entries,rowClass=''){
    this.results.replaceChildren();
    if(!entries.length){
      this.results.append(make('p',t('optima.empty'),'optima-empty'));return;
    }
    const table=make('table',undefined,'optima-grid-table');
    const thead=make('thead'),headrow=make('tr');
    columns.forEach(x=>headrow.append(make('th',x.label)));
    thead.append(headrow);table.append(thead);
    const tbody=make('tbody');
    for(const entry of entries.slice(0,MAX_ROWS)){
      const row=make('tr');if(rowClass)row.className=rowClass;
      for(let i=0;i<columns.length;i++){
        const col=columns[i],td=make('td');
        const info=col.get(entry);
        if(info&&typeof info==='object'&&'nodeType' in info)td.append(info);
        else if(info&&typeof info==='object'&&Object.prototype.hasOwnProperty.call(info,'text')){
          td.textContent=cellText(info.text);
          if(info.kind)td.className='optima-cell-'+info.kind;
          if(info.title)td.title=info.title;
        }else td.textContent=cellText(info);
        row.append(td);
      }
      tbody.append(row);
    }
    table.append(tbody);this.results.append(table);
    if(entries.length>MAX_ROWS)this.results.append(make('p',t('optima.limit',{count:String(MAX_ROWS)}),'optima-hint'));
  }
  render(){
    if(!this.db){
      this.results.replaceChildren();this.summary.textContent='';return;
    }
    const db=this.db,f=this.filters,q=norm(f.search),branch=f.branch;
    const total=key=>rows(db[key]);
    const matches=v=>!q||norm(v).includes(q);
    const extra=f.extra;
    if(this.type==='optimaProducts'){
      const items=total('products').filter(x=>x&&
        (!branch||!rows(x.excludedBranches).some(b=>norm(b)===norm(branch)))&&
        (!extra||rows(x.orderSuppliers).some(link=>String(link.supplierId)===String(extra)||(!link.supplierId&&norm(link.supplier)===norm(rows(db.suppliers).find(s=>String(s.id)===String(extra))?.name))))&&
        (f.status==='all'||(f.status==='used'&&x.catalogStatus!=='proposal')||
        (f.status==='proposal'&&x.catalogStatus==='proposal')))
        .filter(x=>matches([x.name,x.unit,x.note,rowSupplierNames(x,db),x.id].join(' ')))
        .sort((a,b)=>String(a.name).localeCompare(String(b.name),'ru'));
      this.buildTable([
        {label:'ID',get:p=>p.id},{label:t('optima.product'),get:p=>p.name},
        {label:t('optima.unit'),get:p=>p.unit},
        {label:t('optima.supplier'),get:p=>rowSupplierNames(p,db)},
        {label:t('optima.status'),get:p=>p.catalogStatus==='proposal'?t('optima.mode.proposals'):t('optima.filter.used')}
      ],items);
      this.summary.textContent=t('optima.found',{count:String(items.length),total:String(total('products').length)});
    }
    if(this.type==='optimaProposals'){
      const catalog=f.mode==='catalog';
      const src=catalog?total('supplierCatalog'):total('products').filter(p=>p.catalogStatus==='proposal');
      const productsById=new Map(total('products').map(p=>[String(p.id),p]));
      const suppliersById=new Map(total('suppliers').map(s=>[String(s.id),s]));
      let entries=src.filter(row=>{
        const linked=!!productsById.get(String(row.productId||row.linkedProductId||'')) || !!productsById.get(String(row.id))&&!catalog;
        if(f.status==='linked'&&!linked)return false;
        if(f.status==='unlinked'&&linked)return false;
        if(extra&&catalog&&String(row.supplierId)!==extra)return false;
        if(extra&&!catalog&&!total('offers').some(o=>String(o.productId)===String(row.id)&&String(o.supplierId)===extra))return false;
        return matches([row.name,row.unit,row.price,suppliersById.get(String(row.supplierId))?.name].join(' '));
      });
      entries=entries.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru'));
      this.buildTable(catalog?[
        {label:t('optima.product'),get:x=>x.name},
        {label:t('optima.supplier'),get:x=>suppliersById.get(String(x.supplierId))?.name},
        {label:t('optima.unit'),get:x=>x.unit},
        {label:t('optima.price'),get:x=>money(x.price)},
        {label:t('optima.status'),get:x=>x.availability||'—'}
      ]:[
        {label:'ID',get:x=>x.id},{label:t('optima.product'),get:x=>x.name},
        {label:t('optima.unit'),get:x=>x.unit},
        {label:t('optima.notes'),get:x=>x.note}
      ],entries);
      this.summary.textContent=t('optima.found',{count:String(entries.length),total:String(src.length)});
    }
    if(this.type==='optimaOffers'){
      const products=new Map(total('products').map(p=>[String(p.id),p]));
      const suppliers=new Map(total('suppliers').map(s=>[String(s.id),s]));
      const offers=effectiveOffers(total('offers'),branch).filter(x=>{
        const manual=branch&&x.manualActiveByBranch?.[branch]!==undefined?x.manualActiveByBranch[branch]:x.manualActive;
        const state=manual===true?'enabled':manual===false?'disabled':'auto';
        return (f.status==='all'||f.status===state)&&(!extra||String(x.supplierId)===extra)&&
          matches([products.get(String(x.productId))?.name,suppliers.get(String(x.supplierId))?.name,x.unit,x.price].join(' '));
      });
      this.buildTable([
        {label:t('optima.product'),get:x=>products.get(String(x.productId))?.name},
        {label:t('optima.supplier'),get:x=>suppliers.get(String(x.supplierId))?.name},
        {label:t('optima.unit'),get:x=>x.unit||products.get(String(x.productId))?.unit},
        {label:t('optima.price'),get:x=>money(x.price)},
        {label:t('optima.branch'),get:x=>x.branch==='*'?t('optima.allBranches'):x.branch},
        {label:t('optima.status'),get:x=>{
          const val=branch&&x.manualActiveByBranch?.[branch]!==undefined?x.manualActiveByBranch[branch]:x.manualActive;
          return t('optima.filter.'+(val===true?'enabled':val===false?'disabled':'auto'));
        }}
      ],offers);
      this.summary.textContent=t('optima.found',{count:String(offers.length),total:String(total('offers').length)});
    }
    if(this.type==='optimaCompare'){
      const products=new Map(total('products').map(p=>[String(p.id),p]));
      const suppliers=total('suppliers').filter(s=>!extra||String(s.id)===extra);
      const offers=effectiveOffers(total('offers'),branch).filter(x=>{
        const price=Number(x.price);
        return Number.isFinite(price)&&price>0&&suppliers.some(s=>String(s.id)===String(x.supplierId));
      });
      const groups=new Map();
      for(const offer of offers){
        const product=products.get(String(offer.productId));
        if(!product||!matches(product.name))continue;
        // Price comparisons are meaningful only within the same unit.
        const unit=norm(offer.unit||product.unit||'');
        const key=String(product.id)+'|'+unit;
        const group=groups.get(key)||{product,unit,offers:[]};
        group.offers.push(offer);groups.set(key,group);
      }
      const entries=[...groups.values()].filter(g=>{
        const ids=new Set(g.offers.map(x=>String(x.supplierId)));
        if(f.status==='allPrices')return ids.size>0;
        if(ids.size<2)return false;
        const min=Math.min(...g.offers.map(x=>Number(x.price)));
        const max=Math.max(...g.offers.map(x=>Number(x.price)));
        return f.status!=='different'||max>min;
      }).sort((a,b)=>String(a.product.name).localeCompare(String(b.product.name),'ru'));
      const activeSupplierIds=new Set(entries.flatMap(g=>g.offers.map(o=>String(o.supplierId))));
      const columns=[
        {label:t('optima.product'),get:g=>g.product.name+(g.unit?' · '+g.unit:'')},
        ...suppliers.filter(s=>activeSupplierIds.has(String(s.id))).map(s=>({
          label:s.name,
          get:g=>{
            const offer=g.offers.filter(o=>String(o.supplierId)===String(s.id)).sort((a,b)=>Number(a.price)-Number(b.price))[0];
            if(!offer)return '—';
            const min=Math.min(...g.offers.map(o=>Number(o.price)));
            return {text:money(offer.price),kind:Number(offer.price)===min?'best':'normal'};
          }
        }))
      ];
      this.buildTable(columns,entries);
      this.summary.textContent=t('optima.found',{count:String(entries.length),total:String(groups.size)});
    }
    if(this.type==='optimaStocks'){
      const data=projectOptimaStockRows(db,branch,f.date||dateISO(),f.search,extra)
        .filter(row=>f.status==='all'||row.branches.some(x=>x.kind===f.status));
      const shownBranches=branch?[branch]:branchNames(db);
      this.buildTable([
        {label:t('optima.product'),get:r=>r.product.name},
        {label:t('optima.unit'),get:r=>r.product.unit},
        ...shownBranches.map((name,i)=>({
          label:name,
          get:r=>{
            const entry=r.branches[i];
            return {text:entry?.text??'?',kind:entry?.kind||'unknown',title:entry?.date||''};
          }
        }))
      ],data);
      this.summary.textContent=t('optima.stockSummary',{count:String(data.length),date:f.date||dateISO()});
    }
    if(this.type==='optimaOrders'){
      const requests=f.mode==='requests';
      const source=requests?total('dateRequests'):total('history');
      const shown=source.filter(r=>{
        if(branch&&norm(r.branch)!==norm(branch))return false;
        const status=requests?String(r.status||'pending'):orderStatus(r);
        if(f.status!=='all'&&f.status!==status)return false;
        const date=String((requests?r.createdAt:r.requestDate)||'').slice(0,10);
        if(f.date&&date!==f.date)return false;
        return matches([r.supplier,r.branch,r.reason,...rows(r.items).map(i=>i.product)].join(' '));
      }).sort((a,b)=>String((requests?b.createdAt:b.requestDate)||'').localeCompare(
        String((requests?a.createdAt:a.requestDate)||'')));
      this.buildTable(requests?[
        {label:t('optima.date'),get:r=>String(r.createdAt||'').slice(0,10)},
        {label:t('optima.branch'),get:r=>r.branch},
        {label:t('optima.supplier'),get:r=>r.supplier},
        {label:t('optima.delivery'),get:r=>r.requestedDeliveryDate||r.requestedDate},
        {label:t('optima.status'),get:r=>kindLabel(r.status||'pending')},
        {label:t('optima.notes'),get:r=>r.reason||r.decisionNote}
      ]:[
        {label:t('optima.date'),get:r=>r.requestDate},
        {label:t('optima.branch'),get:r=>r.branch},
        {label:t('optima.supplier'),get:r=>r.supplier},
        {label:t('optima.delivery'),get:r=>r.deliveryDate},
        {label:t('optima.status'),get:r=>kindLabel(orderStatus(r))},
        {label:t('optima.items'),get:r=>{
          const detail=make('details'),summary=make('summary',String(rows(r.items).length));
          detail.append(summary);
          const content=make('div',undefined,'optima-order-lines');
          for(const item of rows(r.items)){
            content.append(make('div',
              String(item.product||'—')+' · '+cellText(item.confirmed??item.expected??item.qty)+' '+String(item.unit||'')
            ));
          }
          detail.append(content);return detail;
        }}
      ],shown);
      this.summary.textContent=t('optima.found',{count:String(shown.length),total:String(source.length)});
    }
  }
  destroy(){
    this.destroyed=true;
    this.controller?.abort();clearInterval(this.poll);
    clearTimeout(this.saveTimer);this.saveFilters();
    this.listeners.forEach(unbind=>unbind());this.listeners=[];
  }
}
