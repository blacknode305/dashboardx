import { t } from '../i18n.js';
import { getCredential } from '../CredentialStore.js';

const API='https://pro-optima-production.up.railway.app/api/admin/db';
const POLL_MS=90000;
const normalize=value=>String(value??'').trim().toLocaleLowerCase();
export function filterOptimaSuppliers(suppliers,search,branch){
  const query=normalize(search),required=normalize(branch);
  return suppliers.filter(s=>{
    const schedules=Array.isArray(s.schedules)?s.schedules:[];
    const branchMatches=!required||schedules.some(row=>normalize(row?.branch)===required);
    const textMatches=!query||[s.name,s.contact,s.phone].some(v=>normalize(v).includes(query));
    return branchMatches&&textMatches;
  });
}

export default class OptimaSuppliersWidget {
  constructor(widget){
    this.widget=widget;this.store=window.dashboardxStore;
    this.id=widget.instanceId;this.destroyed=false;
    this.rows=[];this.revision=null;this.requestId=0;
    const state=this.store?.getWidgetState(this.id)||{};
    this.search=widget.querySelector('[data-role="optima-search"]');
    this.branch=widget.querySelector('[data-role="optima-branch"]');
    this.status=widget.querySelector('[data-role="optima-status"]');
    this.count=widget.querySelector('[data-role="optima-count"]');
    this.list=widget.querySelector('[data-role="optima-list"]');
    this.refreshButton=widget.querySelector('[data-role="optima-refresh"]');
    this.search.value=typeof state.search==='string'?state.search:'';
    this.selectedBranch=typeof state.branch==='string'?state.branch:'';
    this.expanded=new Set();
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
        this.rows=[];this.revision=null;
        this.load();
      }
    };
    this.onRefresh=()=>this.load();
    this.search.addEventListener('input',this.onFilter);
    this.branch.addEventListener('change',this.onFilter);
    this.refreshButton.addEventListener('click',this.onRefresh);
    window.addEventListener('dashboardx:credential-changed',this.onCredential);
    this.load();
    this.poll=setInterval(()=>{if(!document.hidden)this.load();},POLL_MS);
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
    else {this.selectedBranch='';this.branch.value='';}
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
    this.refreshButton.disabled=true;
    this.setStatus('optima.loading');
    try{
      const response=await fetch(API,{
        headers:{Authorization:'Bearer '+token},
        cache:'no-store',signal:controller.signal
      });
      if(!response.ok)throw new Error('HTTP '+response.status);
      const result=await response.json();
      if(!Array.isArray(result.data?.suppliers))throw new Error('Unexpected database format');
      if(this.destroyed||controller.signal.aborted||this.requestId!==seq)return;
      this.rows=result.data.suppliers.filter(x=>x&&typeof x==='object');
      this.revision=result.revision;
      this.setBranches();
      this.render();
      this.setStatus('optima.connected',{revision:String(this.revision??'—')});
    }catch(error){
      if(this.destroyed||controller.signal.aborted||this.requestId!==seq)return;
      this.setStatus(error.message==='HTTP 401'?'optima.unauthorized':
        error.message==='HTTP 403'?'optima.denied':'optima.offline');
    }finally{
      if(!this.destroyed&&this.requestId===seq)this.refreshButton.disabled=false;
    }
  }

  render(){
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
        const row=document.createElement('p');row.textContent=t('optima.phone')+': '+supplier.phone;body.append(row);
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
    this.refreshButton.removeEventListener('click',this.onRefresh);
    window.removeEventListener('dashboardx:credential-changed',this.onCredential);
  }
}
