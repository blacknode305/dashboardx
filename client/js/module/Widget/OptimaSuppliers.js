import { t } from '../i18n.js';
import { getCredential } from '../CredentialStore.js';
import { loadOptima, patchOptima, OPTIMA_POLL_MS, OPTIMA_BASE } from '../OptimaAPI.js';
const DAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const DAY_NAMES=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const parseDays=value=>new Set(String(value||'').split(/[,;/]+/).map(v=>v.trim().toLocaleLowerCase()).map(v=>DAY_NAMES.find(n=>n.toLocaleLowerCase()===v)||DAY_NAMES[DAYS.findIndex(d=>d.toLocaleLowerCase()===v)]).filter(Boolean));
const normalize=value=>String(value??'').trim().toLocaleLowerCase();
const canonicalBranch=value=>normalize(value)==='лободы'?'Лободы':String(value??'').trim();
const whatsappUrl=phone=>{
  const raw=String(phone||'').trim();
  if(!/^\+?[\d\s().-]+$/.test(raw))return null;
  let digits=raw.replace(/\D/g,'');
  if(digits.length===11&&digits.startsWith('8'))digits='7'+digits.slice(1);
  return digits.length>=10&&digits.length<=15?'https://wa.me/'+digits:null;
};
export function filterOptimaSuppliers(suppliers,search,branch){
  const query=normalize(search),required=normalize(branch);
  return suppliers.filter(s=>{
    const schedules=Array.isArray(s.schedules)?s.schedules:[];
    const branchMatches=!required||schedules.some(row=>normalize(row?.branch)===required);
    const textMatches=!query||[s.name,s.contact,s.phone].some(v=>normalize(v).includes(query));
    return branchMatches&&textMatches;
  });
}


