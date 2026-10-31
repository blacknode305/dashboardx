// DashboardX widget tables: sort data by clicking column titles.
// Preserves row nodes (and their event listeners) and the existing resize grips.
// The approved Suppliers widget is deliberately excluded.
const EXCLUDED=new Set(['optimaSuppliers','add']);
const collator=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
const emptyValue=value=>!value||/^(—|–|-|\?|нет данных|n\/a)$/i.test(value);
const numberValue=value=>{
  const cleaned=value.replace(/[\u00a0\u202f]/g,' ').trim();
  if(!/^[-+]?\d[\d\s]*(?:[.,]\d+)?\s*(?:[₸$€%]|руб\.?|тг\.?|шт\.?|кг|г|л|м|км)?$/i.test(cleaned))return null;
  const numeric=Number(cleaned.replace(/(?:[₸$€%]|руб\.?|тг\.?|шт\.?|кг|г|л|м|км)\s*$/i,'').replace(/\s/g,'').replace(',','.'));
  return Number.isFinite(numeric)?numeric:null;
};
const dateValue=value=>{
  if(/^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(value)){
    const timestamp=Date.parse(value);
    return Number.isFinite(timestamp)?timestamp:null;
  }
  const found=/^(\d{2})\.(\d{2})\.(\d{4})(?:\s.*)?$/.exec(value);
  if(!found)return null;
  const timestamp=Date.parse(found[3]+'-'+found[2]+'-'+found[1]);
  return Number.isFinite(timestamp)?timestamp:null;
};
const cellValue=cell=>{
  if(!cell)return '';
  return String(cell.dataset.sortValue??cell.textContent??'').replace(/\s+/g,' ').trim();
};
const compareText=(a,b)=>{
  const missingA=emptyValue(a),missingB=emptyValue(b);
  if(missingA||missingB)return missingA===missingB?0:missingA?1:-1;
  const dateA=dateValue(a),dateB=dateValue(b);
  if(dateA!==null&&dateB!==null)return dateA-dateB;
  const numberA=numberValue(a),numberB=numberValue(b);
  if(numberA!==null&&numberB!==null)return numberA-numberB;
  return collator.compare(a,b);
};

