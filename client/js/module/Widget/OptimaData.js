import { t } from '../i18n.js';
import { attachWidgetInlineEditor } from '../WidgetInlineEditor.js?v=widget-editors-20261101b';
import { openOptimaPrintPreview } from '../OptimaPrint.js?v=optima-catalog-refresh-20261031';
import { getCredential } from '../CredentialStore.js';
import { optimaRequest } from '../OptimaAPI.js';
import {
  loadOptima, patchOptima, OPTIMA_POLL_MS, norm, rows, branchNames, branchKey, money,
  stockCell, orderStatus, effectiveOffers, dateISO
} from '../OptimaAPI.js';

const CONFIG={
  optimaProducts:{branch:true,status:false,extra:true,date:false,mode:false},
  optimaProposals:{branch:false,status:['all','linked','unlinked'],extra:true,date:false,mode:['catalog']},
  optimaOffers:{branch:true,status:['all','enabled','disabled','auto'],extra:true,date:false,mode:false},
  optimaCompare:{branch:true,status:['all','allPrices','different'],extra:true,date:false,mode:false},
  optimaStocks:{branch:true,status:['all','unknown','zero','known'],extra:true,date:true,mode:false},
  optimaOrders:{branch:true,status:['all','received','sent','expected','today','overdue','done','pending','approved','rejected'],extra:false,date:true,mode:['history','requests']}
};
const MAX_ROWS=400;
const catalogProductId=row=>row&&Object.prototype.hasOwnProperty.call(row,'usedProductId')?row.usedProductId:(row?.productId??row?.linkedProductId??null);
const PRODUCT_COL_DEFAULTS=Object.freeze({id:64,name:225,unit:88,supplier:245,actions:170});
const PRODUCT_COL_KEYS=Object.keys(PRODUCT_COL_DEFAULTS);
const PRODUCT_COL_MIN=48;
const PRODUCT_COL_MAX=720;
const productColWidth=(value,fallback)=>{
  const width=Number(value);
  return Number.isFinite(width)&&width>=PRODUCT_COL_MIN&&width<=PRODUCT_COL_MAX
    ?Math.round(width):fallback;
};
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
const supplierLinks=(product,db)=>{
  const container=document.createElement('div');
  container.className='dx-product-supplier-links';
  const shown=new Set();
  for(const link of rows(product.orderSuppliers)){
    const supplier=rows(db.suppliers).find(s=>String(s.id)===String(link.supplierId))||
      rows(db.suppliers).find(s=>norm(s.name)===norm(link.supplier));
    const name=supplier?.name||link.supplier||'';
    if(!name)continue;
    const key=supplier?.id!=null?'id:'+supplier.id:'name:'+norm(name);
    if(shown.has(key))continue;
    shown.add(key);
    if(container.childNodes.length)container.append(document.createTextNode(' / '));
    const button=document.createElement('button');
    button.type='button';button.className='dx-product-supplier-link';
    button.textContent=String(name);button.title='Открыть карточку поставщика «'+name+'»';
    button.addEventListener('click',()=>{
      const detail={supplierId:supplier?.id??'',supplierName:name,handled:false};
      window.dispatchEvent(new CustomEvent('dashboardx:open-optima-supplier',{detail}));
      if(!detail.handled)window.alert('Добавьте виджет «Поставщики» на рабочее пространство, чтобы открыть график.');
    });
    container.append(button);
  }
  if(!container.childNodes.length){container.textContent='—';container.title='Поставщик пока не привязан';}
  return container;
};
const productDeletionReferences=(db,product)=>{
  const id=String(product.id);
  const scalarKeys=new Set(['productId','linkedProductId','matchedProductId','analogProductId','sourceProductId','targetProductId','product_id']);
  const arrayKeys=new Set(['productIds','analogProductIds','linkedProductIds']);
  const references=(value,depth=0)=>{
    if(!value||typeof value!=='object'||depth>12)return false;
    if(Array.isArray(value))return value.some(item=>references(item,depth+1));
    for(const [key,item] of Object.entries(value)){
      if(scalarKeys.has(key)&&item!=null&&String(item)===id)return true;
      if(arrayKeys.has(key)&&rows(item).some(v=>String(v)===id))return true;
      if(item&&typeof item==='object'&&references(item,depth+1))return true;
    }
    return false;
  };
  const names={offers:'Цены и предложения',stocks:'Остатки',history:'История заявок',dateRequests:'Заявки',transfers:'Перемещения',supplierCatalog:'Каталог поставщиков'};
  const found=[];
  for(const [key,value] of Object.entries(db||{})){
    if(key==='products')continue;
    if(references(value))found.push(names[key]||key);
  }
  if(rows(db?.products).some(other=>String(other.id)!==id&&references(other)))found.push('Связи с другими наименованиями');
  return found;
};
const select=(element,items,selected)=>{
  element.replaceChildren();
  for(const [value,label] of items)element.append(new Option(label,String(value)));
  element.value=items.some(([value])=>String(value)===String(selected))?String(selected):String(items[0]?.[0]??'');
};
const kindLabel=status=>t('optima.stage.'+status);
const displayBranch=value=>{const name=String(value??'').replace(/\s+/g,' ').trim();return name?name.charAt(0).toLocaleUpperCase('ru')+name.slice(1).toLocaleLowerCase('ru'):'';};
const uniqueBranches=values=>[...new Map(values.map(displayBranch).filter(Boolean).map(name=>[norm(name),name])).values()].sort((a,b)=>a.localeCompare(b,'ru'));
// Keep the actual DB branch value for offers while deduplicating case/whitespace variants in the selector.
const uniqueOfferBranchOptions=values=>{
  const distinct=new Map();
  for(const branch of values){
    const value=String(branch??'').trim().replace(/\s+/g,' ');
    const key=norm(value).replace(/\s+/g,' ');
    if(key&&!distinct.has(key))distinct.set(key,[value,displayBranch(value)]);
  }
  return [...distinct.values()].sort((a,b)=>a[1].localeCompare(b[1],'ru'));
};


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
    this.productColumnWidths=this.type==='optimaProducts'?
      Object.fromEntries(PRODUCT_COL_KEYS.map(key=>[key,productColWidth(saved.columnWidths?.[key],PRODUCT_COL_DEFAULTS[key])])):null;
    this.columnDragCleanup=null;
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
    if(this.type==='optimaProposals'&&(!this.results||!this.controls.search||!this.controls.status))throw new Error('Каталог: шаблон не обновился. Перезагрузите страницу.');
    this.refresh=widget.querySelector('[data-role="data-refresh"]');
    this.productAdd=this.type==='optimaProducts'?widget.querySelector('[data-role="product-add"]'):null;
    this.productDraft=this.type==='optimaProducts'?widget.querySelector('[data-role="product-draft"]'):null;
    this.productPrint=this.type==='optimaProducts'?widget.querySelector('[data-role="product-print"]'):null;
    this.catalogPrint=this.type==='optimaProposals'?widget.querySelector('[data-role="catalog-print"]'):null;
    this.catalogAdd=this.type==='optimaProposals'?widget.querySelector('[data-role="catalog-add"]'):null;
    this.productSupplierQuery=['optimaProducts','optimaProposals','optimaOffers'].includes(this.type)?widget.querySelector('[data-role="data-supplier-query"]'):null;
    this.productSupplierOptions=['optimaProducts','optimaProposals','optimaOffers'].includes(this.type)?widget.querySelector('[data-role="data-supplier-options"]'):null;
    this.productSupplierOpen=false;
    this.productSupplierEditing=false;
    this.productSupplierChoices=[];
    this.productSupplierActive=-1;
    this.filters={
      search:typeof saved.search==='string'?saved.search:'',
      branch:typeof saved.branch==='string'?saved.branch:'',
      status:this.type==='optimaProducts'?'all':(typeof saved.status==='string'?saved.status:'all'),
      extra:typeof saved.extra==='string'?saved.extra:'',
      date:typeof saved.date==='string'?saved.date:(this.type==='optimaStocks'?dateISO():''),
      mode:this.type==='optimaProposals'?'catalog':(typeof saved.mode==='string'?saved.mode:(this.cfg.mode?.[0]||''))
    };
    this.db=null;this.revision=null;this.destroyed=false;this.seq=0;
    this.controls.search.value=this.filters.search;
    this.controls.date.value=this.filters.date;
    this.controls.branch.hidden=!this.cfg.branch;
    if(this.controls.status)this.controls.status.hidden=!this.cfg.status;
    this.controls.extra.hidden=!this.cfg.extra;
    this.controls.date.hidden=!this.cfg.date;
    this.controls.mode.hidden=this.type==='optimaProposals'||!this.cfg.mode;
    this.listeners=[];
    this.listen=(el,event,fn)=>{
      if(!el)return;
      el.addEventListener(event,fn);this.listeners.push(()=>el.removeEventListener(event,fn));
    };
    const onFilter=()=>{
      for(const [key,control] of Object.entries(this.controls))if(control)this.filters[key]=control.value;
      this.render();
      clearTimeout(this.saveTimer);
      this.saveTimer=setTimeout(()=>this.saveFilters(),220);
    };
    this.listen(this.controls.search,'input',onFilter);
    for(const key of ['branch','status','extra','date','mode']){
      if(this.controls[key])this.listen(this.controls[key],'change',onFilter);
    }
    if(this.refresh)this.listen(this.refresh,'click',()=>this.load());
    if(this.productPrint)this.listen(this.productPrint,'click',()=>this.printProducts());
    if(this.catalogPrint)this.listen(this.catalogPrint,'click',()=>this.printCatalog());
    if(this.catalogAdd)this.listen(this.catalogAdd,'click',()=>this.openCatalogAddDialog());
    if(this.type==='optimaProposals'){
      const input=widget.querySelector('[data-role="catalog-upgrade-file"]');
      this.listen(input,'change',async()=>{
        const file=input.files?.[0];if(!file)return;
        try{
          if(file.size>12*1024*1024)throw Error('Файл JSON превышает 12 МБ');
          const parsed=JSON.parse(await file.text());
          if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error('Некорректный JSON');
          if(parsed.updateType!=='pro-optima-supplier-update-v1')throw Error('Нужен JSON формата pro-optima-supplier-update-v1');
          const keys=['suppliersUpsert','catalogUpsert','catalogRetired','links','offers','products'];
          const counts=keys.map(key=>[key,Array.isArray(parsed[key])?parsed[key].length:0]);
          if(!counts.some(([,count])=>count))throw Error('В upgrade-файле нет операций');
          const summary=counts.filter(([,count])=>count).map(([key,count])=>key+': '+count).join('\\n');
          if(!window.confirm('Применить upgrade JSON «'+file.name+'» к PRO OPTIMA?\\n\\n'+summary+'\\n\\nИзменения будут записаны в Railway. Перед записью сервер делает резервную копию.'))return;
          input.disabled=true;this.statusText.textContent='Применение upgrade JSON…';
          const result=await optimaRequest('/api/dashboardx/catalog/upgrade',{method:'POST',body:JSON.stringify({baseRevision:this.revision,update:parsed})});
          this.statusText.textContent='Upgrade применён: '+file.name;
          await this.load();
          window.alert('Обновление прайсов применено. '+JSON.stringify(result.summary||{}));
        }catch(error){
          this.statusText.textContent='Ошибка upgrade: '+(error.message||String(error));
        }finally{input.disabled=false;input.value='';}
      });
    }
    this.catalogImporter=null;
    if(this.productSupplierQuery&&this.productSupplierOptions&&widget.querySelector('.dx-product-supplier-picker')){
      const query=this.productSupplierQuery;
      const options=this.productSupplierOptions;
      const picker=widget.querySelector('.dx-product-supplier-picker');
      const listId='dx-product-suppliers-'+String(this.id).replace(/[^a-zA-Z0-9_-]/g,'-');
      options.id=listId;
      query.setAttribute('aria-controls',listId);
      const close=(restore=true)=>{
        this.productSupplierOpen=false;
        this.productSupplierActive=-1;
        options.hidden=true;
        query.setAttribute('aria-expanded','false');
        query.removeAttribute('aria-activedescendant');
        if(restore){
          this.productSupplierEditing=false;
          const selected=rows(this.db?.suppliers).find(s=>String(s.id)===String(this.filters.extra));
          query.value=selected?.name||'';
        }
      };
      const choose=item=>{
        this.productSupplierEditing=false;
        this.filters.extra=String(item.id??'');
        this.controls.extra.value=this.filters.extra;
        query.value=item.id?String(item.name):'';
        query.focus({preventScroll:true});
        close(false);
        onFilter();
      };
      this.chooseProductSupplier=choose;
      this.listen(query,'focus',()=>{
        this.productSupplierOpen=true;
        this.productSupplierEditing=false;
        this.configureProductSupplierOptions();
        if(this.filters.extra)query.select();
      });
      this.listen(query,'click',()=>{
        if(this.productSupplierOpen)return;
        this.productSupplierOpen=true;
        this.configureProductSupplierOptions();
      });
      this.listen(query,'input',()=>{
        this.productSupplierEditing=true;
        this.controls.extra.value='';
        this.filters.extra='';
        this.productSupplierOpen=true;
        this.configureProductSupplierOptions();
        onFilter();
      });
      this.listen(query,'keydown',event=>{
        if(event.key==='Escape'&&this.productSupplierOpen){
          event.preventDefault();event.stopPropagation();close();return;
        }
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          event.preventDefault();
          if(!this.productSupplierOpen){
            this.productSupplierOpen=true;this.configureProductSupplierOptions();
          }
          const choices=this.productSupplierChoices;
          if(!choices.length)return;
          const direction=event.key==='ArrowDown'?1:-1;
          const count=choices.length;
          this.productSupplierActive=this.productSupplierActive<0?
            (direction===1?0:count-1):(this.productSupplierActive+direction+count)%count;
          options.querySelectorAll('[role="option"]').forEach((el,i)=>{
            el.classList.toggle('is-active',i===this.productSupplierActive);
          });
          const active=options.querySelectorAll('[role="option"]')[this.productSupplierActive];
          if(active){
            query.setAttribute('aria-activedescendant',active.id);
            active.scrollIntoView({block:'nearest'});
          }
          return;
        }
        if(event.key==='Enter'&&this.productSupplierOpen){
          const choice=this.productSupplierChoices[this.productSupplierActive]||
            (this.productSupplierEditing&&this.productSupplierChoices.length===1?this.productSupplierChoices[0]:null);
          if(choice){event.preventDefault();choose(choice);}
        }
      });
      const onOutside=event=>{if(!picker.contains(event.target)&&this.productSupplierOpen)close();};
      document.addEventListener('pointerdown',onOutside);
      this.listeners.push(()=>document.removeEventListener('pointerdown',onOutside));
      this.listen(picker,'focusout',event=>{
        if(!picker.contains(event.relatedTarget)&&this.productSupplierOpen)close();
      });
    }
    if(this.productAdd){
      const draftForm=widget.querySelector('[data-role="product-draft-form"]');
      const branchContainer=widget.querySelector('[data-role="product-draft-branches"]');
      const title=widget.querySelector('[data-role="product-draft-title"]');
      const info=widget.querySelector('[data-role="product-draft-info"]');
      const saveButton=widget.querySelector('[data-role="product-draft-save"]');
      const defaultInfo=info.textContent;
      let branchList=[];
      this.productEditId=null;
      this.productFormBaseRevision=null;
      this.productBusy=false;
      this.productAdd.setAttribute('aria-expanded','false');
      this.syncProductBranches=()=>{
        if(!this.productDraft.hidden)return;
        const names=branchNames(this.db||{});
        if(names.length===branchList.length&&names.every((v,i)=>v===branchList[i]))return;
        branchList=names;
        branchContainer.replaceChildren();
        for(const branchName of branchList){
          const label=document.createElement('label');
          const checkbox=document.createElement('input');
          checkbox.type='checkbox';checkbox.name='excludedBranches';checkbox.value=branchName;
          label.append(checkbox,document.createTextNode(branchName));
          branchContainer.append(label);
        }
      };
      this.syncProductBranches();
      // Non-modal subwindow owned by this widget's body: other widgets stay usable.
      const editorPanel=attachWidgetInlineEditor(widget,this.productDraft,{
        title:'Редактор наименования',kind:'names',
        host:widget.querySelector('.optima-data[data-optima-module="optimaProducts"]'),
        onClose:()=>closeDraft()
      });
      this.productEditorPanel=editorPanel;
      const closeDraft=(force=false)=>{
        if(this.productBusy&&force!==true)return;
        editorPanel.hide();
        this.productDraft.hidden=true;
        this.productEditId=null;
        this.productFormBaseRevision=null;
        this.productAdd.setAttribute('aria-expanded','false');
      };
      this.openProductEditor=product=>{
        if(this.productBusy)return;
        if(!this.db){
          window.alert('Сначала подключитесь к базе PRO OPTIMA.');
          return;
        }
        const current=product?rows(this.db.products).find(item=>String(item.id)===String(product.id)):null;
        if(product&&!current){window.alert('Наименование больше не найдено. Обновите данные.');return;}
        draftForm.reset();
        this.productEditId=current?String(current.id):null;
        this.productFormBaseRevision=Number(this.revision);
        title.textContent=current?'Изменить наименование':'Добавить наименование';
        saveButton.textContent=current?'Сохранить изменения':'Сохранить';
        draftForm.elements.namedItem('name').value=String(current?.name||'');
        draftForm.elements.namedItem('unit').value=String(current?.unit||'');
        draftForm.elements.namedItem('note').value=String(current?.note||'');
        for(const checkbox of branchContainer.querySelectorAll('input[type="checkbox"]')){
          checkbox.checked=rows(current?.excludedBranches).some(b=>branchKey(b)===branchKey(checkbox.value));
        }
        info.textContent=current?'ID '+current.id+' сохранится. Связи с поставщиками останутся прежними.':defaultInfo;
        this.productDraft.hidden=false;
        this.productAdd.setAttribute('aria-expanded','true');
        editorPanel.setTitle(current?'Изменить наименование':'Добавить наименование');
        editorPanel.open();
        draftForm.elements.namedItem('name').focus({preventScroll:true});
      };
      this.listen(this.productAdd,'click',()=>{
        if(!this.productDraft.hidden&&this.productEditId===null){closeDraft();return;}
        this.openProductEditor(null);
      });
      this.listen(widget.querySelector('[data-role="product-draft-cancel"]'),'click',closeDraft);
      this.listen(draftForm,'submit',async event=>{
        event.preventDefault();
        if(this.productBusy)return;
        if(!this.db||!Number.isFinite(Number(this.revision))){
          info.textContent='Сначала подключитесь к базе PRO OPTIMA.';return;
        }
        if(this.productFormBaseRevision!==Number(this.revision)){
          info.textContent='Данные изменились после открытия формы. Закройте её и откройте наименование заново.';return;
        }
        const name=draftForm.elements.namedItem('name').value.trim();
        const unit=draftForm.elements.namedItem('unit').value.trim();
        const note=draftForm.elements.namedItem('note').value.trim();
        if(!name){info.textContent='Введите наименование сырья.';return;}
        const products=rows(this.db.products);
        const editId=this.productEditId;
        const old=editId===null?null:products.find(item=>String(item.id)===editId);
        if(editId!==null&&!old){info.textContent='Наименование больше не найдено. Обновите данные.';return;}
        if(products.some(item=>String(item.id)!==String(editId)&&norm(item.name)===norm(name))){
          info.textContent='Такое наименование уже существует.';return;
        }
        const selected=[...branchContainer.querySelectorAll('input:checked')].map(el=>el.value);
        const retained=rows(old?.excludedBranches).filter(value=>!branchList.some(b=>branchKey(b)===branchKey(value)));
        const excludedBranches=[...retained,...selected];
        const id=old?old.id:products.reduce((max,item)=>{
          const value=Number(item.id);
          return Number.isSafeInteger(value)&&value>max?value:max;
        },0)+1;
        if(!Number.isSafeInteger(Number(id))||Number(id)<=0){
          info.textContent='Не удалось назначить ID. Проверьте справочник.';return;
        }
        const entry=old?{...old,name,unit,note,excludedBranches}:
          {id,name,unit,note,catalogStatus:'used',excludedBranches,source:'manual',orderSuppliers:[]};
        const next=old?products.map(item=>String(item.id)===editId?entry:item):[...products,entry];
        this.productBusy=true;saveButton.disabled=true;
        info.textContent=old?'Сохранение изменений…':'Сохранение наименования…';
        try{
          await patchOptima({products:next},this.productFormBaseRevision);
          draftForm.reset();closeDraft(true);
          await this.load();
        }catch(error){
          info.textContent=error.status===409?'База изменена другим пользователем. Закройте форму, обновите данные и повторите действие.':(error.message||'Не удалось сохранить наименование.');
        }finally{
          this.productBusy=false;saveButton.disabled=false;
        }
      });
      this.deleteProduct=async product=>{
        if(this.productBusy||!this.db)return;
        const products=rows(this.db.products);
        const current=products.find(item=>String(item.id)===String(product.id));
        if(!current){window.alert('Наименование больше не найдено. Обновите список.');return;}
        const blockers=productDeletionReferences(this.db,current);
        if(blockers.length){
          window.alert('Нельзя удалить «'+current.name+'»: существуют связанные данные ('+blockers.join(', ')+'). Сначала нужно безопасно разобраться с этими связями.');
          return;
        }
        if(!window.confirm('Удалить наименование «'+current.name+'» (ID '+current.id+') из PRO OPTIMA? Это действие нельзя отменить.'))return;
        const before=Number(this.revision);
        if(!Number.isFinite(before)){window.alert('Не удалось определить версию базы.');return;}
        this.productBusy=true;
        try{
          await patchOptima({products:products.filter(item=>String(item.id)!==String(current.id))},before);
          if(this.productEditId===String(current.id))closeDraft(true);
          await this.load();
        }catch(error){
          window.alert(error.status===409?'База уже изменилась. Обновите список и повторите удаление.':(error.message||'Не удалось удалить наименование.'));
        }finally{
          this.productBusy=false;
        }
      };
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
  configureProductSupplierOptions(){
    if(!['optimaProducts','optimaProposals','optimaOffers'].includes(this.type))return;
    const suppliers=rows(this.db?.suppliers);
    const selected=suppliers.find(s=>String(s.id)===String(this.filters.extra));
    this.controls.extra.value=this.filters.extra;
    this.productSupplierQuery.placeholder=t('optima.allSuppliers');
    if(!this.productSupplierEditing)this.productSupplierQuery.value=selected?.name||'';
    const list=this.productSupplierOptions;
    if(!this.productSupplierOpen){
      list.hidden=true;
      this.productSupplierQuery.setAttribute('aria-expanded','false');
      return;
    }
    const typed=this.productSupplierEditing?norm(this.productSupplierQuery.value).replace(/\s+/g,' '):'';
    const matching=suppliers
      .filter(s=>!typed||norm(s.name).replace(/\s+/g,' ').includes(typed))
      .sort((a,b)=>{
        const prefix=Number(norm(b.name).startsWith(typed))-Number(norm(a.name).startsWith(typed));
        return prefix||String(a.name).localeCompare(String(b.name),'ru');
      })
      .map(s=>({id:String(s.id),name:String(s.name)}));
    this.productSupplierChoices=typed?matching:[{id:'',name:t('optima.allSuppliers')},...matching];
    this.productSupplierActive=-1;
    this.productSupplierQuery.removeAttribute('aria-activedescendant');
    list.replaceChildren();
    for(const [index,item] of this.productSupplierChoices.entries()){
      const option=make('button',item.name,'dx-product-supplier-option');
      option.type='button';
      option.id=list.id+'-'+index;
      option.setAttribute('role','option');
      option.setAttribute('aria-selected',String(String(item.id)===String(this.filters.extra)));
      option.addEventListener('click',()=>this.chooseProductSupplier?.(item));
      list.append(option);
    }
    if(!this.productSupplierChoices.length){
      list.append(make('div','Совпадений нет','dx-product-supplier-empty'));
    }
    list.hidden=false;
    this.productSupplierQuery.setAttribute('aria-expanded','true');
  }
  configureSelects(){
    const f=this.filters;
    if(this.controls.status&&this.cfg.status)select(this.controls.status,this.type==='optimaProposals'?[['all','Все позиции'],['linked','Привязанные'],['unlinked','Непривязанные']]:this.cfg.status.map(x=>[x,t('optima.filter.'+x)]),f.status);
    if(this.cfg.mode)select(this.controls.mode,this.cfg.mode.map(x=>[x,t('optima.mode.'+x)]),f.mode);
    else select(this.controls.mode,[['','—']],'');
    const db=this.db||{};
    const isOffers=this.type==='optimaOffers';
    const branches=this.type==='optimaProducts'?uniqueBranches(branchNames(db)):branchNames(db);
    const offerChoices=isOffers?uniqueOfferBranchOptions(branches):[];
    const chosenBranch=isOffers
      ?offerChoices.find(([value])=>branchKey(value)===branchKey(f.branch))?.[0]??f.branch
      :this.type==='optimaProducts'?displayBranch(f.branch):f.branch;
    const branchItems=isOffers?offerChoices:branches.map(x=>[x,x]);
    select(this.controls.branch,[['',t('optima.allBranches')],...branchItems],chosenBranch);
    if(this.cfg.extra){
      if(['optimaProducts','optimaProposals','optimaOffers'].includes(this.type))this.configureProductSupplierOptions();
      else select(this.controls.extra,[['',t('optima.allSuppliers')],...rows(db.suppliers).map(s=>[s.id,s.name])],f.extra);
    }else select(this.controls.extra,[['','—']],'');
    this.controls.date.value=f.date;
    this.controls.search.value=f.search;
    for(const key of ['branch','status','extra','mode']){
      if(!this.db && (key==='branch'||key==='extra'))continue;
      if(this.controls[key])f[key]=this.controls[key].value;
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
      this.syncProductBranches?.();
      this.configureSelects();this.render();
      this.setState('connected',{revision:String(this.revision??'—')});
    }catch(error){
      if(this.destroyed||ctrl.signal.aborted||seq!==this.seq)return;
      this.setState(error.status===401?'unauthorized':error.status===403?'denied':'offline');
      this.render();
    }finally{if(!this.destroyed&&seq===this.seq&&this.refresh)this.refresh.disabled=false;}
  }
  applyProductColumnWidths(){
    if(this.type!=='optimaProducts')return;
    const table=this.results.querySelector('table.dx-product-resizable');
    if(!table)return;
    const widths=PRODUCT_COL_KEYS.map(key=>this.productColumnWidths[key]);
    table.style.width=widths.reduce((total,width)=>total+width,0)+'px';
    table.querySelectorAll('col').forEach((col,index)=>{
      col.style.width=widths[index]+'px';
    });
  }
  setProductColumnWidth(key,width,save=false){
    if(this.type!=='optimaProducts'||!PRODUCT_COL_KEYS.includes(key))return;
    this.productColumnWidths[key]=Math.max(PRODUCT_COL_MIN,Math.min(PRODUCT_COL_MAX,Math.round(width)));
    this.applyProductColumnWidths();
    if(save)this.store?.updateWidgetState(this.id,{columnWidths:{...this.productColumnWidths}});
  }
  startProductColumnResize(event,key){
    if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();
    event.stopPropagation();
    this.columnDragCleanup?.();
    const startX=event.clientX;
    const startWidth=this.productColumnWidths[key];
    const pointerId=event.pointerId;
    const onMove=move=>{
      if(move.pointerId!==pointerId)return;
      this.setProductColumnWidth(key,startWidth+move.clientX-startX);
    };
    const onEnd=end=>{
      if(end.pointerId!==pointerId)return;
      cleanup();
      this.store?.updateWidgetState(this.id,{columnWidths:{...this.productColumnWidths}});
    };
    const cleanup=()=>{
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onEnd);
      window.removeEventListener('pointercancel',onEnd);
      if(this.columnDragCleanup===cleanup)this.columnDragCleanup=null;
    };
    this.columnDragCleanup=cleanup;
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onEnd);
    window.addEventListener('pointercancel',onEnd);
  }
  buildTable(columns,entries,rowClass=''){
    this.results.replaceChildren();
    if(!entries.length){
      this.results.append(make('p',t('optima.empty'),'optima-empty'));return;
    }
    const isProductTable=this.type==='optimaProducts';
    const table=make('table',undefined,'optima-grid-table'+(isProductTable?' dx-product-resizable':''));
    if(isProductTable){
      const colgroup=make('colgroup');
      columns.forEach(()=>colgroup.append(make('col')));
      table.append(colgroup);
    }
    const thead=make('thead'),headrow=make('tr');
    columns.forEach(col=>{
      const th=make('th');
      if(!isProductTable){th.textContent=col.label;headrow.append(th);return;}
      th.append(make('span',col.label,'dx-product-col-label'));
      const handle=make('button',undefined,'dx-product-col-grip');
      handle.type='button';
      handle.setAttribute('aria-label','Изменить ширину колонки «'+col.label+'»');
      handle.title='Перетащите границу или используйте стрелки ← →';
      handle.addEventListener('pointerdown',event=>this.startProductColumnResize(event,col.key));
      handle.addEventListener('keydown',event=>{
        if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
        event.preventDefault();event.stopPropagation();
        const increment=(event.shiftKey?25:10)*(event.key==='ArrowRight'?1:-1);
        this.setProductColumnWidth(col.key,this.productColumnWidths[col.key]+increment,true);
      });
      handle.addEventListener('dblclick',event=>{
        event.preventDefault();event.stopPropagation();
        this.setProductColumnWidth(col.key,PRODUCT_COL_DEFAULTS[col.key],true);
      });
      th.append(handle);headrow.append(th);
    });
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
    if(isProductTable)this.applyProductColumnWidths();
    if(entries.length>MAX_ROWS)this.results.append(make('p',t('optima.limit',{count:String(MAX_ROWS)}),'optima-hint'));
  }
  filteredCatalogRows(){
    if(!this.db)return [];
    const db=this.db,f=this.filters,q=norm(f.search),extra=f.extra;
    const products=new Map(rows(db.products).map(item=>[String(item.id),item]));
    const suppliers=new Map(rows(db.suppliers).map(item=>[String(item.id),item]));
    return rows(db.supplierCatalog).filter(row=>{
      if(!row)return false;
      const linked=products.has(String(catalogProductId(row)??''));
      if(f.status==='linked'&&!linked)return false;
      if(f.status==='unlinked'&&linked)return false;
      if(extra&&String(row.supplierId)!==String(extra))return false;
      return !q||norm([row.name,row.unit,row.price,suppliers.get(String(row.supplierId))?.name].join(' ')).includes(q);
    }).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru'));
  }
  catalogLinkCell(row){
    const products=rows(this.db?.products);
    const linked=products.find(p=>String(p.id)===String(catalogProductId(row)));
    const button=make('button',linked?.name||'Привязать',linked?'dx-catalog-linked-product':'dx-catalog-link-action');
    button.type='button';
    button.title=linked?'Изменить привязку «'+linked.name+'»':'Привязать к нашему наименованию';
    button.setAttribute('aria-label',linked?'Изменить привязку: '+linked.name:'Привязать «'+row.name+'»');
    button.addEventListener('click',()=>this.openCatalogLinkDialog(row));
    return button;
  }
  openCatalogAddDialog(){
    if(!this.db||!Number.isFinite(Number(this.revision))){
      window.alert('Сначала подключитесь к базе PRO OPTIMA.');return;
    }
    const suppliers=rows(this.db.suppliers).filter(item=>item&&item.id!=null)
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru'));
    if(!suppliers.length){window.alert('В базе нет поставщиков. Добавьте поставщика сначала.');return;}
    if(this.catalogAddDialog?.open)this.catalogAddDialog.close();
    this.catalogAddDialog?.remove();
    const dialog=make('dialog',undefined,'dx-catalog-link-dialog dx-catalog-add-dialog');
    dialog.setAttribute('aria-label','Добавить позицию каталога прайс-листов');
    const form=make('form');form.noValidate=true;
    const title=make('h3','Добавить товар в каталог');
    const subtitle=make('p','Ручная позиция поставщика — без привязки к наименованию.','dx-catalog-link-source');
    const field=(name,labelText,control)=>{
      const label=make('label',labelText);
      control.name=name;label.append(control);return label;
    };
    const supplier=make('select');
    supplier.required=true;
    supplier.append(new Option('Выберите поставщика',''));
    for(const item of suppliers)supplier.append(new Option(String(item.name||'ID '+item.id),String(item.id)));
    if(this.filters.extra&&suppliers.some(item=>String(item.id)===String(this.filters.extra)))supplier.value=String(this.filters.extra);
    const name=make('input');name.type='text';name.maxLength=240;name.required=true;
    name.placeholder='Наименование из накладной';
    const unit=make('input');unit.type='text';unit.maxLength=60;
    unit.placeholder='кг, шт., л…';
    const price=make('input');price.type='text';price.inputMode='decimal';
    price.placeholder='Например, 1250,50';price.required=true;
    const note=make('p','Укажите поставщика, название товара и цену.','dx-catalog-link-selection');
    const actions=make('div',undefined,'dx-catalog-link-actions');
    const cancel=make('button','Отмена');cancel.type='button';
    const save=make('button','Добавить','dx-catalog-link-confirm');save.type='submit';
    actions.append(cancel,save);
    form.append(title,subtitle,field('supplierId','Поставщик',supplier),
      field('name','Наименование товара',name),field('unit','Единица измерения',unit),
      field('price','Цена, ₸',price),note,actions);
    let busy=false;
    cancel.addEventListener('click',()=>{if(!busy)dialog.close();});
    dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    dialog.addEventListener('click',event=>{if(!busy&&event.target===dialog)dialog.close();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      const supplierId=supplier.value;
      const itemName=name.value.trim().replace(/\s+/g,' ');
      const itemUnit=unit.value.trim().replace(/\\s+/g,' ');
      const raw=price.value.trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
      const amount=Number(raw);
      if(!supplierId||!suppliers.some(item=>String(item.id)===supplierId)){
        note.textContent='Выберите поставщика.';supplier.focus();return;
      }
      if(!itemName){note.textContent='Введите наименование товара.';name.focus();return;}
      if(!raw||!/^\d+(?:\.\d{1,3})?$/.test(raw)||!Number.isFinite(amount)||amount<0){
        note.textContent='Введите корректную цену (не более трёх знаков после запятой).';price.focus();return;
      }
      const catalog=rows(this.db?.supplierCatalog);
      if(catalog.some(item=>String(item.supplierId)===supplierId&&norm(item.name)===norm(itemName)&&norm(item.unit)===norm(itemUnit))){
        note.textContent='Такая позиция с этой единицей измерения уже есть у поставщика.';name.focus();return;
      }
      if(!Number.isFinite(Number(this.revision))){
        note.textContent='Версия базы неизвестна. Обновите каталог.';return;
      }
      const ids=new Set(catalog.map(item=>String(item.id)));
      let id;
      do{id='dxprice-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
      while(ids.has(id));
      const entry={id,supplierId,name:itemName,unit:itemUnit,price:amount,
        branch:'*',availability:'unknown',source:'DashboardX: ручное добавление',usedProductId:null};
      const revision=this.revision;
      busy=true;save.disabled=true;cancel.disabled=true;
      for(const control of [supplier,name,unit,price])control.disabled=true;
      note.textContent='Сохранение товара в PRO OPTIMA…';
      try{
        await patchOptima({supplierCatalog:[...catalog,entry]},revision);
        dialog.close();
        this.filters.status='all';
        this.filters.extra=supplierId;
        this.filters.search='';
        this.saveFilters();
        await this.load();
      }catch(error){
        note.textContent=error.status===409
          ?'База изменилась. Закройте окно, обновите каталог и добавьте товар заново.'
          :'Не удалось добавить товар: '+(error.message||String(error));
      }finally{
        busy=false;save.disabled=false;cancel.disabled=false;
        for(const control of [supplier,name,unit,price])control.disabled=false;
      }
    });
    dialog.addEventListener('close',()=>{
      if(this.catalogAddDialog===dialog)this.catalogAddDialog=null;
      dialog.remove();
    },{once:true});
    dialog.append(form);document.body.append(dialog);this.catalogAddDialog=dialog;
    try{dialog.showModal();(supplier.value?name:supplier).focus();}
    catch(error){dialog.remove();this.catalogAddDialog=null;
      this.statusText.textContent='Не удалось открыть форму добавления: '+error.message;}
  }
  catalogPriceCell(row){
    const wrapper=make('div',undefined,'dx-catalog-price-cell');
    wrapper.style.display='flex';
    wrapper.style.alignItems='center';
    wrapper.style.gap='6px';
    wrapper.append(make('span',money(row.price)));
    const edit=make('button',undefined,'dx-catalog-price-edit');
    edit.type='button';
    edit.title='Изменить цену из накладной';
    edit.setAttribute('aria-label','Изменить цену: '+row.name);
    edit.style.display='inline-flex';
    edit.style.alignItems='center';
    edit.style.justifyContent='center';
    edit.style.width='28px';
    edit.style.height='28px';
    edit.style.padding='4px';
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('width','16');
    icon.setAttribute('height','16');
    icon.setAttribute('fill','none');
    icon.setAttribute('stroke','currentColor');
    icon.setAttribute('stroke-width','2');
    icon.setAttribute('stroke-linecap','round');
    icon.setAttribute('stroke-linejoin','round');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z');
    icon.append(path);
    edit.append(icon);
    edit.addEventListener('click',()=>this.openCatalogPriceDialog(row));
    wrapper.append(edit);
    return wrapper;
  }
  openCatalogPriceDialog(row){
    if(!this.db||this.destroyed)return;
    if(this.catalogPriceDialog?.open)this.catalogPriceDialog.close();
    this.catalogPriceDialog?.remove();
    const dialog=make('dialog',undefined,'dx-catalog-link-dialog');
    dialog.setAttribute('aria-label','Изменение цены из накладной');
    const heading=make('h3','Изменить цену');
    const product=make('p',String(row.name||'Без названия'),'dx-catalog-link-source');
    const label=make('label','Цена из накладной, ₸');
    const input=make('input');
    input.type='text';
    input.inputMode='decimal';
    input.autocomplete='off';
    input.placeholder='Например, 1250,50';
    input.value=row.price===null||row.price===undefined?'':String(row.price);
    input.setAttribute('aria-label','Новая цена в тенге');
    label.append(input);
    const note=make('p','Цена изменится только у выбранной позиции каталога. Привязка сохранится.','dx-catalog-link-selection');
    const actions=make('div',undefined,'dx-catalog-link-actions');
    const cancel=make('button','Отмена');cancel.type='button';
    const save=make('button','Сохранить','dx-catalog-link-confirm');save.type='submit';
    const form=make('form');form.method='dialog';
    form.append(heading,product,label,note,actions);
    actions.append(cancel,save);
    let busy=false;
    cancel.addEventListener('click',()=>{if(!busy)dialog.close();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      const raw=input.value.trim().replace(/\s/g,'').replace(',','.');
      const price=Number(raw);
      if(!raw||!Number.isFinite(price)||price<0||!/^\d+(?:\.\d{1,2})?$/.test(raw)){
        note.textContent='Укажите цену от 0 ₸, не более двух знаков после запятой.';
        input.focus();return;
      }
      if(String(row.price??'')===String(price)){dialog.close();return;}
      const catalog=rows(this.db?.supplierCatalog);
      const current=catalog.find(item=>String(item.id)===String(row.id));
      if(!current||!Number.isFinite(Number(this.revision))){
        note.textContent='Позиция не найдена или база недоступна. Обновите каталог.';return;
      }
      const baseRevision=this.revision;
      const updated=catalog.map(item=>String(item.id)===String(row.id)?{...item,price}:item);
      busy=true;save.disabled=true;cancel.disabled=true;input.disabled=true;
      note.textContent='Сохранение цены…';
      try{
        await patchOptima({supplierCatalog:updated},baseRevision);
        dialog.close();
        await this.load();
      }catch(error){
        note.textContent=error.status===409
          ?'База изменилась. Закройте окно, обновите каталог и повторите действие.'
          :'Не удалось сохранить цену: '+(error.message||String(error));
      }finally{
        busy=false;save.disabled=false;cancel.disabled=false;input.disabled=false;
      }
    });
    dialog.addEventListener('close',()=>{
      if(this.catalogPriceDialog===dialog)this.catalogPriceDialog=null;
      dialog.remove();
    },{once:true});
    dialog.append(form);
    document.body.append(dialog);this.catalogPriceDialog=dialog;
    try{dialog.showModal();input.focus();input.select();}
    catch(error){dialog.remove();this.catalogPriceDialog=null;this.statusText.textContent='Невозможно открыть редактор цены: '+error.message;}
  }
  openCatalogLinkDialog(row){
    if(!this.db||this.destroyed)return;
    if(this.catalogLinkDialog){
      this.catalogLinkDialog.close();
      this.catalogLinkDialog.remove();
      this.catalogLinkDialog=null;
    }
    const products=rows(this.db.products).filter(p=>p&&p.id!=null&&p.catalogStatus!=='proposal');
    const current=products.find(p=>String(p.id)===String(catalogProductId(row)))||null;
    let selected=current;
    const dialog=make('dialog',undefined,'dx-catalog-link-dialog');
    dialog.setAttribute('aria-label','Привязка позиции каталога к нашему наименованию');
    const heading=make('h3','Привязка наименования');
    const subheading=make('p',String(row.name||'Без названия'),'dx-catalog-link-source');
    const label=make('label','Наше наименование');
    const field=make('input');
    field.type='search';
    field.placeholder='Начните вводить название…';
    field.autocomplete='off';
    field.value=current?.name||'';
    field.setAttribute('role','combobox');
    field.setAttribute('aria-autocomplete','list');
    field.setAttribute('aria-expanded','false');
    field.setAttribute('aria-label','Поиск наших наименований');
    const menu=make('div',undefined,'dx-catalog-modal-options');
    menu.id='dx-catalog-options-'+String(this.id)+'-'+String(row.id).replace(/[^a-zA-Z0-9_-]/g,'-');
    menu.setAttribute('role','listbox');menu.hidden=true;
    field.setAttribute('aria-controls',menu.id);
    const chosen=make('p',current?'Сейчас привязано: '+current.name:'Наименование не выбрано','dx-catalog-link-selection');
    const actions=make('div',undefined,'dx-catalog-link-actions');
    const cancel=make('button','Отмена');cancel.type='button';
    const save=make('button','Привязать','dx-catalog-link-confirm');save.type='button';save.disabled=true;
    const unlink=make('button','Отвязать','dx-catalog-link-unlink');unlink.type='button';unlink.hidden=!current;
    const updateSave=()=>{
      save.disabled=!selected||String(selected.id)===String(catalogProductId(row));
      chosen.textContent=selected?'Выбрано: '+selected.name:(current?'Текущая привязка: '+current.name:'Выберите наименование из списка');
    };
    const choose=product=>{
      selected=product;field.value=String(product.name||'');
      menu.hidden=true;field.setAttribute('aria-expanded','false');
      updateSave();save.focus();
    };
    const options=()=>{
      const query=norm(field.value);
      const found=products.filter(p=>!query||norm(p.name).includes(query)||String(p.id).includes(query))
        .sort((a,b)=>{
          const aStart=norm(a.name).startsWith(query),bStart=norm(b.name).startsWith(query);
          return Number(bStart)-Number(aStart)||String(a.name).localeCompare(String(b.name),'ru');
        }).slice(0,40);
      menu.replaceChildren();
      found.forEach(product=>{
        const option=make('button',String(product.name||'')+' · #'+product.id,'dx-catalog-modal-option');
        option.type='button';option.setAttribute('role','option');
        option.addEventListener('click',()=>choose(product));
        menu.append(option);
      });
      if(!found.length)menu.append(make('p','Совпадений нет','dx-catalog-link-no-results'));
      menu.hidden=false;field.setAttribute('aria-expanded','true');
      return found;
    };
    field.addEventListener('focus',options);
    field.addEventListener('input',()=>{selected=null;updateSave();options()});
    field.addEventListener('keydown',event=>{
      if(event.key==='Enter'&& !menu.hidden){
        event.preventDefault();
        const first=menu.querySelector('button');
        if(first)first.click();
      }else if(event.key==='ArrowDown'&&!menu.hidden){
        event.preventDefault();menu.querySelector('button')?.focus();
      }else if(event.key==='Escape'&&!menu.hidden){
        event.preventDefault();event.stopPropagation();
        menu.hidden=true;field.setAttribute('aria-expanded','false');
      }
    });
    const apply=async product=>{
      save.disabled=true;unlink.disabled=true;cancel.disabled=true;
      const ok=await this.saveCatalogLink(row,product);
      if(ok){if(dialog.open)dialog.close();return;}
      cancel.disabled=false;unlink.disabled=false;updateSave();
    };
    save.addEventListener('click',()=>{if(selected)void apply(selected)});
    unlink.addEventListener('click',()=>void apply(null));
    cancel.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
    dialog.addEventListener('close',()=>{
      if(this.catalogLinkDialog===dialog)this.catalogLinkDialog=null;
      dialog.remove();
    },{once:true});
    label.append(field);actions.append(cancel,unlink,save);
    dialog.append(heading,subheading,label,menu,chosen,actions);
    document.body.append(dialog);this.catalogLinkDialog=dialog;
    try{dialog.showModal();field.focus();field.select()}
    catch(error){dialog.remove();this.catalogLinkDialog=null;this.statusText.textContent='Невозможно открыть окно привязки: '+error.message;}
  }
  async saveCatalogLink(row,product){
    if(!this.db||!Number.isFinite(Number(this.revision)))return false;
    const previous=catalogProductId(row),nextId=product?.id??null;
    if(String(previous??'')===String(nextId??''))return false;
    const id=String(row.id);
    const updatedCatalog=rows(this.db.supplierCatalog).map(item=>String(item.id)===id?{...item,usedProductId:nextId}:item);
    const updatedProducts=rows(this.db.products).map(item=>{
      const links=rows(item.catalogLinks).map(String).filter(v=>v!==id);
      if(nextId!==null&&String(item.id)===String(nextId))links.push(id);
      return {...item,catalogLinks:[...new Set(links)]};
    });
    if(!window.confirm((product?'Привязать «'+row.name+'» к «'+product.name+'»?':'Убрать привязку «'+row.name+'»?')))return false;
    this.statusText.textContent='Сохранение привязки…';
    try{
      await patchOptima({supplierCatalog:updatedCatalog,products:updatedProducts},this.revision);
      await this.load();
      return true;
    }catch(error){
      this.statusText.textContent=error.status===409?'База изменилась. Обновите каталог и попробуйте снова.':'Ошибка привязки: '+error.message;
      return false;
    }
  }
  printCatalog(){
    if(!this.db){window.alert('Сначала подключитесь к базе PRO OPTIMA.');return;}
    const db=this.db,items=[...this.filteredCatalogRows()];
    const headers=[...(this.results.querySelector('table')?.tHead?.rows?.[0]?.cells||[])];
    const column=headers.findIndex(th=>['ascending','descending'].includes(th.getAttribute('aria-sort')));
    const names=new Map(rows(db.suppliers).map(s=>[String(s.id),String(s.name||'')]));
    const vals=x=>[String(x.name||''),names.get(String(x.supplierId))||'',String(x.unit||''),money(x.price)];
    if(column>=0&&column<4){
      const factor=headers[column].getAttribute('aria-sort')==='descending'?-1:1;
      const collator=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
      const order=new Map(items.map((x,i)=>[x,i]));
      const missing=v=>!v||v==='—';
      items.sort((a,b)=>{
        const av=vals(a)[column],bv=vals(b)[column];
        if(missing(av)!==missing(bv))return missing(av)?1:-1;
        const diff=column===3&&Number.isFinite(Number(a.price))&&Number.isFinite(Number(b.price))?
          Number(a.price)-Number(b.price):collator.compare(av,bv);
        return diff*factor||order.get(a)-order.get(b);
      });
    }
    const supplier=rows(db.suppliers).find(s=>String(s.id)===String(this.filters.extra));
    openOptimaPrintPreview({
      kind:'catalog',title:'Каталог прайс-листов',
      rows:items.map(item=>({
        name:String(item.name||'—'),
        supplier:names.get(String(item.supplierId))||'—',
        unit:String(item.unit||'—'),
        price:money(item.price)
      })),
      filters:[
        ['Поиск',this.filters.search.trim()],
        ['Связь',this.filters.status==='linked'?'Связанные':this.filters.status==='unlinked'?'Несвязанные':'Все позиции'],
        ['Поставщик',supplier?.name||'Все поставщики']
      ]
    });
  }
  filteredProducts(){
    if(!this.db)return [];
    const db=this.db,f=this.filters,q=norm(f.search),branch=f.branch,extra=f.extra;
    return rows(db.products).filter(x=>x&&
      (!branch||!rows(x.excludedBranches).some(b=>branchKey(b)===branchKey(branch)))&&
      (!extra||rows(x.orderSuppliers).some(link=>
        String(link.supplierId)===String(extra)||
        (!link.supplierId&&norm(link.supplier)===norm(rows(db.suppliers).find(s=>String(s.id)===String(extra))?.name))))
    ).filter(x=>!q||norm([x.name,x.unit,x.note,rowSupplierNames(x,db),x.id].join(' ')).includes(q))
     .sort((a,b)=>String(a.name).localeCompare(String(b.name),'ru'));
  }
  printProducts(){
    if(!this.db){window.alert('Сначала подключитесь к базе PRO OPTIMA.');return;}
    const db=this.db;
    const sorted=[...this.filteredProducts()];
    // Sort the complete filtered dataset, not only the first MAX_ROWS in the screen table.
    const table=this.results.querySelector('table');
    const headers=[...(table?.tHead?.rows?.[0]?.cells||[])];
    const sortedColumn=headers.findIndex(th=>['ascending','descending'].includes(th.getAttribute('aria-sort')));
    if(sortedColumn>=0&&sortedColumn<4){
      const direction=headers[sortedColumn].getAttribute('aria-sort')==='descending'?-1:1;
      const colValue=product=>[
        String(product.id??''),String(product.name||''),String(product.unit||''),
        rowSupplierNames(product,db)
      ][sortedColumn].trim();
      const collator=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
      const baseOrder=new Map(sorted.map((row,i)=>[row,i]));
      sorted.sort((a,b)=>{
        const aa=colValue(a),bb=colValue(b);
        if(!aa||aa==='—')return !bb||bb==='—'?baseOrder.get(a)-baseOrder.get(b):1;
        if(!bb||bb==='—')return -1;
        return collator.compare(aa,bb)*direction||baseOrder.get(a)-baseOrder.get(b);
      });
    }
    const supplier=rows(db.suppliers).find(s=>String(s.id)===String(this.filters.extra));
    openOptimaPrintPreview({
      kind:'products',title:'Наименования сырья',
      rows:sorted.map(p=>({
        id:p.id,name:String(p.name||''),unit:String(p.unit||''),
        suppliers:rowSupplierNames(p,db)||'—'
      })),
      filters:[
        ['Поиск',this.filters.search.trim()],
        ['Филиал',this.filters.branch||'Все филиалы'],
        ['Поставщик',supplier?.name||'Все поставщики']
      ]
    });
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
      const items=this.filteredProducts();
      this.buildTable([
        {key:'id',label:'ID',get:p=>p.id},{key:'name',label:t('optima.product'),get:p=>p.name},
        {key:'unit',label:t('optima.unit'),get:p=>p.unit},
        {key:'supplier',label:t('optima.supplier'),get:p=>supplierLinks(p,db)},
        {key:'actions',label:'Действия',get:p=>{
          const buttons=make('div',undefined,'dx-product-row-actions');
          const edit=make('button','Изменить','dx-product-action-edit');
          edit.type='button';edit.title='Изменить «'+p.name+'»';
          edit.addEventListener('click',()=>this.openProductEditor?.(p));
          const remove=make('button','Удалить','dx-product-action-delete');
          remove.type='button';remove.title='Удалить «'+p.name+'»';
          remove.addEventListener('click',()=>this.deleteProduct?.(p));
          buttons.append(edit,remove);
          return buttons;
        }}
      ],items);
      this.summary.textContent=t('optima.found',{count:String(items.length),total:String(total('products').length)});
    }
    if(this.type==='optimaProposals'){
      const entries=this.filteredCatalogRows();
      const suppliersById=new Map(total('suppliers').map(s=>[String(s.id),s]));
      this.buildTable([
        {label:t('optima.product'),get:x=>x.name},
        {label:t('optima.supplier'),get:x=>suppliersById.get(String(x.supplierId))?.name},
        {label:t('optima.unit'),get:x=>x.unit},
        {label:t('optima.price'),get:x=>this.catalogPriceCell(x)},
        {label:'Привязка',get:x=>this.catalogLinkCell(x)}
      ],entries);
      const linked=total('supplierCatalog').filter(x=>total('products').some(p=>String(p.id)===String(catalogProductId(x)))).length;
      this.summary.textContent='Показано: '+entries.length+'   |   В каталоге: '+total('supplierCatalog').length+'   |   Непривязано: '+(total('supplierCatalog').length-linked)+'   |   Связано с нашими: '+linked;
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
    if(this.type==='optimaProducts'&&this.productEditorPanel){
      this.productEditorPanel.destroy();
      this.productEditorPanel=null;
    }
    if(this.catalogLinkDialog){this.catalogLinkDialog.close();this.catalogLinkDialog.remove();this.catalogLinkDialog=null;}
    this.catalogImporter?.destroy?.();
    this.destroyed=true;
    this.controller?.abort();clearInterval(this.poll);
    this.columnDragCleanup?.();
    clearTimeout(this.saveTimer);this.saveFilters();
    this.listeners.forEach(unbind=>unbind());this.listeners=[];
  }
}