/** Replace exactly one supplier by stable ID, preserving unknown schema fields. */
export function prepareSupplierChanges(snapshot,supplierId,values,replaceSchedules=false){
  const list=Array.isArray(snapshot?.suppliers)?snapshot.suppliers:[];
  const current=list.find(s=>String(s.id)===String(supplierId));
  const name=String(values?.name||'').trim();
  if(!current||!name)throw new Error('missing supplier/name');
  if(list.some(s=>s!==current&&String(s.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase())){
    throw new Error('duplicate supplier name');
  }
  const changed={
    ...current,name,contact:String(values.contact||'').trim(),
    phone:String(values.phone||'').trim()
  };
  if(replaceSchedules){
    if(!Array.isArray(values.schedules))throw new Error('schedule list required');
    changed.schedules=values.schedules.map(r=>({
      branch:String(r.branch||'').trim(),
      order:String(r.order||'').trim(),
      delivery:String(r.delivery||'').trim(),
      note:String(r.note||'').trim()
    })).filter(r=>r.branch||r.order||r.delivery||r.note);
    if(changed.schedules.some(r=>!r.branch))throw new Error('branch required');
    const unique=new Set();
    for(const r of changed.schedules){
      const key=r.branch.toLocaleLowerCase();
      if(unique.has(key))throw new Error('duplicate branch');
      unique.add(key);
    }
  }
  const changes={suppliers:list.map(s=>s===current?changed:s)};
  if(current.name!==name){
    changes.products=(Array.isArray(snapshot.products)?snapshot.products:[]).map(p=>{
      if(!Array.isArray(p.orderSuppliers))return p;
      let different=false;
      const links=p.orderSuppliers.map(link=>{
        if(String(link.supplierId||'')!==String(supplierId)&&
            !( !link.supplierId && String(link.supplier||'').trim().toLocaleLowerCase()===String(current.name).trim().toLocaleLowerCase()))
          return link;
        different=true;
        return {...link,supplierId:current.id,supplier:name};
      });
      return different?{...p,orderSuppliers:links}:p;
    });
  }
  return changes;
}

export default class OptimaSuppliersWidget {
  constructor(widget){
    this.widget=widget;this.store=window.dashboardxStore;
    this.id=widget.instanceId;this.destroyed=false;
    this.rows=[];this.database=null;this.revision=null;this.requestId=0;this.editId=null;this.editMode=null;
    const state=this.store?.getWidgetState(this.id)||{};
    this.search=widget.querySelector('[data-role="optima-search"]');
    this.branch=widget.querySelector('[data-role="optima-branch"]');
    this.status=widget.querySelector('[data-role="optima-status"]');
    this.count=widget.querySelector('[data-role="optima-count"]');
    this.list=widget.querySelector('[data-role="optima-list"]');
    this.search.value=typeof state.search==='string'?state.search:'';
    this.selectedBranch=typeof state.branch==='string'?state.branch:'';
    this.expanded=new Set();
    this.editor=widget.querySelector('[data-role="optima-editor"]');
    this.editorHome=this.editor.parentElement;
    this.editCard=null;
    this.editorTitle=widget.querySelector('[data-role="optima-editor-title"]');
    this.editorError=widget.querySelector('[data-role="optima-editor-error"]');
    this.editName=widget.querySelector('[data-role="optima-edit-name"]');
    this.editContact=widget.querySelector('[data-role="optima-edit-contact"]');
    this.editPhone=widget.querySelector('[data-role="optima-edit-phone"]');
    this.scheduleEditor=widget.querySelector('[data-role="optima-edit-schedules"]');
    this.scheduleRows=widget.querySelector('[data-role="optima-schedule-rows"]');
    this.onCancel=()=>this.closeEditor();
    this.onSubmit=event=>{event.preventDefault();this.saveEdit();};
    this.onAddSchedule=()=>this.makeScheduleRow({});
    widget.querySelector('[data-role="optima-cancel-edit"]').addEventListener('click',this.onCancel);
    widget.querySelector('[data-role="optima-edit-form"]').addEventListener('submit',this.onSubmit);
    widget.querySelector('[data-role="optima-add-schedule"]').addEventListener('click',this.onAddSchedule);
    this.onExternalUpdate=()=>{if(!this.editId)this.load();};
    window.addEventListener('dashboardx:optima-updated',this.onExternalUpdate);
    this.onFilter=()=>{
      this.selectedBranch=this.branch.value;
      this.render();
      clearTimeout(this.persistTimer);
      this.persistTimer=setTimeout(()=>{
        this.store.updateWidgetState(this.id,{
          search:this.search.value,branch:this.selectedBranch
        });
      },250);
    };
    this.onCredential=event=>{
      if(event.detail?.service==='optima'){
        this.rows=[];this.database=null;this.revision=null;
        this.closeEditor();this.load();
      }
    };
    this.search.addEventListener('input',this.onFilter);
    this.branch.addEventListener('change',this.onFilter);
    window.addEventListener('dashboardx:credential-changed',this.onCredential);
    this.load();
    this.poll=setInterval(()=>{if(!document.hidden&&!this.editId)this.load();},OPTIMA_POLL_MS);
  }

  setStatus(key,values){this.status.textContent=t(key,values);}
  setBranches(){
    const names=[...new Map(this.rows.flatMap(row=>
      Array.isArray(row.schedules)?row.schedules.map(r=>canonicalBranch(r?.branch)).filter(Boolean):[]
    ).map(name=>[normalize(name),name])).values()].sort((a,b)=>a.localeCompare(b,'ru'));
    this.branch.replaceChildren();
    const all=new Option(t('optima.allBranches'),'');
    this.branch.append(all);
    names.forEach(name=>this.branch.append(new Option(name,name)));
    if(names.includes(this.selectedBranch))this.branch.value=this.selectedBranch;
    else if(this.revision!==null){this.selectedBranch='';this.branch.value='';}
    else this.branch.value='';
  }

  async load(){
    const token=getCredential('optima');
    if(!token){
      this.controller?.abort();this.rows=[];this.revision=null;
      this.setStatus('optima.needToken');this.setBranches();this.render();return;
    }
    this.controller?.abort();
    const controller=new AbortController();
    this.controller=controller;const seq=++this.requestId;
    this.setStatus('optima.loading');
    try{
      const result=await loadOptima(controller.signal);
      if(this.destroyed||controller.signal.aborted||this.requestId!==seq)return;
      const changed=this.revision!==result.revision || !this.database;
      this.database=result.data;
      this.rows=result.data.suppliers.filter(x=>x&&typeof x==='object');
      this.revision=result.revision;
      if(changed){
        this.setBranches();
        this.render();
      }
      this.setStatus('optima.connected',{revision:String(this.revision??'—')});
    }catch(error){
      if(this.destroyed||controller.signal.aborted||this.requestId!==seq)return;
      this.setStatus(error.message==='HTTP 401'?'optima.unauthorized':
        error.message==='HTTP 403'?'optima.denied':'optima.offline');
    }finally{
      // Automatic polling remains active; no manual refresh control.
    }
  }

  edit(supplier,mode){
    if(!this.database||!Number.isFinite(Number(this.revision)))return;
    this.editId=supplier.id;this.editMode=mode;
    this.editorTitle.textContent=t(mode==='replace'?'optima.replaceSupplier':'optima.editSupplier');
    this.editorError.textContent='';
    this.editName.value=String(supplier.name||'');
    this.editContact.value=String(supplier.contact||'');
    this.editPhone.value=String(supplier.phone||'');
    this.scheduleEditor.hidden=false;
    this.scheduleRows.replaceChildren();
    for(const row of Array.isArray(supplier.schedules)?supplier.schedules:[])this.makeScheduleRow(row);
    const card=[...this.list.querySelectorAll('details.optima-supplier')].find(
      el=>el.dataset.supplierId===String(supplier.id)
    );
    if(card){
      card.open=true;
      this.expanded.add(String(supplier.id));
      card.querySelector('.optima-supplier-body')?.append(this.editor);
      this.editCard=card;
    }
    this.editor.hidden=false;
    this.editName.focus({preventScroll:true});
  }
  closeEditor(){
    this.editId=null;this.editMode=null;
    this.editor.hidden=true;this.editorError.textContent='';
    this.editorHome.append(this.editor);
    this.editCard=null;
  }
  makeScheduleRow(data){
    const wrapper=document.createElement('div');wrapper.className='optima-edit-schedule';
    for(const name of ['branch','note']){
      const label=document.createElement('label');label.textContent=t('optima.'+name);
      const input=document.createElement('input');input.dataset.field=name;
      input.value=name==='branch'?canonicalBranch(data?.[name]):String(data?.[name]||'');label.append(input);wrapper.append(label);
    }
    for(const name of ['order','delivery']){
      const group=document.createElement('fieldset');group.className='dx-day-fieldset';
      const legend=document.createElement('legend');legend.textContent=name==='order'?'Дни заявки':'Дни поставки';
      group.append(legend);
      const selected=parseDays(data?.[name]);
      const controls=document.createElement('div');controls.className='dx-day-options';controls.dataset.field=name;
      DAYS.forEach((day,i)=>{
        const button=document.createElement('button');button.type='button';
        button.className='dx-day-option';button.dataset.day=DAY_NAMES[i];
        button.textContent=day;button.setAttribute('aria-pressed',String(selected.has(DAY_NAMES[i])));
        button.addEventListener('click',()=>button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true')));
        controls.append(button);
      });
      group.append(controls);wrapper.append(group);
    }
    const remove=document.createElement('button');remove.type='button';
    remove.className='optima-danger';remove.textContent=t('optima.removeSchedule');
    remove.addEventListener('click',()=>wrapper.remove());
    wrapper.append(remove);this.scheduleRows.append(wrapper);
  }
  async saveEdit(){
    if(this.saving||!this.database||!this.editId)return;
    const supplierId=this.editId,mode=this.editMode;
    const values={name:this.editName.value,contact:this.editContact.value,phone:this.editPhone.value};
    values.schedules=[...this.scheduleRows.querySelectorAll('.optima-edit-schedule')].map(row=>{
      const get=k=>row.querySelector('input[data-field="'+k+'"]')?.value||'';
      const days=k=>[...row.querySelectorAll('[data-field="'+k+'"] [aria-pressed="true"]')].map(x=>x.dataset.day).join(', ');
      return {branch:get('branch'),order:days('order'),delivery:days('delivery'),note:get('note')};
    });
    let changes;
    try {changes=prepareSupplierChanges(this.database,supplierId,values,true);}
    catch(error){this.editorError.textContent=t('optima.invalidEdit')+': '+error.message;return;}
    const button=this.widget.querySelector('[data-role="optima-save-edit"]');
    this.saving=true;button.disabled=true;this.editorError.textContent=t('optima.saving');
    try {
      await patchOptima(changes,this.revision);
      this.closeEditor();await this.load();
    } catch(error){
      if(error.status===409){
        this.editorError.textContent=t('optima.conflict');
        // Do not overwrite the user's form; reload only after they dismiss it.
      } else if(error.status===401||error.status===403){
        this.editorError.textContent=t('optima.unauthorized');
      }else this.editorError.textContent=t('optima.saveFailed');
    }finally{this.saving=false;button.disabled=false;}
  }

  async deleteSupplier(supplier){
    if(this.saving||this.editId)return;
    const name=String(supplier.name||'');
    if(!window.confirm('Удалить поставщика «'+name+'»? Это действие затронет список поставщиков.'))return;
    const token=window.prompt('Для удаления повторно введите Admin Token PRO OPTIMA:');
    if(!token)return;
    // Verify the freshly entered token on the server: never trust a client-side password comparison.
    try{
      const res=await fetch(OPTIMA_BASE+'/api/admin/db',{
        method:'GET',headers:{Authorization:'Bearer '+token.trim()},cache:'no-store'
      });
      if(!res.ok)throw new Error(res.status===401?'Неверный пароль администратора':'Не удалось подтвердить права');
      // Refuse deletion if products/orders still refer to this supplier.
      const id=String(supplier.id);
      const products=Array.isArray(this.database?.products)?this.database.products:[];
      const linked=products.some(p=>Array.isArray(p.orderSuppliers)&&p.orderSuppliers.some(l=>
        String(l.supplierId||'')===id || (!l.supplierId&&normalize(l.supplier)===normalize(name))));
      if(linked){window.alert('Поставщик связан с товарами. Сначала удалите или измените эти связи в PRO OPTIMA.');return;}
      const changes={suppliers:this.database.suppliers.filter(x=>String(x.id)!==id)};
      const response=await fetch(OPTIMA_BASE+'/api/admin/db',{
        method:'PATCH',headers:{Authorization:'Bearer '+token.trim(),'Content-Type':'application/json'},
        body:JSON.stringify({baseRevision:Number(this.revision),changes}),cache:'no-store'
      });
      if(!response.ok){
        const result=await response.json().catch(()=>({}));
        throw new Error(result.error||'Ошибка удаления: HTTP '+response.status);
      }
      await this.load();
    }catch(error){window.alert(error.message||String(error));}
  }

  render(){
    // The DOM is authoritative: retain expanded cards even if an API poll
    // or an unrelated filter update would otherwise replace every <details>.
    for(const card of this.list.querySelectorAll('details.optima-supplier[data-supplier-id]')){
      const id=card.dataset.supplierId;
      if(card.open)this.expanded.add(id);else this.expanded.delete(id);
    }
    // Keep the same live form and unsaved input across list rerenders.
    if(this.editor.parentElement!==this.editorHome)this.editorHome.append(this.editor);
    this.editCard=null;
    const filtered=filterOptimaSuppliers(this.rows,this.search.value,this.selectedBranch);
    this.count.textContent=t('optima.found',{count:String(filtered.length),total:String(this.rows.length)});
    this.list.replaceChildren();
    if(!filtered.length){
      const empty=document.createElement('p');
      empty.className='optima-empty';empty.textContent=t('optima.empty');
      this.list.append(empty);return;
    }
    for(const supplier of filtered){
      const card=document.createElement('details');
      card.className='optima-supplier';
      const id=String(supplier.id??supplier.name??'');
      card.dataset.supplierId=id;
      card.open=this.expanded.has(id);
      const heading=document.createElement('summary');
      const title=document.createElement('strong');
      title.textContent=String(supplier.name||'—');
      const sub=document.createElement('span');
      const schedules=Array.isArray(supplier.schedules)?supplier.schedules:[];
      sub.textContent=t('optima.schedules',{count:String(schedules.length)});
      heading.append(title,sub);
      const body=document.createElement('div');body.className='optima-supplier-body';
      if(supplier.contact){
        const row=document.createElement('p');row.textContent=t('optima.contact')+': '+supplier.contact;body.append(row);
      }
      if(supplier.phone){
        const row=document.createElement('p');
        row.textContent=t('optima.phone')+': '+supplier.phone;
        const url=whatsappUrl(supplier.phone);
        if(url){
          const link=document.createElement('a');
          link.href=url;
          link.target='_blank';
          link.rel='noopener noreferrer';
          link.className='dx-whatsapp-link';
          link.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="currentColor"><path d="M20.5 3.5A11.7 11.7 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.2 1.6 6L0 24l6.3-1.7c1.8 1 3.8 1.5 5.8 1.5h.1c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.6-8.4Zm-8.4 18.3c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 0 1-1.5-5.2c0-5.5 4.5-10 10-10 2.7 0 5.2 1 7.1 2.9a9.9 9.9 0 0 1 2.9 7.1c0 5.5-4.5 9.9-10 9.9Zm5.5-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-1.8-.9-3-1.7-4.2-3.8-.3-.5.3-.5.9-1.6.1-.2.1-.4 0-.6l-1-2.3c-.2-.5-.4-.4-.7-.4h-.6c-.2 0-.6.1-.9.5s-1.2 1.2-1.2 2.9 1.2 3.4 1.4 3.6c.2.2 2.3 3.6 5.5 5 2.6 1.1 3.2.9 3.8.8.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.1-1.4-.1-.2-.3-.3-.6-.5Z"/></svg><span>WhatsApp</span>';
          link.setAttribute('aria-label','Написать в WhatsApp: '+supplier.phone);
          link.title='Открыть чат WhatsApp';

          row.append(link);
        }
        body.append(row);
      }
      const visibleSchedules=this.selectedBranch
        ?schedules.filter(row=>normalize(row?.branch)===normalize(this.selectedBranch)):schedules;
      for(const schedule of visibleSchedules){
        const line=document.createElement('div');line.className='optima-schedule';
        const label=document.createElement('strong');label.textContent=String(schedule.branch||'—');
        const order=document.createElement('span');order.textContent=t('optima.order')+': '+String(schedule.order||'—');
        const delivery=document.createElement('span');delivery.textContent=t('optima.delivery')+': '+String(schedule.delivery||'—');
        line.append(label,order,delivery);
        if(schedule.note){
          const note=document.createElement('small');note.textContent=String(schedule.note);line.append(note);
        }
        body.append(line);
      }
      const actions=document.createElement('div');actions.className='optima-supplier-actions';
      for(const [action,label] of [['edit','optima.edit']]){
        const button=document.createElement('button');button.type='button';
        button.textContent=t(label);
        button.addEventListener('click',()=>this.edit(supplier,action));
        actions.append(button);
      }
      const remove=document.createElement('button');remove.type='button';
      remove.className='optima-danger dx-supplier-delete';remove.textContent='Удалить';
      remove.addEventListener('click',()=>this.deleteSupplier(supplier));
      actions.append(remove);
      body.append(actions);
      card.append(heading,body);
      card.addEventListener('toggle',()=>{
        if(card.open)this.expanded.add(id);else this.expanded.delete(id);
      });
      this.list.append(card);
      if(this.editId!==null&&id===String(this.editId)){
        card.open=true;
        body.append(this.editor);
        this.editCard=card;
      }
    }
  }

  destroy(){
    this.destroyed=true;this.controller?.abort();
    clearInterval(this.poll);clearTimeout(this.persistTimer);
    this.search.removeEventListener('input',this.onFilter);
    this.branch.removeEventListener('change',this.onFilter);
    window.removeEventListener('dashboardx:credential-changed',this.onCredential);
    window.removeEventListener('dashboardx:optima-updated',this.onExternalUpdate);
    this.widget.querySelector('[data-role="optima-cancel-edit"]').removeEventListener('click',this.onCancel);
    this.widget.querySelector('[data-role="optima-edit-form"]').removeEventListener('submit',this.onSubmit);
    this.widget.querySelector('[data-role="optima-add-schedule"]').removeEventListener('click',this.onAddSchedule);
  }
}
