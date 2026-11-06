import { getCredential } from '../CredentialStore.js';
import { attachWidgetInlineEditor } from '../WidgetInlineEditor.js?v=widget-editors-20261101b';
import { loadOptima, optimaRequest, OPTIMA_POLL_MS, dateISO, norm } from '../OptimaAPI.js';
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
      status:['all','expired','urgent','soon','valid','upcoming'].includes(old.declarationStatus)?old.declarationStatus:'all'
    };
    this.db=null;this.revision=null;this.seq=0;this.destroyed=false;this.saving=false;
    this.supplierEditing=false;this.supplierOpen=false;this.supplierActive=-1;this.supplierOptions=[];
    this.groupOpen=Object.fromEntries(GROUPS.map(([k])=>[k,true]));
    const get=r=>widget.querySelector('[data-role="'+r+'"]');
    this.search=get('declaration-search');this.supplier=get('declaration-supplier-query');
    this.supplierList=get('declaration-supplier-list');this.supplierWrap=get('declaration-supplier-picker');
    this.statusFilter=get('declaration-status-filter');this.statusText=get('declaration-status-text');
    this.counts=get('declaration-counts');this.list=get('declaration-list');
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
    this.listen(get('declaration-add'),'click',()=>this.openEditor(null));
    this.listen(this.list,'click',event=>{
      const button=event.target.closest('button[data-action][data-id]');
      if(!button||!this.list.contains(button))return;
      const entry=(this.db?.declarations||[]).find(x=>String(x.id)===button.dataset.id);
      if(!entry)return;
      if(button.dataset.action==='edit')this.openEditor(entry);
      if(button.dataset.action==='delete')this.deleteEntry(entry);
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
      declarationStatus:this.filters.status
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
    if(!this.db)return;
    const suppliers=new Map(this.supplierItems().map(s=>[String(s.id),String(s.name)]));
    const today=dateISO();
    const all=(Array.isArray(this.db.declarations)?this.db.declarations:[]).map(item=>({
      ...item,supplierName:suppliers.get(String(item.supplierId))||'Поставщик удалён · ID '+item.supplierId,
      status:classify(item,today)
    }));
    for(const [key,title] of GROUPS){
      const count=all.filter(x=>x.status===key).length;
      this.counts.append(elem('span','dx-decl-count dx-decl-'+key,title+': '+count));
    }
    const query=norm(this.filters.search);
    const supplierText=this.supplierEditing?norm(this.supplier.value):'';
    const rows=all.filter(x=>
      (!this.filters.supplierId||String(x.supplierId)===this.filters.supplierId)&&
      (!supplierText||norm(x.supplierName).includes(supplierText))&&
      (this.filters.status==='all'||x.status===this.filters.status)&&
      (!query||norm(x.productType+' '+x.supplierName).includes(query)));
    if(!rows.length){
      this.list.append(elem('p','dx-decl-empty',all.length?
        'По выбранным фильтрам декларации не найдены.':
        'Деклараций пока нет. Нажмите «+», чтобы добавить первую.'));
      return;
    }
    for(const [key,title] of GROUPS){
      const entries=rows.filter(x=>x.status===key).sort((a,b)=>
        String(a.endDate).localeCompare(String(b.endDate))||
        a.supplierName.localeCompare(b.supplierName,'ru')||
        String(a.productType).localeCompare(String(b.productType),'ru'));
      if(!entries.length)continue;
      const group=elem('details','dx-decl-group dx-decl-'+key);
      group.dataset.group=key;group.open=this.groupOpen[key]!==false;
      group.addEventListener('toggle',()=>{this.groupOpen[key]=group.open;});
      const summary=elem('summary','dx-decl-group-title');
      summary.append(elem('span','',title),elem('span','dx-decl-total',entries.length));
      group.append(summary);
      const content=elem('div','dx-decl-group-body');
      for(const item of entries){
        const card=elem('article','dx-decl-card');
        const main=elem('div','dx-decl-card-main');
        const head=elem('div','dx-decl-card-head');
        head.append(elem('strong','',item.productType),
          elem('span','dx-decl-pill dx-decl-'+item.status,remaining(item,today)));
        main.append(head,elem('div','dx-decl-supplier-name',item.supplierName));
        const dates=elem('div','dx-decl-dates');
        dates.append(elem('span','','Начало: '+prettyDate(item.startDate)),
          elem('span','','Окончание: '+prettyDate(item.endDate)));
        main.append(dates);
        const actions=elem('div','dx-decl-card-actions');
        for(const [action,label,title] of [['edit','✎','Изменить'],['delete','×','Удалить']]){
          const button=elem('button','dx-decl-action',label);
          button.type='button';button.title=title+' декларацию';
          button.setAttribute('aria-label',title+' декларацию '+item.productType);
          button.dataset.action=action;button.dataset.id=String(item.id);
          actions.append(button);
        }
        card.append(main,actions);content.append(card);
      }
      group.append(content);this.list.append(group);
    }
  }
  buildEditor(){
    if(this.editorWindow)return;
    // This is an inline, movable editor owned by the widget—not a modal dialog.
    const form=document.createElement('form');
    form.className='dx-decl-form';
    form.setAttribute('data-role','declaration-form');
    form.innerHTML='<label class="dx-decl-editor-supplier-label">Поставщик<div class="dx-declarations-supplier dx-decl-editor-supplier" data-role="declaration-editor-supplier-picker"><input type="search" data-role="declaration-editor-supplier-query" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-label="Поставщик" autocomplete="off" spellcheck="false" placeholder="Введите название поставщика…" required><input type="hidden" name="supplierId"><div data-role="declaration-editor-supplier-list" role="listbox" aria-label="Подходящие поставщики" hidden></div></div></label><label>Тип продукции<input name="productType" type="text" maxlength="180" placeholder="Например, молочная продукция" autocomplete="off" required></label><div class="dx-decl-date-fields"><label>Начало действия<input name="startDate" type="date" required></label><label>Окончание действия<input name="endDate" type="date" required></label></div><p class="dx-decl-form-hint">Дата окончания включена в срок действия. Категорию продукции вводите вручную.</p><p class="dx-decl-form-feedback" data-role="declaration-form-feedback" aria-live="polite"></p><div class="dx-decl-dialog-actions"><button type="button" data-role="declaration-form-cancel">Отмена</button><button type="submit" data-role="declaration-form-save">Сохранить</button></div>';
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
    this.editorSupplierActive=-1;
    this.editorSupplierOptions=[];
    const close=(restore=true)=>{
      this.editorSupplierOpen=false;
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
      const typed=norm(query.value);
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
      query.value=item.name;
      query.setCustomValidity('');
      close(false);
      query.focus({preventScroll:true});
    };
    this.listen(query,'focus',()=>{
      this.editorSupplierOpen=true;
      if(supplierId.value)query.select();
      populate();
    });
    this.listen(query,'click',()=>{
      if(!this.editorSupplierOpen){this.editorSupplierOpen=true;populate();}
    });
    this.listen(query,'input',()=>{
      supplierId.value='';
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
          (this.editorSupplierOptions.length===1?this.editorSupplierOptions[0]:null);
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
    this.editorSupplierId.value=item?String(item.supplierId):'';
    this.editorSupplierQuery.value=supplier?.name||'';
    this.editorSupplierQuery.setCustomValidity('');
    this.closeEditorSupplier(false);
    this.form.elements.namedItem('productType').value=item?.productType||'';
    this.form.elements.namedItem('startDate').value=item?.startDate||'';
    this.form.elements.namedItem('endDate').value=item?.endDate||'';
    this.formFeedback.textContent='';
    this.editorOpen=true;
    this.editorWindow.open();
    (item?this.form.elements.namedItem('productType'):this.editorSupplierQuery).focus({preventScroll:true});
  }
  async saveEntry(){
    if(this.saving||!this.editorOpen)return;
    const chosenId=this.editorSupplierId?.value||'';
    const hasSupplier=this.supplierItems().some(s=>String(s.id)===chosenId);
    this.editorSupplierQuery.setCustomValidity(hasSupplier?'':'Выберите поставщика из выпадающего списка.');
    if(!this.form.reportValidity())return;
    const data={
      supplierId:this.form.elements.namedItem('supplierId').value,
      productType:this.form.elements.namedItem('productType').value.trim(),
      startDate:this.form.elements.namedItem('startDate').value,
      endDate:this.form.elements.namedItem('endDate').value
    };
    if(data.endDate<data.startDate){this.formFeedback.textContent='Дата окончания раньше даты начала.';return;}
    this.saving=true;this.saveButton.disabled=true;this.formFeedback.textContent='Сохраняю декларацию…';
    try{
      const response=await optimaRequest('/api/dashboardx/declarations',{method:'POST',
        body:JSON.stringify({action:'save',baseRevision:this.dialogRevision,
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
    this.editorWindow?.destroy();
  }
}
