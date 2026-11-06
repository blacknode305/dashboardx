import { getCredential } from '../CredentialStore.js';
import { optimaRequest, OPTIMA_POLL_MS } from '../OptimaAPI.js';

const el=(tag,cls,txt)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=String(txt);
  return node;
};
const LABELS={
  suppliers:'Графики и поставщики',history:'История заявок',stocks:'Остатки',
  offers:'Предложения и цены',supplierCatalog:'Каталог прайс-листов',
  products:'Наименования',transfers:'Перемещения',dateRequests:'Заявки производства',
  settings:'Настройки',dashboardx:'Данные DashboardX',access:'Пароли производства',
  branches:'Реестр филиалов'
};
const meaning=key=>LABELS[key]||key;
const countText=(usage={})=>Object.entries(usage).sort((a,b)=>b[1]-a[1])
  .map(([scope,count])=>meaning(scope)+': '+count).join(' · ');
export default class OptimaBranchesWidget{
  constructor(widget){
    this.widget=widget;this.destroyed=false;this.state=null;this.operation=null;this.preview=null;
    this.search=widget.querySelector('[data-role="branch-search"]');
    this.list=widget.querySelector('[data-role="branch-list"]');
    this.status=widget.querySelector('[data-role="branch-status"]');
    this.duplicates=widget.querySelector('[data-role="branch-duplicates"]');
    this.editor=widget.querySelector('[data-role="branch-editor"]');
    this.form=widget.querySelector('[data-role="branch-form"]');
    this.planBox=widget.querySelector('[data-role="branch-plan"]');
    this.header=widget.querySelector('[data-role="branch-editor-title"]');
    this.explain=widget.querySelector('[data-role="branch-explain"]');
    this.sourceWrap=widget.querySelector('[data-role="branch-source-wrap"]');
    this.targetWrap=widget.querySelector('[data-role="branch-target-wrap"]');
    this.mergeWrap=widget.querySelector('[data-role="branch-merge-wrap"]');
    this.source=this.form.elements.namedItem('source');
    this.target=this.form.elements.namedItem('target');
    this.mergeTarget=this.form.elements.namedItem('mergeTarget');
    this.listeners=[];
    this.listen=(node,event,fn)=>{node?.addEventListener(event,fn);this.listeners.push(()=>node?.removeEventListener(event,fn));};
    this.listen(widget.querySelector('[data-role="branch-add"]'),'click',()=>this.open('add'));
    this.listen(widget.querySelector('[data-role="branch-refresh"]'),'click',()=>this.load());
    this.listen(widget.querySelector('[data-role="branch-close"]'),'click',()=>this.close());
    this.listen(widget.querySelector('[data-role="branch-cancel"]'),'click',()=>this.close());
    this.listen(this.search,'input',()=>this.renderList());
    this.listen(this.form,'submit',e=>{e.preventDefault();this.showPreview();});
    this.listen(this.target,'input',()=>this.clearPreview());
    this.listen(this.mergeTarget,'change',()=>this.clearPreview());
    this.listen(this.list,'click',e=>{
      const button=e.target.closest('button[data-action]');
      if(!button||!this.list.contains(button))return;
      const item=this.filtered?.[Number(button.dataset.index)];
      if(item)this.open(button.dataset.action,item.name);
    });
    this.updated=()=>{if(!this.operation)this.load();};
    window.addEventListener('dashboardx:optima-updated',this.updated);
    this.load();
    this.poll=setInterval(()=>{if(!this.operation)this.load();},OPTIMA_POLL_MS);
  }
  setStatus(text){this.status.textContent=text;}
  async load(){
    if(!getCredential('optima')){this.setStatus('Укажите Admin Token PRO OPTIMA в настройках.');return;}
    const seq=this.seq=(this.seq||0)+1;
    this.setStatus('Загружаю филиалы из PRO OPTIMA…');
    try{
      const state=await optimaRequest('/api/dashboardx/branches',{method:'GET'});
      if(this.destroyed||this.seq!==seq)return;
      this.state=state;
      this.setStatus('PRO OPTIMA · ревизия '+state.revision+' · филиалов: '+state.branches.length);
      this.renderList();
    }catch(error){
      if(this.destroyed||this.seq!==seq)return;
      this.setStatus('Ошибка загрузки: '+error.message+(error.status===404?' · Требуется обновление сервера Railway.':''));
    }
  }
  renderList(){
    const state=this.state;if(!state)return;
    const typed=this.search.value.trim().toLocaleLowerCase('ru');
    const groups=state.groups||[];
    this.duplicates.replaceChildren();
    if(groups.length){
      this.duplicates.hidden=false;
      this.duplicates.append(el('strong','','Возможные дубли филиалов'));
      for(const group of groups){
        const text=el('p','',group.names.join(' / ')+' — всего связанных записей: '+group.records);
        this.duplicates.append(text);
      }
    }else this.duplicates.hidden=true;
    const matching=state.branches.filter(b=>!typed||b.name.toLocaleLowerCase('ru').includes(typed));
    this.filtered=matching;this.list.replaceChildren();
    if(!matching.length){this.list.append(el('p','dx-branches-empty','Филиалы не найдены'));return;}
    for(const [index,b] of matching.entries()){
      const card=el('article','dx-branch-card');
      const heading=el('div','dx-branch-card-title');
      heading.append(el('strong','',b.name));
      const status=el('span','dx-branch-count',String(b.count)+' связей');
      heading.append(status);card.append(heading);
      if(b.registered)card.append(el('small','dx-branch-registered','В реестре'));
      if(b.count)card.append(el('p','dx-branch-usage',countText(b.usage)));
      else card.append(el('p','dx-branch-usage','Связанных записей нет'));
      if(b.examples?.length){
        const detail=el('details','dx-branch-details');
        const summary=el('summary','','Какие данные привязаны');
        detail.append(summary);
        const ul=el('ul');
        for(const example of b.examples)ul.append(el('li','',example));
        detail.append(ul);card.append(detail);
      }
      const actions=el('div','dx-branch-card-actions');
      for(const [action,txt] of [['rename','Изменить'],['merge','Объединить'],['delete','Удалить']]){
        const button=el('button','',txt);button.type='button';
        button.dataset.action=action;button.dataset.index=String(index);
        actions.append(button);
      }
      card.append(actions);this.list.append(card);
    }
  }
  close(){
    this.operation=null;this.preview=null;this.editor.hidden=true;this.planBox.hidden=true;
    this.form.reset();
  }
  open(action,source=''){
    if(!this.state)return;
    this.operation={action,source};
    this.preview=null;this.planBox.hidden=true;this.planBox.replaceChildren();
    this.editor.hidden=false;
    const titles={add:'Добавить филиал',rename:'Переименовать филиал',merge:'Объединить филиалы',delete:'Удалить филиал'};
    this.header.textContent=titles[action]||'Филиал';
    this.sourceWrap.hidden=action==='add';
    this.targetWrap.hidden=action==='delete'||action==='merge';
    this.mergeWrap.hidden=action!=='merge';
    this.source.value=source;
    this.target.required=action==='add'||action==='rename';
    this.target.disabled=action==='delete'||action==='merge';
    this.target.value=action==='rename'?source:'';
    this.mergeTarget.replaceChildren();
    if(action==='merge'){
      const others=this.state.branches.filter(b=>b.name!==source);
      for(const branch of others)this.mergeTarget.append(new Option(branch.name,branch.name));
      if(!others.length){this.setStatus('Нет второго филиала для объединения.');return;}
      const guessed=(this.state.groups||[]).find(g=>g.names.includes(source))?.names.find(x=>x!==source);
      if(guessed)this.mergeTarget.value=guessed;
    }
    const messages={
      add:'Создаётся запись в реестре; связанные данные не затрагиваются.',
      rename:'Изменяется название во всех привязках, включая заявки, остатки, графики и доступы. Сначала проверьте план.',
      merge:'Сведения обоих филиалов сохраняются. Если их графики, пароли или настройки противоречат друг другу, сервер запретит объединение.',
      delete:'Можно удалить только филиал без связанных записей и настроенных доступов.'
    };
    this.explain.textContent=messages[action]||'';
    this.editor.scrollIntoView({block:'nearest'});
    if(action==='add'||action==='rename')this.target.focus({preventScroll:true});
  }
  clearPreview(){
    this.preview=null;this.planBox.hidden=true;this.planBox.replaceChildren();
  }
  async showPreview(){
    if(!this.operation||!this.state)return;
    const {action,source}=this.operation;
    const target=action==='merge'?this.mergeTarget.value:action==='delete'?'':this.target.value.trim();
    const payload={action,source,target,baseRevision:this.state.revision};
    this.clearPreview();
    const button=this.form.querySelector('[data-role="branch-preview"]');
    button.disabled=true;this.setStatus('Проверяю связанные данные…');
    try{
      const preview=await optimaRequest('/api/dashboardx/branches/preview',{method:'POST',body:JSON.stringify(payload)});
      if(this.destroyed||this.operation?.action!==action||this.operation?.source!==source)return;
      this.preview={...payload,previewHash:preview.previewHash};
      this.renderPreview(preview);
      this.setStatus(preview.allowed?'Проверка завершена: можно подтвердить.':'Найдены конфликты. Данные не изменены.');
    }catch(error){this.setStatus('Проверка не выполнена: '+error.message);}
    finally{button.disabled=false;}
  }
  renderPreview(preview){
    this.planBox.replaceChildren();this.planBox.hidden=false;
    this.planBox.append(el('strong','','Предварительный план · изменений: '+preview.changes.total));
    const changed=el('p','dx-branches-hint',countText(preview.changes.bySection));
    this.planBox.append(changed);
    if(preview.changes.collapsedLists||preview.changes.collapsedMaps)
      this.planBox.append(el('p','dx-branches-hint','Совпавших значений в списках: '+preview.changes.collapsedLists+' · ключей: '+preview.changes.collapsedMaps));
    if(preview.changes.examples?.length){
      const details=el('details');details.append(el('summary','','Посмотреть затрагиваемые поля'));
      const ul=el('ul');for(const example of preview.changes.examples)ul.append(el('li','',example));
      details.append(ul);this.planBox.append(details);
    }
    if(preview.conflicts?.length){
      this.planBox.append(el('strong','dx-branches-conflict','Объединение заблокировано: '+preview.conflicts.length+' конфликтов'));
      const ul=el('ul');
      for(const c of preview.conflicts)ul.append(el('li','',c.path+': '+c.reason));
      this.planBox.append(ul);return;
    }
    const label=el('label','dx-branches-confirm');
    const check=el('input');check.type='checkbox';
    label.append(check,document.createTextNode(' Я проверил план переноса данных и подтверждаю изменение базы. Перед записью будут созданы резервные копии.'));
    this.planBox.append(label);
    const apply=el('button','dx-branches-apply','Подтвердить и сохранить');
    apply.type='button';apply.disabled=true;this.planBox.append(apply);
    check.addEventListener('change',()=>apply.disabled=!check.checked);
    apply.addEventListener('click',()=>this.apply(apply));
  }
  async apply(button){
    if(!this.preview||!this.state)return;
    const payload=this.preview;
    button.disabled=true;this.setStatus('Сохраняю изменения с резервной копией…');
    try{
      const response=await optimaRequest('/api/dashboardx/branches/apply',{method:'POST',body:JSON.stringify(payload)});
      this.close();
      window.dispatchEvent(new CustomEvent('dashboardx:optima-updated',{detail:{revision:response.revision}}));
      await this.load();
      this.setStatus('Филиалы обновлены · ревизия '+response.revision+'. Резервная копия создана.');
    }catch(error){
      this.setStatus('Ничего не подтверждено: '+error.message);
      button.disabled=false;
    }
  }
  destroy(){
    this.destroyed=true;clearInterval(this.poll);
    window.removeEventListener('dashboardx:optima-updated',this.updated);
    for(const fn of this.listeners)fn();
  }
}
