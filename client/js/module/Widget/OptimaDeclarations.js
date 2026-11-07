import { getCredential } from '../CredentialStore.js';
import { attachWidgetInlineEditor } from '../WidgetInlineEditor.js?v=widget-editors-20261101b';
import { loadOptima, optimaRequest, OPTIMA_POLL_MS, OPTIMA_BASE, dateISO, norm } from '../OptimaAPI.js';
const elem=(tag,cls,text)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);
  return e;
};
const DAYS=86400000;
const daysBetween=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/DAYS);
const prettyDate=s=>s?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'—';
const GROUPS=[
  ['expired','Просрочены'],
  ['urgent','Заканчиваются до 7 дней'],
  ['soon','Заканчиваются до 30 дней'],
  ['valid','Действуют'],
  ['upcoming','Ещё не действуют']
];
const ARCHIVE_REASONS={expired:'Истёк срок',replaced:'Получен новый документ',other:'Другая причина'};
const classify=(x,today)=>{
  if(x.endDate<today)return 'expired';
  if(x.startDate>today)return 'upcoming';
  const days=daysBetween(x.endDate,today);
  return days<=7?'urgent':days<=30?'soon':'valid';
};
const remaining=(x,today)=>{
  if(x.startDate>today)return 'Начало '+prettyDate(x.startDate);
  const days=daysBetween(x.endDate,today);
  if(days<0)return 'Просрочена на '+(-days)+' дн.';
  if(days===0)return 'Последний день действия';
  return 'Осталось '+days+' дн.';
};
export default class OptimaDeclarationsWidget{
  constructor(widget){
    this.widget=widget;this.id=widget.instanceId;this.store=window.dashboardxStore;
    // User-facing title must stay readable; do not alter the persisted widget ID.
    const heading=widget.querySelector('.window-title');
    if(heading)heading.textContent='Декларации';
    const old=this.store?.getWidgetState(this.id)||{};
    this.filters={
      search:typeof old.declarationSearch==='string'?old.declarationSearch:'',
      supplierId:typeof old.declarationSupplierId==='string'?old.declarationSupplierId:'',
      status:['all','expired','urgent','soon','valid','upcoming','needs_review','confirmed','replacement_requested'].includes(old.declarationStatus)?old.declarationStatus:'all',
      type:['all','eaeu','veterinary','archive'].includes(old.declarationType)?old.declarationType:'all'
    };
    this.db=null;this.revision=null;this.seq=0;this.destroyed=false;this.saving=false;
    this.supplierEditing=false;this.supplierOpen=false;this.supplierActive=-1;this.supplierOptions=[];
    this.groupOpen={expired:true,urgent:true,soon:false,valid:false,upcoming:false,archive:false};
    this.companyOpen=new Map();
    this.productOpen=new Map();
    const get=r=>widget.querySelector('[data-role="'+r+'"]');
    this.search=get('declaration-search');this.supplier=get('declaration-supplier-query');
    this.supplierList=get('declaration-supplier-list');this.supplierWrap=get('declaration-supplier-picker');
    this.statusFilter=get('declaration-status-filter');this.statusText=get('declaration-status-text');
    this.counts=get('declaration-counts');this.list=get('declaration-list');
    this.importReview=get('declaration-import-review');
    this.importItems=get('declaration-import-items');
    this.importMessage=get('declaration-import-message');
    this.importConfirm=get('declaration-import-confirm');
    this.importFile=get('declaration-import-file');
    this.filesViewer=get('declaration-files-viewer');
    this.filesGrid=get('declaration-files-grid');
    this.filesTitle=get('declaration-files-title');
    this.filesCounter=get('declaration-files-counter');
    this.filesFilename=get('declaration-files-filename');
    this.filesDownload=get('declaration-files-download');
    this.filesPrev=get('declaration-files-prev');
    this.filesNext=get('declaration-files-next');
    this.filesZoomValue=get('declaration-files-zoom-value');
    this.viewerEntries=[];this.viewerIndex=0;this.viewerZoom=1;this.viewerNative=false;
    this.viewerImage=null;
    this.viewerHome=this.filesViewer.parentNode;
    this.filesShade=document.createElement('div');
    this.filesShade.className='dx-decl-floating-shade';
    this.filesShade.setAttribute('aria-hidden','true');
    this.fileUrls=[];this.importPack=null;
    this.archivePanel=get('declaration-archive-panel');
    this.archiveTitle=get('declaration-archive-title');
    this.archiveReason=get('declaration-archive-reason');
    this.archiveNote=get('declaration-archive-note');
    this.archiveConfirm=get('declaration-archive-confirm');
    this.archiveId=null;this.replacesId=null;this.lifecycleBusy=false;
    this.search.value=this.filters.search;this.statusFilter.value=this.filters.status;
    this.unbind=[];
    this.listen=(node,event,fn)=>{
      if(!node)return;
      node.addEventListener(event,fn);this.unbind.push(()=>node.removeEventListener(event,fn));
    };
    this.supplierList.id='dx-decl-suppliers-'+String(this.id).replace(/[^a-zA-Z0-9_-]/g,'-');
    this.supplier.setAttribute('aria-controls',this.supplierList.id);
    this.listen(this.search,'input',()=>{this.filters.search=this.search.value;this.render();this.scheduleSave();});
    this.listen(this.statusFilter,'change',()=>{this.filters.status=this.statusFilter.value;this.render();this.scheduleSave();});
    this.listen(this.supplier,'focus',()=>{this.supplierOpen=true;this.supplierEditing=false;this.updateSupplierOptions();if(this.filters.supplierId)this.supplier.select();});
    this.listen(this.supplier,'click',()=>{if(!this.supplierOpen){this.supplierOpen=true;this.updateSupplierOptions();}});
    this.listen(this.supplier,'input',()=>{
      this.supplierEditing=true;this.supplierOpen=true;this.filters.supplierId='';
      this.updateSupplierOptions();this.render();this.scheduleSave();
    });
    this.listen(this.supplier,'keydown',event=>{
      if(event.key==='Escape'){this.closeSupplier();return;}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        if(!this.supplierOpen){this.supplierOpen=true;this.updateSupplierOptions();}
        if(!this.supplierOptions.length)return;
        const dir=event.key==='ArrowDown'?1:-1;
        this.supplierActive=this.supplierActive<0?(dir===1?0:this.supplierOptions.length-1):
          (this.supplierActive+dir+this.supplierOptions.length)%this.supplierOptions.length;
        this.supplierList.querySelectorAll('button[role="option"]').forEach((e,i)=>{
          e.classList.toggle('is-active',i===this.supplierActive);
          if(i===this.supplierActive)e.scrollIntoView({block:'nearest'});
        });
      }
      if(event.key==='Enter'&&this.supplierOpen){
        const selected=this.supplierOptions[this.supplierActive]||
          (this.supplierEditing&&this.supplierOptions.length===1?this.supplierOptions[0]:null);
        if(selected){event.preventDefault();this.chooseSupplier(selected);}
      }
    });
    this.listen(this.supplierList,'pointerdown',event=>{
      const button=event.target.closest('button[data-index]');
      if(!button)return;
      event.preventDefault();
      const selected=this.supplierOptions[Number(button.dataset.index)];
      if(selected)this.chooseSupplier(selected);
    });
    this.listen(document,'pointerdown',event=>{
      if(this.supplierOpen&&!this.supplierWrap.contains(event.target))this.closeSupplier();
    });
    this.listen(this.supplierWrap,'focusout',event=>{
      if(!this.supplierWrap.contains(event.relatedTarget))this.closeSupplier();
    });
    for(const button of widget.querySelectorAll('[data-role="declaration-type-tab"]')){
      this.listen(button,'click',()=>{
        this.filters.type=button.dataset.type;this.render();this.scheduleSave();
      });
    }
    this.listen(get('declaration-import-trigger'),'click',()=>this.importFile.click());
    this.listen(this.importFile,'change',()=>this.readImportFile());
    this.listen(get('declaration-import-cancel'),'click',()=>this.closeImport());
    this.listen(this.importConfirm,'click',()=>this.commitImport());
    this.listen(get('declaration-files-close'),'click',()=>this.closeFiles());
    this.listen(get('declaration-files-drag-handle'),'pointerdown',event=>this.startViewerDrag(event));
    this.listen(this.filesPrev,'click',()=>this.selectViewerFile(this.viewerIndex-1));
    this.listen(this.filesNext,'click',()=>this.selectViewerFile(this.viewerIndex+1));
    this.listen(get('declaration-files-fit'),'click',()=>this.setViewerFit());
    this.listen(get('declaration-files-actual'),'click',()=>this.setViewerActual());
    this.listen(get('declaration-files-zoom-in'),'click',()=>this.changeViewerZoom(0.25));
    this.listen(get('declaration-files-zoom-out'),'click',()=>this.changeViewerZoom(-0.25));
    this.listen(this.filesGrid,'keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();this.closeFiles();}
      if(event.key==='ArrowLeft'&&this.viewerEntries.length>1){event.preventDefault();this.selectViewerFile(this.viewerIndex-1);}
      if(event.key==='ArrowRight'&&this.viewerEntries.length>1){event.preventDefault();this.selectViewerFile(this.viewerIndex+1);}
      if(event.key==='+'||event.key==='='){event.preventDefault();this.changeViewerZoom(0.25);}
      if(event.key==='-'){event.preventDefault();this.changeViewerZoom(-0.25);}
    });
    this.filesResizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>{
      if(this.viewerImage&&!this.viewerNative&&this.viewerZoom!==1)this.updateViewerImageSize();
    }):null;
    this.filesResizeObserver?.observe(this.filesGrid);
    this.listen(get('declaration-archive-cancel'),'click',()=>this.closeArchivePanel());
    this.listen(get('declaration-archive-cancel-secondary'),'click',()=>this.closeArchivePanel());
    this.listen(this.archiveConfirm,'click',()=>this.commitArchive());
    this.listen(get('declaration-add'),'click',()=>this.openEditor(null));
    this.listen(this.list,'click',event=>{
      const button=event.target.closest('button[data-action][data-id]');
      if(!button||!this.list.contains(button))return;
      const entry=(this.db?.declarations||[]).find(x=>String(x.id)===button.dataset.id);
      if(!entry)return;
      if(button.dataset.action==='copy_product'){
        const text=entry.productItems?.[Number(button.dataset.index)];
        if(text&&navigator.clipboard?.writeText){
          navigator.clipboard.writeText(text).then(()=>
            this.setStatus('Скопировано: '+text)).catch(()=>
            this.setStatus('Копирование недоступно. Выделите название вручную.'));
        }else this.setStatus('Копирование недоступно. Выделите название вручную.');
        return;
      }
      if(button.dataset.action==='edit')this.openEditor(entry);
      if(button.dataset.action==='photos')this.openFiles(entry);
      if(button.dataset.action==='archive')this.showArchivePanel(entry);
      if(button.dataset.action==='restore')this.updateLifecycle('restore',entry);
      if(button.dataset.action==='request')this.updateLifecycle('request_replacement',entry);
      if(button.dataset.action==='cancel_request')this.updateLifecycle('cancel_replacement',entry);
      if(button.dataset.action==='renew')this.openEditor(null,entry);
    });
    this.onExternalUpdate=()=>{if(!this.editorOpen)this.load();};
    window.addEventListener('dashboardx:optima-updated',this.onExternalUpdate);
    this.load();
    this.poll=setInterval(()=>{if(!this.editorOpen)this.load();},OPTIMA_POLL_MS);
  }
  setStatus(msg){this.statusText.textContent=msg;}
  saveFilters(){
    this.store?.updateWidgetState(this.id,{
      declarationSearch:this.filters.search,declarationSupplierId:this.filters.supplierId,
      declarationStatus:this.filters.status,
      declarationType:this.filters.type
    });
  }
  scheduleSave(){clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.saveFilters(),250);}
  supplierItems(){return (this.db?.suppliers||[]).filter(s=>s?.id!=null&&s?.name)
    .slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'ru'));}
  closeSupplier(restore=true){
    this.supplierOpen=false;this.supplierActive=-1;
    this.supplierList.hidden=true;this.supplier.setAttribute('aria-expanded','false');
    if(restore){
      this.supplierEditing=false;
      this.supplier.value=this.supplierItems().find(s=>String(s.id)===this.filters.supplierId)?.name||'';
    }
  }
  chooseSupplier(item){
    this.filters.supplierId=String(item.id??'');this.supplierEditing=false;
    this.supplier.value=item.id?item.name:'';
    this.closeSupplier(false);this.render();this.scheduleSave();
    this.supplier.focus({preventScroll:true});
  }
  updateSupplierOptions(){
    const suppliers=this.supplierItems();
    if(!this.supplierEditing){
      this.supplier.value=suppliers.find(s=>String(s.id)===this.filters.supplierId)?.name||'';
    }
    if(!this.supplierOpen){this.supplierList.hidden=true;this.supplier.setAttribute('aria-expanded','false');return;}
    const typed=this.supplierEditing?norm(this.supplier.value):'';
    const matches=suppliers.filter(s=>!typed||norm(s.name).includes(typed)).map(s=>({id:String(s.id),name:String(s.name)}));
    this.supplierOptions=typed?matches.slice(0,100):[{id:'',name:'Все поставщики'},...matches.slice(0,100)];
    this.supplierActive=-1;this.supplierList.replaceChildren();
    this.supplierOptions.forEach((item,i)=>{
      const button=elem('button','dx-decl-supplier-option',item.name);
      button.type='button';button.dataset.index=String(i);
      button.id=this.supplierList.id+'-'+i;button.setAttribute('role','option');
      button.setAttribute('aria-selected',String(String(item.id)===this.filters.supplierId));
      this.supplierList.append(button);
    });
    if(!this.supplierOptions.length)this.supplierList.append(elem('div','dx-decl-supplier-empty','Совпадений нет'));
    else if(matches.length>100)this.supplierList.append(elem('div','dx-decl-supplier-empty','Уточните название для поиска'));
    this.supplierList.hidden=false;this.supplier.setAttribute('aria-expanded','true');
  }
  async load(){
    if(!getCredential('optima')){
      this.db=null;this.revision=null;this.setStatus('Укажите Admin Token PRO OPTIMA в настройках.');this.render();return;
    }
    const seq=++this.seq;this.controller?.abort();
    const ctrl=new AbortController();this.controller=ctrl;this.setStatus('Загрузка деклараций…');
    try{
      const response=await loadOptima(ctrl.signal);
      if(this.destroyed||seq!==this.seq||ctrl.signal.aborted)return;
      this.db=response.data;this.revision=response.revision;
      this.updateSupplierOptions();this.render();
      this.setStatus('Данные PRO OPTIMA · ревизия '+response.revision);
    }catch(error){
      if(this.destroyed||seq!==this.seq||ctrl.signal.aborted)return;
      this.setStatus('Не удалось загрузить декларации: '+error.message);
    }
  }
  addDocumentField(container,label,value){
    if(value===undefined||value===null||String(value).trim()==='')return;
    const row=elem('div','dx-decl-field');
    row.append(elem('dt','',label),elem('dd','',value));
    container.append(row);
  }
  renderDocumentDetail(item,all,selectedProduct){
    const panel=elem('section','dx-decl-document-detail');
    const badges=elem('div','dx-decl-metadata');
    badges.append(elem('span','dx-decl-kind',item.documentType==='veterinary'?'Ветеринарная справка':'Декларация ЕАЭС'));
    if(item.reviewStatus==='needs_review')badges.append(elem('span','dx-decl-review-badge','На проверке'));
    if(item.replacementRequestedAt)badges.append(elem('span','dx-decl-renew-requested',
      'Запрошен новый · '+prettyDate(String(item.replacementRequestedAt).slice(0,10))));
    if(item.archivedAt)badges.append(elem('span','dx-decl-archived-badge','Архив · '+prettyDate(String(item.archivedAt).slice(0,10))));
    panel.append(badges);
    const fields=elem('dl','dx-decl-fields');
    const rows=[
      ['Выбранная продукция',selectedProduct],
      ['Общая категория',item.productType],
      ['Поставщик PRO OPTIMA',item.supplierName],
      ['Наименование организации в документе',item.applicantName],
      ['Изготовитель',item.manufacturerName],
      ['Страна происхождения',item.originCountry],
      ['Точное описание продукции',item.productDescription],
      ['Номер документа',item.documentNumber],
      ['Начало действия',prettyDate(item.startDate)],
      ['Окончание действия',prettyDate(item.endDate)],
      ['Дата регистрации',item.registrationDate?prettyDate(item.registrationDate):''],
      ['Дата выдачи',item.issueDate?prettyDate(item.issueDate):''],
      ['Технические регламенты',item.technicalRegulations],
      ['QR на бланке',item.qrPresent?'Есть':''],
      ['Получатель',item.recipientName],
      ['Мест',item.quantityPlaces],
      ['Вес нетто',item.netWeight],
      ['Партия / транспортировка',item.batchDetails],
      ['Дата фактического поступления',item.receiptDate?prettyDate(item.receiptDate):''],
      ['Поступление 1С',item.receiptReference],
      ['Название из исходного файла',item.supplierNameHint],
      ['Примечания к проверке',item.notes],
      ['Время создания',item.createdAt?String(item.createdAt).slice(0,16).replace('T',' '):''],
      ['Время изменения',item.updatedAt?String(item.updatedAt).slice(0,16).replace('T',' '):'']
    ];
    for(const [label,value] of rows)this.addDocumentField(fields,label,value);
    if(item.documentType==='veterinary'&&item.receiptDate){
      const end=new Date(item.receiptDate+'T12:00:00Z');
      if(!Number.isNaN(end.getTime())){
        end.setUTCFullYear(end.getUTCFullYear()+3);
        this.addDocumentField(fields,'Ориентир окончания хранения',
          prettyDate(end.toISOString().slice(0,10)));
      }
    }
    if(item.replacesId){
      const old=all.find(x=>String(x.id)===String(item.replacesId));
      this.addDocumentField(fields,'Взамен документа',old?.documentNumber||old?.productType||item.replacesId);
    }
    const later=all.filter(x=>String(x.replacesId||'')===String(item.id));
    if(later.length)this.addDocumentField(fields,'Новые документы',
      later.map(x=>x.documentNumber||x.productType).join(' · '));
    if(item.archivedAt){
      this.addDocumentField(fields,'Перенесён в архив',prettyDate(String(item.archivedAt).slice(0,10)));
      this.addDocumentField(fields,'Причина архива',ARCHIVE_REASONS[item.archiveReason]||'Другая причина');
      this.addDocumentField(fields,'Примечание к архиву',item.archiveNote);
    }
    panel.append(fields);
    if(item.qrUrl&&/^https:\/\//i.test(item.qrUrl)){
      const link=elem('a','dx-decl-qr-link','Открыть запись по QR');
      link.href=item.qrUrl;link.target='_blank';link.rel='noopener noreferrer';
      panel.append(link);
    }
    if(Array.isArray(item.productItems)&&item.productItems.length){
      const positions=elem('div','dx-decl-positions');
      positions.append(elem('strong','dx-decl-positions-title',
        'Позиции, перечисленные в документе ('+item.productItems.length+')'));
      const names=elem('ul','dx-decl-positions-list');
      for(const [index,name] of item.productItems.entries()){
        const row=elem('li','dx-decl-position');
        row.append(elem('span','',name));
        const copy=elem('button','dx-decl-copy-item','Копировать');
        copy.type='button';copy.dataset.action='copy_product';
        copy.dataset.id=String(item.id);copy.dataset.index=String(index);
        copy.title='Копировать название для переноса в «Наименования»';
        row.append(copy);names.append(row);
      }
      positions.append(names);panel.append(positions);
    }
    const actions=elem('div','dx-decl-card-actions');
    const buttons=[['edit','✎ Изменить','Проверить или изменить документ']];
    if(item.attachments?.length)buttons.push(['photos','▧ Оригинал','Посмотреть фотографии и файлы']);
    if(item.archivedAt){
      buttons.push(['renew','Новый взамен','Создать новый документ взамен архивного']);
      buttons.push(['restore','Вернуть','Вернуть в рабочий список']);
    }else{
      buttons.push([item.replacementRequestedAt?'cancel_request':'request',
        item.replacementRequestedAt?'Отменить запрос':'Запросил новый',
        item.replacementRequestedAt?'Снять отметку запроса':'Отметить запрос нового документа']);
      buttons.push(['renew','Новый взамен','Создать новый документ взамен этого']);
      buttons.push(['archive','В архив','Перенести в архив без удаления']);
    }
    for(const [action,label,title] of buttons){
      const button=elem('button','dx-decl-action dx-decl-action-label',label);
      button.type='button';button.title=title;button.dataset.action=action;
      button.dataset.id=String(item.id);actions.append(button);
    }
    panel.append(actions);
    return panel;
  }
  render(){
    this.list.replaceChildren();this.counts.replaceChildren();
    for(const button of this.widget.querySelectorAll('[data-role="declaration-type-tab"]')){
      button.setAttribute('aria-pressed',String(button.dataset.type===this.filters.type));
    }
    if(!this.db)return;
    const suppliers=new Map(this.supplierItems().map(x=>[String(x.id),String(x.name)]));
    const today=dateISO();
    const all=(Array.isArray(this.db.declarations)?this.db.declarations:[]).map(entry=>({
      ...entry,documentType:entry.documentType||'eaeu',
      supplierName:entry.supplierId?
        (suppliers.get(String(entry.supplierId))||'Поставщик не найден · ID '+entry.supplierId):
        'Поставщик ещё не выбран',
      status:classify(entry,today),
      reviewStatus:entry.reviewStatus||'confirmed'
    }));
    const inArchive=this.filters.type==='archive';
    const pool=all.filter(x=>inArchive?Boolean(x.archivedAt):
      !x.archivedAt&&(this.filters.type==='all'||this.filters.type===x.documentType));
    this.counts.append(elem('span','dx-decl-count',inArchive?'В архиве: '+pool.length:'Документов в работе: '+pool.length));
    if(!inArchive)this.counts.append(elem('span','dx-decl-count dx-decl-archive-chip',
      'Архив: '+all.filter(x=>Boolean(x.archivedAt)).length));
    if(!inArchive)this.counts.append(elem('span','dx-decl-count dx-decl-urgent',
      'Запрошены новые: '+pool.filter(x=>Boolean(x.replacementRequestedAt)).length));
    this.counts.append(elem('span','dx-decl-count dx-decl-unreviewed',
      'На проверке: '+pool.filter(x=>x.reviewStatus==='needs_review').length));
    for(const [id,title] of (inArchive?[]:GROUPS)){
      this.counts.append(elem('span','dx-decl-count dx-decl-'+id,
        title+': '+pool.filter(x=>x.status===id).length));
    }
    const typed=norm(this.filters.search),supplierTyped=this.supplierEditing?norm(this.supplier.value):'';
    const filtered=pool.filter(x=>
      (!this.filters.supplierId||String(x.supplierId)===this.filters.supplierId)&&
      (!supplierTyped||norm(x.supplierName).includes(supplierTyped))&&
      (this.filters.status==='all'||this.filters.status===x.status||
       this.filters.status===x.reviewStatus||
       (this.filters.status==='replacement_requested'&&Boolean(x.replacementRequestedAt)))&&
      (!typed||norm([x.productType,...(x.productItems||[]),x.supplierName,x.applicantName,
        x.supplierNameHint,x.manufacturerName,x.documentNumber,x.productDescription].join(' ')).includes(typed))
    );
    if(!filtered.length){
      this.list.append(elem('p','dx-decl-empty',all.length?
        'По выбранным фильтрам документы не найдены.':
        'Документов пока нет. Нажмите «+» или импортируйте пакет фотографий.'));
      return;
    }
    for(const [status,title] of (inArchive?[['archive','Архивные документы']]:GROUPS)){
      const entries=(inArchive?filtered:filtered.filter(x=>x.status===status)).slice().sort((a,b)=>
        inArchive?String(b.archivedAt).localeCompare(String(a.archivedAt)):
        String(a.endDate).localeCompare(String(b.endDate))||
        a.supplierName.localeCompare(b.supplierName,'ru')||
        String(a.productType).localeCompare(String(b.productType),'ru'));
      if(!entries.length)continue;
      const group=elem('details','dx-decl-group dx-decl-'+status);
      group.dataset.group=status;group.open=this.groupOpen[status]===true;
      group.addEventListener('toggle',()=>{this.groupOpen[status]=group.open;});
      const summary=elem('summary','dx-decl-group-title');
      summary.append(elem('span','',title),elem('span','dx-decl-total',entries.length+' док.'));
      group.append(summary);
      const companies=new Map();
      for(const item of entries){
        const rawFirm=item.supplierId?
          item.supplierName:(item.applicantName||item.supplierNameHint||item.manufacturerName||'Организация не указана');
        const firm=String(rawFirm).trim()||'Организация не указана';
        const firmKey=item.supplierId?'supplier:'+String(item.supplierId):'document:'+norm(firm);
        if(!companies.has(firmKey))companies.set(firmKey,{name:firm,rows:[],documents:0});
        const company=companies.get(firmKey);
        company.documents++;
        const positions=Array.isArray(item.productItems)&&item.productItems.length?
          item.productItems:[item.productType||'Продукция не указана'];
        for(const [index,name] of positions.entries())company.rows.push({item,name,index});
      }
      const container=elem('div','dx-decl-group-body dx-decl-companies');
      const ordered=[...companies.entries()].sort((a,b)=>
        a[1].name.localeCompare(b[1].name,'ru'));
      for(const [key,company] of ordered){
        const companyState=status+'::'+key;
        const branch=elem('details','dx-decl-company');
        branch.dataset.companyKey=companyState;
        branch.open=this.companyOpen.get(companyState)===true;
        branch.addEventListener('toggle',()=>this.companyOpen.set(companyState,branch.open));
        const head=elem('summary','dx-decl-company-summary');
        head.append(elem('strong','dx-decl-company-name',company.name));
        const meta=elem('span','dx-decl-company-count',
          company.rows.length+' поз. · '+company.documents+' док.');
        head.append(meta);branch.append(head);
        const products=elem('div','dx-decl-company-products');
        company.rows.sort((a,b)=>
          String(a.item.endDate).localeCompare(String(b.item.endDate))||
          String(a.name).localeCompare(String(b.name),'ru'));
        for(const {item,name,index} of company.rows){
          const recordKey=status+'::'+String(item.id)+'::'+index;
          const product=elem('details','dx-decl-product');
          product.dataset.productKey=recordKey;
          product.open=this.productOpen.get(recordKey)===true;
          product.addEventListener('toggle',()=>this.productOpen.set(recordKey,product.open));
          const label=elem('summary','dx-decl-product-summary');
          const nameBox=elem('span','dx-decl-product-name',name);
          label.append(nameBox);
          if(item.reviewStatus==='needs_review')label.append(elem('span','dx-decl-product-review','Проверить'));
          const expiry=elem('span','dx-decl-product-date',prettyDate(item.endDate));
          expiry.title='Окончание действия · '+remaining(item,today);
          label.append(expiry);
          product.append(label);
          product.append(this.renderDocumentDetail(item,all,name));
          products.append(product);
        }
        branch.append(products);container.append(branch);
      }
      group.append(container);this.list.append(group);
    }
  }
  showArchivePanel(item){
    if(this.lifecycleBusy||this.saving||!item)return;
    this.archiveId=String(item.id);
    this.archiveTitle.textContent='Перенести в архив: '+item.productType+
      (item.documentNumber?' · № '+item.documentNumber:'');
    this.archiveReason.value=item.endDate<dateISO()?'expired':'replaced';
    this.archiveNote.value='';
    this.archivePanel.hidden=false;
    this.archivePanel.scrollIntoView({block:'nearest'});
  }
  closeArchivePanel(){
    if(this.lifecycleBusy)return;
    this.archivePanel.hidden=true;this.archiveId=null;
    this.archiveNote.value='';
  }
  async commitArchive(){
    if(!this.archiveId||this.lifecycleBusy||this.saving)return;
    const id=this.archiveId;
    const item=this.db?.declarations?.find(entry=>String(entry.id)===id);
    if(!item){this.setStatus('Документ больше не найден. Обновите список.');return;}
    this.lifecycleBusy=true;this.archiveConfirm.disabled=true;
    this.setStatus('Переношу документ в архив, сохраняя реквизиты и фотографии…');
    try{
      const result=await optimaRequest('/api/dashboardx/declarations',{
        method:'POST',
        body:JSON.stringify({action:'archive',id,baseRevision:this.revision,
          reason:this.archiveReason.value,note:this.archiveNote.value.trim()})
      });
      this.archiveId=null;this.archivePanel.hidden=true;this.archiveNote.value='';
      window.dispatchEvent(new CustomEvent('dashboardx:optima-updated',{detail:{revision:result.revision}}));
      await this.load();
      this.setStatus('Документ сохранён в архиве. Оригиналы и фотографии доступны во вкладке «Архив».');
    }catch(error){
      this.setStatus('Перенос не выполнен: '+error.message);
    }finally{
      this.lifecycleBusy=false;this.archiveConfirm.disabled=false;
    }
  }
  async updateLifecycle(action,item){
    if(this.lifecycleBusy||this.saving||!item)return;
    this.lifecycleBusy=true;
    const label={
      restore:'Возвращаю документ из архива…',
      request_replacement:'Сохраняю отметку запроса нового документа…',
      cancel_replacement:'Снимаю отметку запроса…'
    };
    this.setStatus(label[action]||'Сохраняю изменение…');
    try{
      const result=await optimaRequest('/api/dashboardx/declarations',{
        method:'POST',
        body:JSON.stringify({action,id:item.id,baseRevision:this.revision})
      });
      window.dispatchEvent(new CustomEvent('dashboardx:optima-updated',{detail:{revision:result.revision}}));
      await this.load();
      this.setStatus(action==='restore'?'Документ возвращён в рабочий список.':
        action==='request_replacement'?'Отмечено: новый документ запрошен. Старый остаётся в базе.':
        'Отметка запроса снята.');
    }catch(error){this.setStatus('Не удалось изменить статус документа: '+error.message);}
    finally{this.lifecycleBusy=false;}
  }
  closeImport(){
    this.importPack=null;this.importReview.hidden=true;
    this.importFile.value='';
    this.importItems.replaceChildren();
    this.importConfirm.disabled=false;
  }
  async readImportFile(){
    const file=this.importFile.files?.[0];
    if(!file)return;
    this.closeImport();
    if(file.size>20*1024*1024){this.setStatus('Пакет слишком большой (максимум 20 МБ).');return;}
    try{
      const text=await file.text(),data=JSON.parse(text);
      if(data.format!=='dashboardx-optima-documents-v1'||!Array.isArray(data.records)||!data.records.length||data.records.length>12)
        throw Error('Это не пакет документов DashboardX.');
      for(const record of data.records){
        if(!['eaeu','veterinary'].includes(record.documentType)||!record.productType||!record.endDate||
           !Array.isArray(record.files)||!record.files.length)throw Error('В пакете отсутствуют обязательные поля.');
      }
      this.importPack=data;
      this.importReview.hidden=false;this.importItems.replaceChildren();
      for(const record of data.records){
        const card=elem('article','dx-decl-import-card');
        const picture=record.files.find(x=>x.mime?.startsWith('image/')&&x.base64);
        if(picture){
          const image=document.createElement('img');image.alt='Исходная фотография';
          image.src='data:'+picture.mime+';base64,'+picture.base64;card.append(image);
        }
        const details=elem('div','dx-decl-import-card-body');
        details.append(elem('strong','',record.productType));
        details.append(elem('span','',record.documentType==='veterinary'?'Ветеринарная справка':'Декларация ЕАЭС'));
        details.append(elem('span','','№ '+(record.documentNumber||'не указан')));
        details.append(elem('span','','Срок: '+prettyDate(record.startDate)+' – '+prettyDate(record.endDate)));
        details.append(elem('span','','Заявитель: '+(record.applicantName||'не указан')));
        if(record.productItems?.length){
          const list=elem('ul','dx-decl-import-itemnames');
          for(const name of record.productItems)list.append(elem('li','',name));
          details.append(elem('span','','Конкретные позиции ('+record.productItems.length+'):'));
          details.append(list);
        }
        if(record.notes)details.append(elem('small','',record.notes));
        card.append(details);this.importItems.append(card);
      }
      this.importMessage.textContent='Найдено документов: '+data.records.length+
        '. Данные и фотографии сохранятся в закрытой базе как «На проверке». Сначала сравните реквизиты с оригиналами.';
      this.importReview.scrollIntoView({block:'nearest'});
    }catch(error){this.setStatus('Не удалось прочитать пакет: '+error.message);}
  }
  async commitImport(){
    if(this.importing||!this.importPack||this.revision==null)return;
    this.importing=true;this.importConfirm.disabled=true;
    this.importMessage.textContent='Сохраняю фотографии и черновики в PRO OPTIMA…';
    try{
      const response=await optimaRequest('/api/dashboardx/declarations',{method:'POST',
        body:JSON.stringify({action:'import',baseRevision:this.revision,records:this.importPack.records})});
      this.closeImport();
      this.filters.type='all';this.filters.status='needs_review';this.statusFilter.value='needs_review';
      this.filters.search='';this.search.value='';
      this.filters.supplierId='';this.supplierEditing=false;this.supplier.value='';this.closeSupplier();
      this.scheduleSave();await this.load();
      this.setStatus('Новых документов: '+response.imported.length+
        ' · дополнены позиции: '+(response.updated?.length||0)+
        ' · без изменений: '+response.skipped.length+
        '. Проверьте реквизиты и выберите поставщиков.');
    }catch(error){
      this.importMessage.textContent='Импорт не выполнен: '+error.message+
        (error.status===409?' Обновите документы и повторите импорт.':'');
    }finally{this.importing=false;this.importConfirm.disabled=false;}
  }
  openFloatingFiles(){
    if(!this.filesViewer.isConnected||this.filesViewer.parentNode!==document.body){
      document.body.append(this.filesShade,this.filesViewer);
    }
    // The shade is decorative only; it never intercepts clicks on DashboardX.
    this.filesShade.hidden=false;
    this.filesViewer.style.left='50%';
    this.filesViewer.style.top='50%';
    this.filesViewer.style.transform='translate(-50%, -50%)';
    this.filesViewer.style.width='';
    this.filesViewer.style.height='';
    this.filesViewer.hidden=false;
    this.filesViewer.focus({preventScroll:true});
  }
  closeFloatingFiles(){
    this.viewerDragCleanup?.();
    this.viewerDragCleanup=null;
    this.filesShade.remove();
    this.filesViewer.style.transform='';
    this.filesViewer.style.left='';
    this.filesViewer.style.top='';
    this.filesViewer.style.width='';
    this.filesViewer.style.height='';
    if(this.viewerHome?.isConnected)this.viewerHome.append(this.filesViewer);
    else this.filesViewer.remove();
  }
  startViewerDrag(event){
    if(event.button!==0||event.target.closest('button,a,input'))return;
    if(event.pointerType==='touch'&&event.isPrimary===false)return;
    event.preventDefault();
    const rect=this.filesViewer.getBoundingClientRect();
    const startX=event.clientX,startY=event.clientY;
    this.filesViewer.style.transform='none';
    this.filesViewer.style.left=Math.round(rect.left)+'px';
    this.filesViewer.style.top=Math.round(rect.top)+'px';
    const onMove=e=>{
      if(e.pointerId!==event.pointerId)return;
      this.filesViewer.style.left=Math.max(8,Math.min(window.innerWidth-100,
        Math.round(rect.left+e.clientX-startX)))+'px';
      this.filesViewer.style.top=Math.max(8,Math.min(window.innerHeight-85,
        Math.round(rect.top+e.clientY-startY)))+'px';
    };
    const cleanup=()=>{
      document.removeEventListener('pointermove',onMove);
      document.removeEventListener('pointerup',onEnd);
      document.removeEventListener('pointercancel',onEnd);
      this.viewerDragCleanup=null;
    };
    const onEnd=e=>{if(e.pointerId===event.pointerId)cleanup();};
    this.viewerDragCleanup?.();
    this.viewerDragCleanup=cleanup;
    document.addEventListener('pointermove',onMove);
    document.addEventListener('pointerup',onEnd);
    document.addEventListener('pointercancel',onEnd);
  }
  closeFiles(){
    this.fileSeq=(this.fileSeq||0)+1;
    for(const url of this.fileUrls)URL.revokeObjectURL(url);
    this.fileUrls=[];
    this.viewerEntries=[];this.viewerImage=null;this.viewerIndex=0;
    this.viewerZoom=1;this.viewerNative=false;
    this.filesGrid.replaceChildren();this.filesViewer.hidden=true;
    this.filesCounter.textContent='';this.filesFilename.textContent='';
    this.filesDownload.hidden=true;this.filesDownload.removeAttribute('href');
    this.closeFloatingFiles();
  }
  viewerFitWidth(image){
    const availableWidth=Math.max(120,this.filesGrid.clientWidth-24);
    const availableHeight=Math.max(120,this.filesGrid.clientHeight-24);
    return Math.max(50,Math.min(availableWidth,
      availableHeight*image.naturalWidth/Math.max(1,image.naturalHeight)));
  }
  updateViewerImageSize(){
    const image=this.viewerImage;
    if(!image||!image.naturalWidth)return;
    if(this.viewerNative){
      image.style.width=image.naturalWidth+'px';
      image.style.height=image.naturalHeight+'px';
      image.classList.remove('dx-decl-image-fit');
      this.filesZoomValue.textContent='1:1';
    }else if(this.viewerZoom===1){
      image.style.width='';image.style.height='';
      image.classList.add('dx-decl-image-fit');
      this.filesZoomValue.textContent='100%';
    }else{
      const width=this.viewerFitWidth(image)*this.viewerZoom;
      image.style.width=Math.round(width)+'px';
      image.style.height='auto';
      image.classList.remove('dx-decl-image-fit');
      this.filesZoomValue.textContent=Math.round(this.viewerZoom*100)+'%';
    }
  }
  setViewerFit(){
    this.viewerNative=false;this.viewerZoom=1;
    this.updateViewerImageSize();
    this.filesGrid.scrollTo({left:0,top:0});
  }
  setViewerActual(){
    this.viewerNative=true;
    this.updateViewerImageSize();
    this.filesGrid.scrollTo({left:0,top:0});
  }
  changeViewerZoom(delta){
    if(!this.viewerImage||!this.viewerImage.naturalWidth)return;
    if(this.viewerNative){
      this.viewerZoom=Math.max(1,this.viewerImage.naturalWidth/this.viewerFitWidth(this.viewerImage));
      this.viewerNative=false;
    }
    const next=Math.max(0.5,Math.min(10,Math.round((this.viewerZoom+delta)*100)/100));
    if(next===this.viewerZoom)return;
    const stage=this.filesGrid;
    const centerX=(stage.scrollLeft+stage.clientWidth/2)/Math.max(1,stage.scrollWidth);
    const centerY=(stage.scrollTop+stage.clientHeight/2)/Math.max(1,stage.scrollHeight);
    this.viewerZoom=next;
    this.updateViewerImageSize();
    stage.scrollLeft=centerX*stage.scrollWidth-stage.clientWidth/2;
    stage.scrollTop=centerY*stage.scrollHeight-stage.clientHeight/2;
  }
  selectViewerFile(index){
    if(!this.viewerEntries.length)return;
    const count=this.viewerEntries.length;
    this.viewerIndex=(index+count)%count;
    this.viewerNative=false;this.viewerZoom=1;
    this.renderViewerFile();
  }
  renderViewerFile(){
    if(this.filesViewer.hidden)return;
    const count=this.viewerEntries.length;
    const entry=this.viewerEntries[this.viewerIndex];
    this.filesPrev.disabled=count<=1;
    this.filesNext.disabled=count<=1;
    this.filesCounter.textContent=count?'Файл '+(this.viewerIndex+1)+' из '+count:'Нет вложений';
    this.filesGrid.replaceChildren();this.viewerImage=null;
    this.filesFilename.textContent=entry?.attachment?.name||'';
    this.filesDownload.hidden=!entry?.url;
    if(entry?.url){
      this.filesDownload.href=entry.url;
      this.filesDownload.download=entry.attachment.name||'Оригинал';
    }else this.filesDownload.removeAttribute('href');
    if(!entry){this.filesGrid.append(elem('p','dx-decl-file-load','У документа нет прикреплённых файлов.'));return;}
    if(entry.error){this.filesGrid.append(elem('p','dx-decl-file-error','Файл недоступен: '+entry.error));return;}
    if(!entry.url){this.filesGrid.append(elem('p','dx-decl-file-load','Загружаю оригинал…'));return;}
    if(!String(entry.attachment.mime).startsWith('image/')){
      this.filesGrid.append(elem('p','dx-decl-file-load','Это PDF. Нажмите «Скачать оригинал», чтобы открыть полный документ.'));
      this.filesZoomValue.textContent='—';return;
    }
    const image=document.createElement('img');
    this.viewerImage=image;
    image.alt='Оригинал: '+(entry.attachment.name||'документ');
    image.decoding='async';
    image.onload=()=>{
      if(this.viewerImage!==image)return;
      this.updateViewerImageSize();
    };
    image.onerror=()=>{
      if(this.viewerImage===image)this.filesGrid.replaceChildren(elem('p','dx-decl-file-error','Не удалось отобразить фотографию.'));
    };
    image.src=entry.url;
    this.filesGrid.append(image);
    this.filesGrid.scrollTo({left:0,top:0});
    this.filesZoomValue.textContent='100%';
  }
  async openFiles(item){
    this.closeFiles();
    this.filesTitle.textContent='Оригинал: '+item.productType;
    this.viewerEntries=(item.attachments||[]).map(attachment=>({attachment,url:null,error:null}));
    this.viewerIndex=0;
    this.openFloatingFiles();
    this.renderViewerFile();
    const seq=++this.fileSeq;
    for(let index=0;index<this.viewerEntries.length;index++){
      const entry=this.viewerEntries[index];
      try{
        const response=await fetch(OPTIMA_BASE+'/api/dashboardx/declarations/attachments/'+
          encodeURIComponent(item.id)+'/'+encodeURIComponent(entry.attachment.id),{
          headers:{Authorization:'Bearer '+getCredential('optima')},cache:'no-store'
        });
        if(!response.ok)throw Error('HTTP '+response.status);
        const blob=await response.blob();
        if(this.destroyed||this.fileSeq!==seq)return;
        const url=URL.createObjectURL(blob);
        entry.url=url;this.fileUrls.push(url);
      }catch(error){
        if(this.destroyed||this.fileSeq!==seq)return;
        entry.error=error?.message||'Ошибка загрузки';
      }
      if(this.viewerIndex===index)this.renderViewerFile();
    }
  }
  buildEditor(){
    if(this.editorWindow)return;
    // This is an inline, movable editor owned by the widget—not a modal dialog.
    const form=document.createElement('form');
    form.className='dx-decl-form';
    form.setAttribute('data-role','declaration-form');
    form.innerHTML="<label>Категория документа\n  <select name=\"documentType\" required><option value=\"eaeu\">Декларация ЕАЭС</option><option value=\"veterinary\">Ветеринарная справка</option></select>\n</label>\n<label class=\"dx-decl-editor-supplier-label\">Поставщик PRO OPTIMA\n  <div class=\"dx-declarations-supplier dx-decl-editor-supplier\" data-role=\"declaration-editor-supplier-picker\">\n    <input type=\"search\" data-role=\"declaration-editor-supplier-query\" role=\"combobox\" aria-autocomplete=\"list\" aria-haspopup=\"listbox\" aria-expanded=\"false\" aria-label=\"Поставщик\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Введите название поставщика…\">\n    <input type=\"hidden\" name=\"supplierId\">\n    <div data-role=\"declaration-editor-supplier-list\" role=\"listbox\" aria-label=\"Подходящие поставщики\" hidden></div>\n  </div>\n</label>\n<label>Обобщённый тип продукции\n  <input name=\"productType\" type=\"text\" maxlength=\"180\" placeholder=\"Например, молочная продукция\" autocomplete=\"off\" required>\n</label>\n<label>Конкретные позиции продукции (каждая с новой строки)\n  <textarea name=\"productItemsText\" rows=\"4\" maxlength=\"17000\" placeholder=\"Например:\nСпортивная\nТыквита\nВиктория\nВиктория с йодказеином\"></textarea>\n  <small>Категория остаётся как в декларации. Позиции можно затем вручную перенести в «Наименования».</small>\n</label>\n<label>Номер документа\n  <input name=\"documentNumber\" type=\"text\" maxlength=\"130\" placeholder=\"Номер из бланка\">\n</label>\n<label>Заявитель / отправитель\n  <input name=\"applicantName\" type=\"text\" maxlength=\"190\" placeholder=\"Организация, указанная в документе\">\n</label>\n<label>Изготовитель\n  <input name=\"manufacturerName\" type=\"text\" maxlength=\"190\" placeholder=\"Изготовитель продукции\">\n</label>\n<label>Страна происхождения\n  <input name=\"originCountry\" type=\"text\" maxlength=\"90\" placeholder=\"Страна происхождения продукции\">\n</label>\n<label>Описание продукции из документа\n  <textarea name=\"productDescription\" rows=\"2\" maxlength=\"700\" placeholder=\"Точное наименование, чтобы не перепутать с категорией\"></textarea>\n</label>\n<div class=\"dx-decl-date-fields\">\n  <label data-doc-scope=\"eaeu\">Дата регистрации<input name=\"registrationDate\" type=\"date\"></label>\n  <label data-doc-scope=\"veterinary\" hidden>Дата выдачи<input name=\"issueDate\" type=\"date\"></label>\n  <label>Начало действия<input name=\"startDate\" type=\"date\"></label>\n  <label>Окончание действия<input name=\"endDate\" type=\"date\" required></label>\n</div>\n<label data-doc-scope=\"eaeu\">Технические регламенты\n  <input name=\"technicalRegulations\" maxlength=\"200\" placeholder=\"ТР ТС 021/2011\">\n</label>\n<label>Ссылка на официальный реестр из QR\n  <input name=\"qrUrl\" type=\"url\" maxlength=\"900\" placeholder=\"https://...\">\n</label>\n<label class=\"dx-decl-qr-checkbox\">\n  <input name=\"qrPresent\" type=\"checkbox\"> QR-код присутствует на бумажном документе\n</label>\n<label data-doc-scope=\"veterinary\" hidden>Получатель<input name=\"recipientName\" maxlength=\"190\"></label>\n<div class=\"dx-decl-date-fields\" data-doc-scope=\"veterinary\" hidden>\n  <label>Количество мест<input name=\"quantityPlaces\" maxlength=\"50\"></label>\n  <label>Вес нетто<input name=\"netWeight\" maxlength=\"70\" placeholder=\"50 кг\"></label>\n</div>\n<label data-doc-scope=\"veterinary\" hidden>Дата фактического поступления<input name=\"receiptDate\" type=\"date\"></label>\n<label data-doc-scope=\"veterinary\" hidden>Номер поступления в 1С\n  <input name=\"receiptReference\" maxlength=\"120\" placeholder=\"Номер документа поступления\">\n</label>\n<label data-doc-scope=\"veterinary\" hidden>Партия / сведения о перевозке\n  <textarea name=\"batchDetails\" maxlength=\"500\" rows=\"2\"></textarea>\n</label>\n<label>Дополнительные сведения\n  <textarea name=\"notes\" rows=\"3\" maxlength=\"1200\" placeholder=\"Какие данные ещё нужно проверить\"></textarea>\n</label>\n<label>Состояние проверки\n  <select name=\"reviewStatus\">\n    <option value=\"needs_review\">На проверке</option>\n    <option value=\"confirmed\">Проверено вручную</option>\n  </select>\n</label>\n<label>Приложить оригиналы (JPG, PNG, WEBP, PDF; до 8 МБ каждый)\n  <input name=\"newFiles\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,application/pdf\" multiple>\n</label>\n<p class=\"dx-decl-form-hint\" data-role=\"declaration-attachment-count\"></p>\n<p class=\"dx-decl-form-hint\">Черновик можно сохранить без поставщика или даты начала. Перед подтверждением проверьте реквизиты и выберите поставщика PRO OPTIMA. Подтверждение здесь не равно проверке в государственном реестре.</p>\n<p class=\"dx-decl-form-feedback\" data-role=\"declaration-form-feedback\" aria-live=\"polite\"></p>\n<div class=\"dx-decl-dialog-actions\">\n  <button type=\"button\" data-role=\"declaration-form-cancel\">Отмена</button>\n  <button type=\"submit\" data-role=\"declaration-form-save\">Сохранить</button>\n</div>";
    this.form=form;
    this.formFeedback=form.querySelector('[data-role="declaration-form-feedback"]');
    this.saveButton=form.querySelector('[data-role="declaration-form-save"]');
    this.editorWindow=attachWidgetInlineEditor(this.widget,form,{
      title:'Декларация',kind:'declarations',
      host:this.widget.body,
      onClose:()=>this.closeEditor()
    });
    this.listen(form.querySelector('[data-role="declaration-form-cancel"]'),'click',()=>this.closeEditor());
    this.installEditorSupplierPicker();
    this.listen(form.elements.namedItem('documentType'),'change',()=>this.updateEditorFields());
    this.listen(form.elements.namedItem('reviewStatus'),'change',()=>this.updateEditorFields());
    this.listen(form,'submit',event=>{event.preventDefault();this.saveEntry();});
  }
  installEditorSupplierPicker(){
    const get=role=>this.form.querySelector('[data-role="'+role+'"]');
    const query=get('declaration-editor-supplier-query');
    const list=get('declaration-editor-supplier-list');
    const picker=get('declaration-editor-supplier-picker');
    const supplierId=this.form.elements.namedItem('supplierId');
    const listId='dx-decl-editor-suppliers-'+String(this.id).replace(/[^a-zA-Z0-9_-]/g,'-');
    list.id=listId;query.setAttribute('aria-controls',listId);
    this.editorSupplierQuery=query;
    this.editorSupplierList=list;
    this.editorSupplierPicker=picker;
    this.editorSupplierId=supplierId;
    this.editorSupplierOpen=false;
    this.editorSupplierEditing=false;
    this.editorSupplierActive=-1;
    this.editorSupplierOptions=[];
    const close=(restore=true)=>{
      this.editorSupplierOpen=false;
      this.editorSupplierEditing=false;
      this.editorSupplierActive=-1;
      list.hidden=true;
      query.setAttribute('aria-expanded','false');
      query.removeAttribute('aria-activedescendant');
      if(restore){
        const selected=this.supplierItems().find(s=>String(s.id)===supplierId.value);
        query.value=selected?.name||'';
      }
    };
    this.closeEditorSupplier=close;
    const populate=()=>{
      if(!this.editorSupplierOpen){close(false);return;}
      const typed=this.editorSupplierEditing?norm(query.value):'';
      const matches=this.supplierItems().filter(s=>!typed||norm(s.name).includes(typed));
      this.editorSupplierOptions=matches.slice(0,100).map(s=>({id:String(s.id),name:String(s.name)}));
      this.editorSupplierActive=-1;
      query.removeAttribute('aria-activedescendant');
      list.replaceChildren();
      for(const [i,item] of this.editorSupplierOptions.entries()){
        const button=elem('button','dx-decl-supplier-option',item.name);
        button.type='button';button.dataset.index=String(i);
        button.id=listId+'-'+i;button.setAttribute('role','option');
        button.setAttribute('aria-selected',String(item.id===supplierId.value));
        list.append(button);
      }
      if(!this.editorSupplierOptions.length)list.append(elem('div','dx-decl-supplier-empty','Совпадений нет'));
      else if(matches.length>100)list.append(elem('div','dx-decl-supplier-empty','Уточните название для поиска'));
      list.hidden=false;query.setAttribute('aria-expanded','true');
    };
    const choose=item=>{
      supplierId.value=item.id;
      this.editorSupplierEditing=false;
      query.value=item.name;
      query.setCustomValidity('');
      close(false);
      query.focus({preventScroll:true});
    };
    this.listen(query,'focus',()=>{
      this.editorSupplierOpen=true;
      this.editorSupplierEditing=false;
      if(supplierId.value)query.select();
      populate();
    });
    this.listen(query,'click',()=>{
      if(!this.editorSupplierOpen){this.editorSupplierOpen=true;populate();}
    });
    this.listen(query,'input',()=>{
      supplierId.value='';
      this.editorSupplierEditing=true;
      query.setCustomValidity('');
      this.editorSupplierOpen=true;populate();
    });
    this.listen(query,'keydown',event=>{
      if(event.key==='Escape'){
        if(this.editorSupplierOpen){event.preventDefault();event.stopPropagation();close();}
        return;
      }
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        if(!this.editorSupplierOpen)this.editorSupplierOpen=true;
        if(!this.editorSupplierOptions.length)populate();
        if(!this.editorSupplierOptions.length)return;
        const step=event.key==='ArrowDown'?1:-1;
        this.editorSupplierActive=this.editorSupplierActive<0?
          (step>0?0:this.editorSupplierOptions.length-1):
          (this.editorSupplierActive+step+this.editorSupplierOptions.length)%this.editorSupplierOptions.length;
        const buttons=list.querySelectorAll('button[role="option"]');
        buttons.forEach((button,i)=>button.classList.toggle('is-active',i===this.editorSupplierActive));
        const selected=buttons[this.editorSupplierActive];
        if(selected){query.setAttribute('aria-activedescendant',selected.id);selected.scrollIntoView({block:'nearest'});}
        return;
      }
      if(event.key==='Enter'&&this.editorSupplierOpen){
        const choice=this.editorSupplierOptions[this.editorSupplierActive]||
          (this.editorSupplierEditing&&this.editorSupplierOptions.length===1?this.editorSupplierOptions[0]:null);
        if(choice){event.preventDefault();choose(choice);}
        else event.preventDefault();
      }
    });
    this.listen(list,'pointerdown',event=>{
      const button=event.target.closest('button[data-index]');
      if(!button)return;
      event.preventDefault();
      const choice=this.editorSupplierOptions[Number(button.dataset.index)];
      if(choice)choose(choice);
    });
    this.listen(picker,'focusout',event=>{
      if(!picker.contains(event.relatedTarget))close();
    });
    this.listen(document,'pointerdown',event=>{
      if(this.editorSupplierOpen&&!picker.contains(event.target))close();
    });
  }
  updateEditorFields(){
    if(!this.form)return;
    const kind=this.form.elements.namedItem('documentType').value;
    for(const field of this.form.querySelectorAll('[data-doc-scope]')){
      field.hidden=field.dataset.docScope!==kind;
    }
    const confirmed=this.form.elements.namedItem('reviewStatus').value==='confirmed';
    this.editorSupplierQuery.required=confirmed;
    this.form.elements.namedItem('startDate').required=confirmed;
    if(!confirmed)this.editorSupplierQuery.setCustomValidity('');
  }
  async encodeFiles(files){
    if(files.length>10)throw Error('Выберите не более 10 файлов.');
    const result=[];
    for(const file of files){
      if(file.size>8*1024*1024)throw Error('Файл '+file.name+' больше 8 МБ.');
      if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))
        throw Error('Допустимы JPG, PNG, WEBP и PDF.');
      const base64=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||'').split(',')[1]);
        reader.onerror=()=>reject(Error('Не удалось прочитать '+file.name));
        reader.readAsDataURL(file);
      });
      result.push({name:file.name,mime:file.type,base64});
    }
    return result;
  }
  closeEditor(force=false){
    if(this.saving&&!force)return;
    this.editorOpen=false;
    this.editorWindow?.hide();
    this.closeEditorSupplier?.(false);
    this.editId=null;this.replacesId=null;
    this.form?.reset();
    this.editorSupplierQuery?.setCustomValidity('');
    if(this.formFeedback)this.formFeedback.textContent='';
  }
  openEditor(item,replacementFrom=null){
    if(!this.db||this.revision==null){this.setStatus('Сначала подключитесь к базе PRO OPTIMA.');return;}
    this.buildEditor();
    if(this.editorOpen){
      this.editorWindow.open();
      this.form.elements.namedItem('productType').focus({preventScroll:true});
      return;
    }
    this.editId=item?.id!=null?String(item.id):null;
    this.replacesId=item?.replacesId||replacementFrom?.id||null;
    const initial=item||(replacementFrom?{
      documentType:replacementFrom.documentType,
      supplierId:replacementFrom.supplierId,
      productType:replacementFrom.productType
    }:null);
    this.dialogRevision=this.revision;
    this.editorWindow.setTitle(item?'Изменить декларацию':replacementFrom?'Новый документ взамен':'Добавить декларацию');
    const supplier=this.supplierItems().find(s=>String(s.id)===String(initial?.supplierId??''));
    this.editorSupplierId.value=initial?.supplierId!=null?String(initial.supplierId):'';
    this.editorSupplierQuery.value=supplier?.name||'';
    this.editorSupplierQuery.setCustomValidity('');
    this.closeEditorSupplier(false);
    const values={
      documentType:initial?.documentType||(this.filters.type==='veterinary'?'veterinary':'eaeu'),
      reviewStatus:initial?.reviewStatus||(item?'confirmed':'needs_review'),
      productType:initial?.productType||'',
      productItemsText:Array.isArray(item?.productItems)?item.productItems.join('\n'):'',
      documentNumber:initial?.documentNumber||'',
      applicantName:initial?.applicantName||'',
      manufacturerName:initial?.manufacturerName||'',
      originCountry:initial?.originCountry||'',
      productDescription:initial?.productDescription||'',
      registrationDate:initial?.registrationDate||'',
      issueDate:initial?.issueDate||'',
      startDate:initial?.startDate||'',
      endDate:initial?.endDate||'',
      technicalRegulations:initial?.technicalRegulations||'',
      qrUrl:initial?.qrUrl||'',
      recipientName:initial?.recipientName||'',
      quantityPlaces:initial?.quantityPlaces||'',
      netWeight:initial?.netWeight||'',
      receiptDate:initial?.receiptDate||'',
      receiptReference:initial?.receiptReference||'',
      batchDetails:initial?.batchDetails||'',
      notes:initial?.notes||''
    };
    for(const [field,value] of Object.entries(values))this.form.elements.namedItem(field).value=value;
    this.form.elements.namedItem('qrPresent').checked=Boolean(initial?.qrPresent);
    this.form.elements.namedItem('newFiles').value='';
    this.form.querySelector('[data-role="declaration-attachment-count"]').textContent=
      'Сохранённых вложений: '+(initial?.attachments?.length||0)+
      (initial?.supplierNameHint?' · Название в источнике: '+item.supplierNameHint:'');
    this.updateEditorFields();
    let renewalInfo=this.form.querySelector('[data-role="declaration-renewal-hint"]');
    if(!renewalInfo){
      renewalInfo=elem('p','dx-decl-renewal-hint');
      renewalInfo.dataset.role='declaration-renewal-hint';
      this.form.insertBefore(renewalInfo,this.form.querySelector('[data-role="declaration-attachment-count"]'));
    }
    renewalInfo.hidden=!this.replacesId;
    renewalInfo.textContent=this.replacesId
      ?'Новая запись будет связана с предыдущей. Старые сроки, номер и фотографии не копируются.'
      :'';
    this.formFeedback.textContent='';
    this.editorOpen=true;
    this.editorWindow.open();
    (item?this.form.elements.namedItem('productType'):this.editorSupplierQuery).focus({preventScroll:true});
  }
  async saveEntry(){
    if(this.saving||!this.editorOpen)return;
    const value=name=>this.form.elements.namedItem(name).value.trim();
    const reviewStatus=value('reviewStatus');
    const chosenId=this.editorSupplierId?.value||'';
    const hasSupplier=this.supplierItems().some(x=>String(x.id)===chosenId);
    const typed=this.editorSupplierQuery.value.trim();
    const invalid=(!hasSupplier&&typed)||(!hasSupplier&&reviewStatus==='confirmed');
    this.editorSupplierQuery.setCustomValidity(invalid?'Выберите поставщика из выпадающего списка.':'');
    if(!this.form.reportValidity())return;
    const names=['documentType','reviewStatus','productType','documentNumber','applicantName',
      'manufacturerName','originCountry','productDescription','registrationDate','issueDate','startDate',
      'endDate','technicalRegulations','qrUrl','recipientName','quantityPlaces',
      'netWeight','receiptDate','receiptReference','batchDetails','notes'];
    const data=Object.fromEntries(names.map(name=>[name,value(name)]));
    data.supplierId=hasSupplier?chosenId:null;
    data.qrPresent=this.form.elements.namedItem('qrPresent').checked;
    data.productItems=this.form.elements.namedItem('productItemsText').value.split(/\r?\n/)
      .map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean);
    if(data.productItems.length>100||data.productItems.some(x=>x.length>160)){
      this.formFeedback.textContent='Можно указать до 100 позиций, не более 160 символов на строку.';return;
    }
    if(this.replacesId)data.replacesId=this.replacesId;
    if(data.startDate&&data.endDate<data.startDate){
      this.formFeedback.textContent='Дата окончания раньше даты начала.';return;
    }
    this.saving=true;this.saveButton.disabled=true;this.formFeedback.textContent='Сохраняю декларацию…';
    try{
      const files=await this.encodeFiles(Array.from(this.form.elements.namedItem('newFiles').files||[]));
      const response=await optimaRequest('/api/dashboardx/declarations',{method:'POST',
        body:JSON.stringify({action:'save',baseRevision:this.dialogRevision,files,
          declaration:{...(this.editId?{id:this.editId}:{}),...data}})});
      this.closeEditor(true);
      window.dispatchEvent(new CustomEvent('dashboardx:optima-updated',{detail:{revision:response.revision}}));
      await this.load();this.setStatus('Декларация сохранена · ревизия '+response.revision);
    }catch(error){
      this.formFeedback.textContent=error.status===409?
        'База изменилась. Закройте окно, обновите данные и повторите.':error.message;
    }finally{this.saving=false;this.saveButton.disabled=false;}
  }
  async deleteEntry(item){
    if(this.saving||!this.db)return;
    const supplier=this.supplierItems().find(s=>String(s.id)===String(item.supplierId))?.name||item.supplierId;
    if(!window.confirm('Удалить декларацию «'+item.productType+'» поставщика «'+supplier+'»?\nПеред удалением сервер создаст резервную копию базы.'))return;
    this.saving=true;this.setStatus('Удаляю декларацию…');
    try{
      const response=await optimaRequest('/api/dashboardx/declarations',{method:'POST',
        body:JSON.stringify({action:'delete',id:item.id,baseRevision:this.revision})});
      window.dispatchEvent(new CustomEvent('dashboardx:optima-updated',{detail:{revision:response.revision}}));
      await this.load();this.setStatus('Декларация удалена · ревизия '+response.revision);
    }catch(error){this.setStatus('Не удалось удалить декларацию: '+error.message);}
    finally{this.saving=false;}
  }
  destroy(){
    this.destroyed=true;this.controller?.abort();clearInterval(this.poll);
    clearTimeout(this.saveTimer);this.saveFilters();
    window.removeEventListener('dashboardx:optima-updated',this.onExternalUpdate);
    for(const fn of this.unbind)fn();
    this.filesResizeObserver?.disconnect();
    this.closeImport();this.closeFiles();
    this.archivePanel.hidden=true;
    this.editorWindow?.destroy();
  }
}
