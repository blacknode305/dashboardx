// Standalone printable reports for DashboardX Optima. No backend requests or external assets.
const append=(parent,tag,text,klass)=>{
  const element=parent.ownerDocument.createElement(tag);
  if(klass)element.className=klass;
  if(text!==undefined&&text!==null)element.textContent=String(text);
  parent.append(element);
  return element;
};
const baseCSS=`
:root{color-scheme:light}*{box-sizing:border-box}
html,body{margin:0;background:#e9edef;color:#20252a;font:12px/1.45 Arial,Helvetica,sans-serif}
.print-tools{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 16px;background:#25323c;color:#fff;box-shadow:0 4px 18px #0003}
.print-tools strong{margin-right:auto;font-size:13px}
.print-tools label{display:inline-flex;gap:5px;align-items:center}
.print-tools select,.print-tools button{min-height:34px;padding:6px 10px;border:1px solid #a1aeb9;border-radius:5px;font:inherit}
.print-tools button{cursor:pointer;font-weight:bold;background:#f2f5f7}
.print-tools input{accent-color:#6e9bbc}
.print-preview{margin:16px auto 26px;max-width:calc(100% - 20px);overflow-x:auto}
.print-sheet{width:210mm;min-height:160mm;margin:auto;padding:12mm;background:#fff;box-shadow:0 6px 22px #0002}
.print-sheet.a4.landscape{width:297mm}
.print-sheet.a3.portrait{width:297mm}
.print-sheet.a3.landscape{width:420mm}
.print-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 12px;padding:0 0 12px;border-bottom:2px solid #303941}
.print-head h1{margin:0;font-size:20px;line-height:1.2}
.print-head small{color:#697580}
.print-filter-tags{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;padding:0 0 11px;border-bottom:1px solid #dde3e7}
.print-filter-tags span{padding:4px 7px;background:#f1f3f4;border-radius:3px;color:#4e5962}
.print-count{margin:0 0 10px;color:#5c6872}
.print-supplier{margin:0 0 10px;border:1px solid #cbd3d9;border-radius:5px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.print-supplier-title{padding:8px 10px;background:#edf1f3;font-size:13px;font-weight:700;border-bottom:1px solid #d1d9dd}
.print-supplier-info{padding:7px 10px;display:flex;gap:14px;flex-wrap:wrap;color:#4a5561}
.print-grid{width:100%;border-collapse:collapse;table-layout:fixed}
.print-grid th,.print-grid td{border:1px solid #cdd5db;padding:7px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.print-grid th{background:#e9eef0;font-weight:700}
.print-names th:nth-child(1){width:10%}.print-names th:nth-child(2){width:39%}
.print-names th:nth-child(3){width:14%}.print-names th:nth-child(4){width:37%}
.print-grid tbody tr:nth-child(even){background:#f7f8f9}
.print-grid thead{display:table-header-group}
.print-grid tr{break-inside:avoid;page-break-inside:avoid}
.print-empty{border:1px dashed #cdd5db;padding:15px;color:#64717c}
@media print{
 html,body{background:white!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .print-tools{display:none!important}
 .print-preview{max-width:none;margin:0;overflow:visible}
 .print-sheet,.print-sheet.a4.landscape,.print-sheet.a3.portrait,.print-sheet.a3.landscape{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
}
`;