export default function installTableSort(canvas,store){
  if(!canvas||typeof MutationObserver!=='function')return ()=>{};
  let disposed=false,scheduled=false;
  const installed=new WeakMap();
  const instances=new Set();

  const tableKey=(table,widget)=>{
    const index=[...widget.querySelectorAll('table')].indexOf(table);
    return table.dataset.tableSortKey||table.dataset.tableResizeKey||table.id||'table-'+index;
  };
  const savedSort=(widget,key)=>store?.getWidgetState(widget.instanceId)?.tableSort?.[key]||null;
  const persist=(instance)=>{
    const {widget,key,sort}=instance;
    if(!store?.getInstance(widget.instanceId))return;
    const states={...(store.getWidgetState(widget.instanceId)?.tableSort||{})};
    if(sort)states[key]={column:sort.column,label:sort.label,direction:sort.direction};
    else delete states[key];
    store.updateWidgetState(widget.instanceId,{tableSort:states});
  };
  const bodyRows=table=>{
    const tbody=table.tBodies.length===1?table.tBodies[0]:null;
    if(!tbody)return [];
    return [...tbody.children].filter(row=>row.tagName==='TR');
  };
  const apply=(instance)=>{
    const {table,headers,sort}=instance;
    if(!table.isConnected)return;
    const rows=bodyRows(table);
    if(!instance.body||instance.body!==table.tBodies[0]||
      rows.length!==instance.originalOrder.size||rows.some(row=>!instance.originalOrder.has(row))){
      instance.body=table.tBodies[0];
      instance.originalOrder=new Map(rows.map((row,index)=>[row,index]));
    }
    if(!sort||rows.length<2)return;
    const column=sort.column;
    // Do not reorder rows with merged cells or unexpected column structures.
    if(rows.some(row=>row.cells.length!==headers.length||
      [...row.cells].some(cell=>cell.colSpan!==1||cell.rowSpan!==1)))return;
    const original=instance.originalOrder;
    const decorated=rows.map(row=>({row,value:cellValue(row.cells[column])}));
    decorated.sort((a,b)=>{
      const missingA=emptyValue(a.value),missingB=emptyValue(b.value);
      if(missingA!==missingB)return missingA?1:-1;
      const compared=compareText(a.value,b.value);
      return (sort.direction==='asc'?compared:-compared)||
        original.get(a.row)-original.get(b.row);
    });
    if(decorated.every((item,index)=>item.row===rows[index]))return;
    table.tBodies[0].append(...decorated.map(item=>item.row));
  };
  const updateHeaders=instance=>{
    const {headers,buttons,sort}=instance;
    headers.forEach((header,index)=>{
      const active=sort?.column===index;
      const direction=active?sort.direction:null;
      header.setAttribute('aria-sort',direction==='asc'?'ascending':direction==='desc'?'descending':'none');
      const button=buttons[index];
      if(!button)return;
      button.dataset.sortDirection=direction||'none';
      const arrow=button.querySelector('.dx-table-sort-arrow');
      if(arrow)arrow.textContent=direction==='asc'?'↑':direction==='desc'?'↓':'↕';
      button.title='Сортировка: '+(direction==='asc'?'по возрастанию':direction==='desc'?'по убыванию':'нажмите для сортировки');
    });
  };
  const enhance=table=>{
    if(installed.has(table))return;
    const widget=table.closest('widget-element');
    if(!widget||EXCLUDED.has(widget.templateId))return;
    const headerRows=table.tHead?.rows;
    if(!headerRows||headerRows.length!==1||table.tBodies.length!==1)return;
    const headers=[...headerRows[0].cells];
    if(headers.length<2||headers.some(th=>th.tagName!=='TH'||th.colSpan!==1||th.rowSpan!==1))return;
    if(headers.some(th=>th.querySelector('button:not(.dx-table-col-grip):not(.dx-product-col-grip),input,select,textarea')))return;
    if(!table.tBodies[0])return;
    const key=tableKey(table,widget);
    const existing=savedSort(widget,key);
    const labels=headers.map(th=>[...th.childNodes].filter(node=>!(node.nodeType===1&&
      node.matches('.dx-table-col-grip,.dx-product-col-grip'))).map(node=>node.textContent).join(' ').trim());
    const instance={table,widget,key,headers,labels,buttons:[],sort:null,
      body:table.tBodies[0],originalOrder:new Map(bodyRows(table).map((row,index)=>[row,index]))};
    if(existing&&Number.isInteger(existing.column)&&existing.column>=0&&
      existing.column<labels.length&&labels[existing.column]===existing.label&&
      ['asc','desc'].includes(existing.direction)){
      instance.sort={column:existing.column,label:existing.label,direction:existing.direction};
    }
    headers.forEach((header,index)=>{
      const label=labels[index];
      if(!label||/^(действия|actions|управление)$/i.test(label)){
        instance.buttons.push(null);return;
      }
      const button=document.createElement('button');
      button.type='button';button.className='dx-table-sort-button';
      button.setAttribute('aria-label','Сортировать по колонке «'+label+'»');
      const arrow=document.createElement('span');
      arrow.className='dx-table-sort-arrow';arrow.setAttribute('aria-hidden','true');
      // Move existing label nodes, not resize grips or interactive controls.
      const content=[...header.childNodes].filter(node=>!(node.nodeType===1&&
        node.matches('.dx-table-col-grip,.dx-product-col-grip')));
      content.forEach(node=>button.append(node));
      button.append(arrow);
      header.prepend(button);
      button.addEventListener('click',()=>{
        const prior=instance.sort;
        instance.sort=prior?.column===index?
          (prior.direction==='asc'?{column:index,label,direction:'desc'}:
            prior.direction==='desc'?null:{column:index,label,direction:'asc'}):
          {column:index,label,direction:'asc'};
        if(!instance.sort){
          const rows=bodyRows(table);
          const original=[...rows].sort((a,b)=>
            (instance.originalOrder.get(a)??0)-(instance.originalOrder.get(b)??0));
          if(original.some((row,i)=>row!==rows[i]))table.tBodies[0].append(...original);
        }else apply(instance);
        updateHeaders(instance);
        persist(instance);
      });
      instance.buttons.push(button);
    });
    installed.set(table,instance);
    instances.add(instance);
    table.classList.add('dx-table-sortable');
    updateHeaders(instance);
    apply(instance);
  };
  const scan=()=>{
    scheduled=false;
    if(disposed)return;
    for(const table of canvas.querySelectorAll('widget-element table')){
      enhance(table);
      const instance=installed.get(table);
      if(instance)apply(instance);
    }
    for(const instance of instances){
      if(!instance.table.isConnected)instances.delete(instance);
    }
  };
  const observer=new MutationObserver(()=>{
    if(scheduled||disposed)return;
    scheduled=true;queueMicrotask(scan);
  });
  observer.observe(canvas,{childList:true,subtree:true});
  scan();
  return ()=>{
    disposed=true;observer.disconnect();instances.clear();
  };
}
