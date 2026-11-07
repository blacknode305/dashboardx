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
    this.groupOpen={...Object.fromEntries(GROUPS.map(([k])=>[k,true])),archive:true};
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
    this.listen(get('declaration-archive-cancel'),'click',()=>this.closeArchivePanel());
    this.listen(get('declaration-archive-cancel-secondary'),'click',()=>this.closeArchivePanel());
    this.listen(this.archiveConfirm,'click',()=>this.commitArchive());
    this.listen(get('declaration-add'),'click',()=>this.openEditor(null));
    this.listen(this.list,'click',event=>{
      const button=event.target.closest('button[data-action][data-id]');
      if(!button||!this.list.contains(button))return;
      const entry=(this.db?.declarations||[]).find(x=>String(x.id)===button.dataset.id);
      if(!entry)return;
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
    const pool=all.filter(x=>this.filters.type==='all'||this.filters.type===x.documentType);
    this.counts.append(elem('span','dx-decl-count','Всего: '+pool.length));
    this.counts.append(elem('span','dx-decl-count dx-decl-unreviewed',
      'На проверке: '+pool.filter(x=>x.reviewStatus==='needs_review').length));
    for(const [id,title] of GROUPS){
      this.counts.append(elem('span','dx-decl-count dx-decl-'+id,
        title+': '+pool.filter(x=>x.status===id).length));
    }
    const typed=norm(this.filters.search),supplierTyped=this.supplierEditing?norm(this.supplier.value):'';
    const filtered=pool.filter(x=>
      (!this.filters.supplierId||String(x.supplierId)===this.filters.supplierId)&&
      (!supplierTyped||norm(x.supplierName).includes(supplierTyped))&&
      (this.filters.status==='all'||this.filters.status===x.status||this.filters.status===x.reviewStatus)&&
      (!typed||norm([x.productType,x.supplierName,x.applicantName,x.documentNumber,x.productDescription].join(' ')).includes(typed))
    );
    if(!filtered.length){
      this.list.append(elem('p','dx-decl-empty',all.length?
        'По выбранным фильтрам документы не найдены.':
        'Документов пока нет. Нажмите «+» или импортируйте пакет фотографий.'));
      return;
    }
    for(const [id,title] of GROUPS){
      const entries=filtered.filter(x=>x.status===id).sort((a,b)=>
        String(a.endDate).localeCompare(String(b.endDate))||
        a.supplierName.localeCompare(b.supplierName,'ru')||
        String(a.productType).localeCompare(String(b.productType),'ru'));
      if(!entries.length)continue;
      const group=elem('details','dx-decl-group dx-decl-'+id);
      group.dataset.group=id;group.open=this.groupOpen[id]!==false;
      group.addEventListener('toggle',()=>{this.groupOpen[id]=group.open;});
      const summary=elem('summary','dx-decl-group-title');
      summary.append(elem('span','',title),elem('span','dx-decl-total',entries.length));
      group.append(summary);
      const container=elem('div','dx-decl-group-body');
      for(const item of entries){
        const card=elem('article','dx-decl-card');
        const main=elem('div','dx-decl-card-main');
        const head=elem('div','dx-decl-card-head');
        const heading=elem('strong','',item.productType);
        head.append(heading,elem('span','dx-decl-pill dx-decl-'+item.status,remaining(item,today)));
        main.append(head);
        const meta=elem('div','dx-decl-metadata');
        meta.append(elem('span','dx-decl-kind',item.documentType==='veterinary'?'Ветсправка':'ЕАЭС'));
        if(item.reviewStatus==='needs_review')meta.append(elem('span','dx-decl-review-badge','На проверке'));
        if(item.documentNumber)meta.append(elem('span','dx-decl-number',item.documentNumber));
        main.append(meta);
        main.append(elem('div','dx-decl-supplier-name',item.supplierName));
        if(item.applicantName)main.append(elem('div','dx-decl-applicant','Документ: '+item.applicantName));
        if(item.documentType==='veterinary'&&item.receiptDate){
          const deadline=new Date(item.receiptDate+'T12:00:00Z');
          deadline.setUTCFullYear(deadline.getUTCFullYear()+3);
          main.append(elem('div','dx-decl-applicant',
            'Архивный ориентир: '+prettyDate(deadline.toISOString().slice(0,10))+
            ' (3 года со дня фактического поступления)'));
        }
        const dates=elem('div','dx-decl-dates');
        dates.append(elem('span','','Начало: '+prettyDate(item.startDate)),
          elem('span','','Окончание: '+prettyDate(item.endDate)));
        main.append(dates);
        if(item.reviewStatus==='needs_review'&&item.notes)main.append(elem('p','dx-decl-review-notes',item.notes));
        const actions=elem('div','dx-decl-card-actions');
        const buttons=[['edit','✎','Проверить / изменить']];
        if(item.attachments?.length)buttons.push(['photos','▧','Фотографии ('+item.attachments.length+')']);
        buttons.push(['delete','×','Удалить']);
        for(const [action,txt,label] of buttons){
          const button=elem('button','dx-decl-action',txt);button.type='button';
          button.title=label;button.setAttribute('aria-label',label+' '+item.productType);
          button.dataset.action=action;button.dataset.id=String(item.id);
          actions.append(button);
        }
        card.append(main,actions);container.append(card);
      }
      group.append(container);this.list.append(group);
    }
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
      this.setStatus('Импортировано черновиков: '+response.imported.length+
        ' · пропущено повторов: '+response.skipped.length+'. Проверьте реквизиты и привяжите поставщиков.');
    }catch(error){
      this.importMessage.textContent='Импорт не выполнен: '+error.message+
        (error.status===409?' Обновите документы и повторите импорт.':'');
    }finally{this.importing=false;this.importConfirm.disabled=false;}
  }
  closeFiles(){
    this.fileSeq=(this.fileSeq||0)+1;
    for(const url of this.fileUrls)URL.revokeObjectURL(url);
    this.fileUrls=[];this.filesGrid.replaceChildren();this.filesViewer.hidden=true;
  }
  async openFiles(item){
    this.closeFiles();
    this.filesViewer.hidden=false;
    this.filesTitle.textContent='Оригиналы: '+item.productType;
    this.filesGrid.append(elem('p','dx-decl-file-load','Открываю файлы из защищённого хранилища…'));
    const seq=this.fileSeq=(this.fileSeq||0)+1;
    const photos=[];
    for(const attachment of item.attachments||[]){
      try{
        const resp=await fetch(OPTIMA_BASE+'/api/dashboardx/declarations/attachments/'+
          encodeURIComponent(item.id)+'/'+encodeURIComponent(attachment.id),{
          headers:{Authorization:'Bearer '+getCredential('optima')},cache:'no-store'
        });
        if(!resp.ok)throw Error('HTTP '+resp.status);
        const blob=await resp.blob();
        if(this.destroyed||this.fileSeq!==seq)return;
        const url=URL.createObjectURL(blob);this.fileUrls.push(url);
        const figure=elem('figure','dx-decl-file');
        if(String(attachment.mime).startsWith('image/')){
          const image=document.createElement('img');image.src=url;image.alt=attachment.name;figure.append(image);
        }
        const link=elem('a','',attachment.name||'Открыть документ');
        link.href=url;link.download=attachment.name||'документ';link.target='_blank';link.rel='noopener';
        figure.append(link);photos.push(figure);
      }catch(error){photos.push(elem('p','dx-decl-file-error','Файл недоступен: '+error.message));}
    }
    if(this.destroyed||this.fileSeq!==seq)return;
    this.filesGrid.replaceChildren(...photos);
  }
  buildEditor(){
    if(this.editorWindow)return;
    // This is an inline, movable editor owned by the widget—not a modal dialog.
    const form=document.createElement('form');
    form.className='dx-decl-form';
    form.setAttribute('data-role','declaration-form');
    form.innerHTML="<label>Категория документа\n  <select name=\"documentType\" required><option value=\"eaeu\">Декларация ЕАЭС</option><option value=\"veterinary\">Ветеринарная справка</option></select>\n</label>\n<label class=\"dx-decl-editor-supplier-label\">Поставщик PRO OPTIMA\n  <div class=\"dx-declarations-supplier dx-decl-editor-supplier\" data-role=\"declaration-editor-supplier-picker\">\n    <input type=\"search\" data-role=\"declaration-editor-supplier-query\" role=\"combobox\" aria-autocomplete=\"list\" aria-haspopup=\"listbox\" aria-expanded=\"false\" aria-label=\"Поставщик\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Введите название поставщика…\">\n    <input type=\"hidden\" name=\"supplierId\">\n    <div data-role=\"declaration-editor-supplier-list\" role=\"listbox\" aria-label=\"Подходящие поставщики\" hidden></div>\n  </div>\n</label>\n<label>Обобщённый тип продукции\n  <input name=\"productType\" type=\"text\" maxlength=\"180\" placeholder=\"Например, молочная продукция\" autocomplete=\"off\" required>\n</label>\n<label>Номер документа\n  <input name=\"documentNumber\" type=\"text\" maxlength=\"130\" placeholder=\"Номер из бланка\">\n</label>\n<label>Заявитель / отправитель\n  <input name=\"applicantName\" type=\"text\" maxlength=\"190\" placeholder=\"Организация, указанная в документе\">\n</label>\n<label>Изготовитель\n  <input name=\"manufacturerName\" type=\"text\" maxlength=\"190\" placeholder=\"Изготовитель продукции\">\n</label>\n<label>Страна происхождения\n  <input name=\"originCountry\" type=\"text\" maxlength=\"90\" placeholder=\"Страна происхождения продукции\">\n</label>\n<label>Описание продукции из документа\n  <textarea name=\"productDescription\" rows=\"2\" maxlength=\"700\" placeholder=\"Точное наименование, чтобы не перепутать с категорией\"></textarea>\n</label>\n<div class=\"dx-decl-date-fields\">\n  <label data-doc-scope=\"eaeu\">Дата регистрации<input name=\"registrationDate\" type=\"date\"></label>\n  <label data-doc-scope=\"veterinary\" hidden>Дата выдачи<input name=\"issueDate\" type=\"date\"></label>\n  <label>Начало действия<input name=\"startDate\" type=\"date\"></label>\n  <label>Окончание действия<input name=\"endDate\" type=\"date\" required></label>\n</div>\n<label data-doc-scope=\"eaeu\">Технические регламенты\n  <input name=\"technicalRegulations\" maxlength=\"200\" placeholder=\"ТР ТС 021/2011\">\n</label>\n<label>Ссылка на официальный реестр из QR\n  <input name=\"qrUrl\" type=\"url\" maxlength=\"900\" placeholder=\"https://...\">\n</label>\n<label class=\"dx-decl-qr-checkbox\">\n  <input name=\"qrPresent\" type=\"checkbox\"> QR-код присутствует на бумажном документе\n</label>\n<label data-doc-scope=\"veterinary\" hidden>Получатель<input name=\"recipientName\" maxlength=\"190\"></label>\n<div class=\"dx-decl-date-fields\" data-doc-scope=\"veterinary\" hidden>\n  <label>Количество мест<input name=\"quantityPlaces\" maxlength=\"50\"></label>\n  <label>Вес нетто<input name=\"netWeight\" maxlength=\"70\" placeholder=\"50 кг\"></label>\n</div>\n<label data-doc-scope=\"veterinary\" hidden>Дата фактического поступления<input name=\"receiptDate\" type=\"date\"></label>\n<label data-doc-scope=\"veterinary\" hidden>Номер поступления в 1С\n  <input name=\"receiptReference\" maxlength=\"120\" placeholder=\"Номер документа поступления\">\n</label>\n<label data-doc-scope=\"veterinary\" hidden>Партия / сведения о перевозке\n  <textarea name=\"batchDetails\" maxlength=\"500\" rows=\"2\"></textarea>\n</label>\n<label>Дополнительные сведения\n  <textarea name=\"notes\" rows=\"3\" maxlength=\"1200\" placeholder=\"Какие данные ещё нужно проверить\"></textarea>\n</label>\n<label>Состояние проверки\n  <select name=\"reviewStatus\">\n    <option value=\"needs_review\">На проверке</option>\n    <option value=\"confirmed\">Проверено вручную</option>\n  </select>\n</label>\n<label>Приложить оригиналы (JPG, PNG, WEBP, PDF; до 8 МБ каждый)\n  <input name=\"newFiles\" type=\"file\" accept=\"image/jpeg,image/png,image/webp,application/pdf\" multiple>\n</label>\n<p class=\"dx-decl-form-hint\" data-role=\"declaration-attachment-count\"></p>\n<p class=\"dx-decl-form-hint\">Черновик можно сохранить без поставщика или даты начала. Перед подтверждением проверьте реквизиты и выберите поставщика PRO OPTIMA. Подтверждение здесь не равно проверке в государственном реестре.</p>\n<p class=\"dx-decl-form-feedback\" data-role=\"declaration-form-feedback\" aria-live=\"polite\"></p>\n<div class=\"dx-decl-dialog-actions\">\n  <button type=\"button\" data-role=\"declaration-form-cancel\">Отмена</button>\n  <button type=\"submit\" data-role=\"declaration-form-save\">Сохранить</button>\n</div>";
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
    this.editId=null;
    this.form?.reset();
    this.editorSupplierQuery?.setCustomValidity('');
    if(this.formFeedback)this.formFeedback.textContent='';
  }
  openEditor(item){
    if(!this.db||this.revision==null){this.setStatus('Сначала подключитесь к базе PRO OPTIMA.');return;}
    this.buildEditor();
    if(this.editorOpen){
      this.editorWindow.open();
      this.form.elements.namedItem('productType').focus({preventScroll:true});
      return;
    }
    this.editId=item?.id!=null?String(item.id):null;
    this.dialogRevision=this.revision;
    this.editorWindow.setTitle(item?'Изменить декларацию':'Добавить декларацию');
    const supplier=this.supplierItems().find(s=>String(s.id)===String(item?.supplierId??''));
    this.editorSupplierId.value=item?.supplierId!=null?String(item.supplierId):'';
    this.editorSupplierQuery.value=supplier?.name||'';
    this.editorSupplierQuery.setCustomValidity('');
    this.closeEditorSupplier(false);
    const values={
      documentType:item?.documentType||(this.filters.type==='veterinary'?'veterinary':'eaeu'),
      reviewStatus:item?.reviewStatus||(item?'confirmed':'needs_review'),
      productType:item?.productType||'',
      documentNumber:item?.documentNumber||'',
      applicantName:item?.applicantName||'',
      manufacturerName:item?.manufacturerName||'',
      originCountry:item?.originCountry||'',
      productDescription:item?.productDescription||'',
      registrationDate:item?.registrationDate||'',
      issueDate:item?.issueDate||'',
      startDate:item?.startDate||'',
      endDate:item?.endDate||'',
      technicalRegulations:item?.technicalRegulations||'',
      qrUrl:item?.qrUrl||'',
      recipientName:item?.recipientName||'',
      quantityPlaces:item?.quantityPlaces||'',
      netWeight:item?.netWeight||'',
      receiptDate:item?.receiptDate||'',
      receiptReference:item?.receiptReference||'',
      batchDetails:item?.batchDetails||'',
      notes:item?.notes||''
    };
    for(const [field,value] of Object.entries(values))this.form.elements.namedItem(field).value=value;
    this.form.elements.namedItem('qrPresent').checked=Boolean(item?.qrPresent);
    this.form.elements.namedItem('newFiles').value='';
    this.form.querySelector('[data-role="declaration-attachment-count"]').textContent=
      'Сохранённых вложений: '+(item?.attachments?.length||0)+
      (item?.supplierNameHint?' · Название в источнике: '+item.supplierNameHint:'');
    this.updateEditorFields();
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
    this.closeImport();this.closeFiles();
    this.editorWindow?.destroy();
  }
}