export function openOptimaPrintPreview({kind,title,filters=[],rows=[]}){
  // Opening synchronously from the click avoids popup blockers.
  const popup=window.open('','_blank','width=1040,height=820');
  if(!popup){window.alert('Окно печати заблокировано браузером. Разрешите всплывающие окна для DashboardX.');return false;}
  const doc=popup.document;
  doc.open();
  doc.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Печать — DashboardX</title></head><body></body></html>');
  doc.close();
  append(doc.head,'style',baseCSS);
  const dynamicCSS=append(doc.head,'style','');
  const bar=append(doc.body,'div',undefined,'print-tools');
  append(bar,'strong','DashboardX · Печать');
  const field=(label,options)=>{
    const wrapper=append(bar,'label',label);
    const input=append(wrapper,'select');
    options.forEach(([value,name])=>{const option=append(input,'option',name);option.value=value;});
    return input;
  };
  const paper=field('Бумага',[['A4','A4'],['A3','A3']]);
  const direction=field('Ориентация',[['auto','Авто'],['portrait','Книжная'],['landscape','Альбомная']]);
  const metaLabel=append(bar,'label');
  const showFilters=append(metaLabel,'input');showFilters.type='checkbox';showFilters.checked=true;
  append(metaLabel,'span','Показать фильтры');
  let expandAll=null;
  if(kind==='suppliers'){
    const expandLabel=append(bar,'label');
    expandAll=append(expandLabel,'input');expandAll.type='checkbox';expandAll.checked=true;
    append(expandLabel,'span','Раскрыть все');
  }
  const print=append(bar,'button','Печать / PDF');print.type='button';
  const close=append(bar,'button','Закрыть');close.type='button';
  const preview=append(doc.body,'main',undefined,'print-preview');
  const sheet=append(preview,'article',undefined,'print-sheet');
  const syncPage=()=>{
    const actualDirection=direction.value==='auto'?(kind==='products'?'landscape':'portrait'):direction.value;
    sheet.className='print-sheet '+paper.value.toLowerCase()+' '+actualDirection;
    dynamicCSS.textContent='@page{size:'+paper.value+' '+actualDirection+';margin:12mm}';
  };
  const draw=()=>{
    syncPage();
    sheet.replaceChildren();
    const header=append(sheet,'header',undefined,'print-head');
    append(header,'h1',title);
    append(header,'small',new Date().toLocaleString('ru-RU'));
    if(showFilters.checked&&filters.length){
      const line=append(sheet,'div',undefined,'print-filter-tags');
      filters.filter(([,v])=>String(v||'').trim()).forEach(([k,v])=>append(line,'span',k+': '+v));
    }
    append(sheet,'div','Записей: '+rows.length,'print-count');
    if(!rows.length){append(sheet,'p','Нет записей для выбранных условий','print-empty');return;}
    if(kind==='suppliers'){
      for(const supplier of rows){
        const section=append(sheet,'section',undefined,'print-supplier');
        append(section,'div',supplier.name,'print-supplier-title');
        if(!expandAll.checked&&!supplier.expanded)continue;
        if(supplier.contact||supplier.phone){
          const details=append(section,'div',undefined,'print-supplier-info');
          if(supplier.contact)append(details,'span','Контакт: '+supplier.contact);
          if(supplier.phone)append(details,'span','Телефон: '+supplier.phone);
        }
        const table=append(section,'table',undefined,'print-grid');
        const hr=append(append(table,'thead'),'tr');
        ['Филиал','Заявка','Поставка','Примечание'].forEach(h=>append(hr,'th',h));
        const body=append(table,'tbody');
        if(!supplier.schedules.length){
          const td=append(append(body,'tr'),'td','Нет подходящих графиков');td.colSpan=4;
        }else for(const schedule of supplier.schedules){
          const tr=append(body,'tr');
          [schedule.branch,schedule.order,schedule.delivery,schedule.note].forEach(v=>append(tr,'td',v||'—'));
        }
      }
    }else{
      const table=append(sheet,'table',undefined,'print-grid print-names');
      const hr=append(append(table,'thead'),'tr');
      ['ID','Наименование сырья','Единица','Поставщики'].forEach(h=>append(hr,'th',h));
      const body=append(table,'tbody');
      for(const item of rows){
        const tr=append(body,'tr');
        [item.id,item.name,item.unit,item.suppliers].forEach(v=>append(tr,'td',v??'—'));
      }
    }
  };
  [paper,direction,showFilters,expandAll].filter(Boolean).forEach(el=>el.addEventListener('change',draw));
  print.addEventListener('click',()=>{syncPage();popup.focus();popup.print();});
  close.addEventListener('click',()=>popup.close());
  draw();popup.focus();return true;
}
