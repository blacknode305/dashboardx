import { t } from '../i18n.js';
import { getCredential } from '../CredentialStore.js';
import { loadOptima, patchOptima, OPTIMA_POLL_MS } from '../OptimaAPI.js';
const normalize=value=>String(value??'').trim().toLocaleLowerCase();
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
    const names=[...new Set(this.rows.flatMap(row=>
      Array.isArray(row.schedules)?row.schedules.map(r=>String(r?.branch||'').trim()).filter(Boolean):[]
    ))].sort((a,b)=>a.localeCompare(b,'ru'));
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
    this.scheduleEditor.hidden=mode!=='replace';
    this.scheduleRows.replaceChildren();
    if(mode==='replace')for(const row of Array.isArray(supplier.schedules)?supplier.schedules:[])this.makeScheduleRow(row);
    this.editor.hidden=false;
    this.editName.focus({preventScroll:true});
  }
  closeEditor(){
    this.editId=null;this.editMode=null;
    this.editor.hidden=true;this.editorError.textContent='';
  }
  makeScheduleRow(data){
    const wrapper=document.createElement('div');wrapper.className='optima-edit-schedule';
    const names=['branch','order','delivery','note'];
    for(const name of names){
      const label=document.createElement('label');label.textContent=t('optima.'+name);
      const input=document.createElement('input');
      input.dataset.field=name;input.value=String(data?.[name]||'');
      label.append(input);wrapper.append(label);
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
    if(mode==='replace'){
      values.schedules=[...this.scheduleRows.querySelectorAll('.optima-edit-schedule')].map(row=>{
        const get=k=>row.querySelector('[data-field="'+k+'"]')?.value||'';
        return {branch:get('branch'),order:get('order'),delivery:get('delivery'),note:get('note')};
      });
    }
    let changes;
    try {changes=prepareSupplierChanges(this.database,supplierId,values,mode==='replace');}
    catch(error){this.editorError.textContent=t('optima.invalidEdit')+': '+error.message;return;}
    if(mode==='replace'&&!window.confirm(t('optima.replaceConfirm')))return;
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

  render(){
    // The DOM is authoritative: retain expanded cards even if an API poll
    // or an unrelated filter update would otherwise replace every <details>.
    for(const card of this.list.querySelectorAll('details.optima-supplier[data-supplier-id]')){
      const id=card.dataset.supplierId;
      if(card.open)this.expanded.add(id);else this.expanded.delete(id);
    }
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
          link.textContent='WhatsApp';
          link.setAttribute('aria-label','WhatsApp: '+supplier.phone);
          link.style.marginInlineStart='10px';
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
      for(const [action,label] of [['edit','optima.edit'],['replace','optima.replace']]){
        const button=document.createElement('button');button.type='button';
        button.textContent=t(label);
        button.addEventListener('click',()=>this.edit(supplier,action));
        actions.append(button);
      }
      body.append(actions);
      card.append(heading,body);
      card.addEventListener('toggle',()=>{
        if(card.open)this.expanded.add(id);else this.expanded.delete(id);
      });
      this.list.append(card);
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
