// Shared resizing for conventional HTML tables inside DashboardX widgets.
// The approved Suppliers widget and Names' existing resizer are deliberately excluded.
// No table cells are recreated; dynamic redraws are handled through a MutationObserver.
const MIN_WIDTH=48;
const MAX_WIDTH=720;
const EXCLUDED=new Set(['optimaSuppliers','optimaProducts']);

const clamp=(width,fallback=120)=>{
  const value=Number(width);
  return Number.isFinite(value)&&value>=MIN_WIDTH&&value<=MAX_WIDTH
    ?Math.round(value):fallback;
};

export default function installTableColumnResize(canvas,store){
  if(!canvas||typeof MutationObserver!=='function')return ()=>{};
  const installed=new WeakSet();
  let disposed=false;
  let scheduled=false;
  const cleanupDrag=new Set();

  const columnId=table=>{
    const widget=table.closest('widget-element');
    const list=[...widget.querySelectorAll('table')];
    // A stable, explicit key can be provided by future widgets with many tables.
    const key=table.dataset.tableResizeKey||table.id||'table-'+list.indexOf(table);
    return {widget,key};
  };

  const saveWidths=(widget,key,widths)=>{
    if(!store?.getInstance(widget.instanceId))return;
    const previous=store.getWidgetState(widget.instanceId)?.tableResizeWidths||{};
    store.updateWidgetState(widget.instanceId,{
      tableResizeWidths:{...previous,[key]:widths.slice()}
    });
  };

  const enhance=table=>{
    if(installed.has(table))return;
    if(table.closest('widget-element')?.dataset.widgetType==='add')return;
    const {widget,key}=columnId(table);
    if(!widget||EXCLUDED.has(widget.templateId))return;
    // Existing product-column grips belong to a separate, approved implementation.
    if(table.classList.contains('dx-product-resizable'))return;
    const headers=[...table.querySelectorAll(':scope > thead > tr:first-child > th')];
    if(headers.length<2||headers.some(th=>th.colSpan>1||th.rowSpan>1))return;
    if(table.querySelector('thead th .dx-table-col-grip'))return;

    const saved=store?.getWidgetState(widget.instanceId)?.tableResizeWidths?.[key];
    const defaults=headers.map(th=>clamp(
      Math.round(th.getBoundingClientRect().width)||Math.max(96,Math.min(205,th.textContent.trim().length*8+34))
    ));
    const widths=defaults.map((width,i)=>clamp(saved?.[i],width));
    const colgroup=document.createElement('colgroup');
    const cols=widths.map(()=>document.createElement('col'));
    cols.forEach(col=>colgroup.append(col));
    const sync=()=>{
      widths.forEach((width,i)=>{cols[i].style.width=width+'px';});
      table.style.width=widths.reduce((sum,width)=>sum+width,0)+'px';
    };

    // Do not replace header labels or body rows: filtering, links and inputs stay intact.
    table.prepend(colgroup);
    table.classList.add('dx-table-adjustable');
    headers.forEach((header,i)=>{
      const grip=document.createElement('button');
      grip.type='button';
      grip.className='dx-table-col-grip';
      grip.title='Перетащить границу; стрелки ←/→; двойной клик — исходная ширина';
      grip.setAttribute('aria-label','Изменить ширину столбца «'+header.textContent.trim()+'»');
      const setWidth=(value,persist=false)=>{
        widths[i]=Math.max(MIN_WIDTH,Math.min(MAX_WIDTH,Math.round(value)));
        sync();
        if(persist)saveWidths(widget,key,widths);
      };
      grip.addEventListener('pointerdown',event=>{
        if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0))return;
        event.stopPropagation();event.preventDefault();
        const x=event.clientX,start=widths[i],id=event.pointerId;
        const move=e=>{
          if(e.pointerId!==id)return;
          setWidth(start+e.clientX-x);
        };
        const stop=e=>{
          if(e.pointerId!==id)return;
          disposeDrag();
          saveWidths(widget,key,widths);
        };
        const disposeDrag=()=>{
          window.removeEventListener('pointermove',move);
          window.removeEventListener('pointerup',stop);
          window.removeEventListener('pointercancel',stop);
          cleanupDrag.delete(disposeDrag);
        };
        cleanupDrag.add(disposeDrag);
        window.addEventListener('pointermove',move);
        window.addEventListener('pointerup',stop);
        window.addEventListener('pointercancel',stop);
      });
      grip.addEventListener('keydown',event=>{
        if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
        event.stopPropagation();event.preventDefault();
        const step=event.shiftKey?25:10;
        setWidth(widths[i]+(event.key==='ArrowRight'?step:-step),true);
      });
      grip.addEventListener('dblclick',event=>{
        event.stopPropagation();event.preventDefault();
        setWidth(defaults[i],true);
      });
      header.append(grip);
    });
    installed.add(table);
    sync();
  };

  const scan=()=>{
    scheduled=false;
    if(disposed)return;
    for(const table of canvas.querySelectorAll('widget-element table')){
      enhance(table);
    }
  };
  const observer=new MutationObserver(()=>{
    if(scheduled||disposed)return;
    scheduled=true;
    queueMicrotask(scan);
  });
  observer.observe(canvas,{childList:true,subtree:true});
  scan();
  return ()=>{
    disposed=true;observer.disconnect();
    cleanupDrag.forEach(fn=>fn());
    cleanupDrag.clear();
  };
}
