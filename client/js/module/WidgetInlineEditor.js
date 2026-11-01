// Small, non-modal editor window owned by a DashboardX widget.
// It stays inside the widget body and does not make the rest of the dashboard inert.
export function attachWidgetInlineEditor(widget, form, {title='Редактор', kind='', onClose, host=widget.body}={}){
  if(!widget?.body||!form)throw new Error('Не удалось создать окно редактора');
  const pane=document.createElement('section');
  pane.className='dx-widget-inline-editor'+(kind?' dx-widget-inline-editor-'+kind:'');
  pane.setAttribute('role','dialog');
  pane.setAttribute('aria-modal','false');
  pane.setAttribute('aria-label',title);
  pane.hidden=true;

  const bar=document.createElement('div');
  bar.className='dx-widget-inline-editor-bar';
  const label=document.createElement('strong');
  label.textContent=title;
  const minimize=document.createElement('button');
  minimize.type='button';
  minimize.className='dx-widget-inline-editor-minimize';
  minimize.textContent='−';
  minimize.title='Свернуть окно';
  minimize.setAttribute('aria-label','Свернуть окно');
  const close=document.createElement('button');
  close.type='button';
  close.className='dx-widget-inline-editor-close';
  close.textContent='×';
  close.title='Закрыть окно';
  close.setAttribute('aria-label','Закрыть окно');
  const content=document.createElement('div');
  content.className='dx-widget-inline-editor-content';
  content.append(form);
  bar.append(label,minimize,close);
  pane.append(bar,content);
  host.append(pane);

  const hide=()=>{pane.hidden=true;};
  const requestClose=()=>{
    if(typeof onClose==='function')onClose();
    else hide();
  };
  const open=()=>{
    pane.hidden=false;
    pane.classList.remove('is-minimized');
    content.hidden=false;
    minimize.textContent='−';
    minimize.title='Свернуть окно';
    minimize.setAttribute('aria-label','Свернуть окно');
    // Keep the window in the body after dashboard filters re-render.
    if(pane.parentElement!==host)host.append(pane);
    widget.activate?.();
    content.scrollTop=0;
  };
  const beginDrag=event=>{
    if(event.button!==0||event.target.closest('button,input,select,textarea,a'))return;
    event.preventDefault();
    const parent=widget.body;
    const startX=event.clientX,startY=event.clientY;
    const oldLeft=pane.offsetLeft,oldTop=pane.offsetTop;
    const pointerId=event.pointerId;
    bar.setPointerCapture?.(pointerId);
    const move=e=>{
      if(e.pointerId!==pointerId)return;
      const maxX=Math.max(7,parent.clientWidth-pane.offsetWidth-7);
      const maxY=Math.max(7,parent.clientHeight-42);
      pane.style.left=Math.max(7,Math.min(maxX,oldLeft+e.clientX-startX))+'px';
      pane.style.top=Math.max(7,Math.min(maxY,oldTop+e.clientY-startY))+'px';
    };
    const stop=e=>{
      if(e.pointerId!==pointerId)return;
      bar.removeEventListener('pointermove',move);
      bar.removeEventListener('pointerup',stop);
      bar.removeEventListener('pointercancel',stop);
      if(bar.hasPointerCapture?.(pointerId))bar.releasePointerCapture(pointerId);
    };
    bar.addEventListener('pointermove',move);
    bar.addEventListener('pointerup',stop);
    bar.addEventListener('pointercancel',stop);
  };
  const keydown=event=>{
    if(event.key==='Escape'){
      event.stopPropagation();
      event.preventDefault();
      requestClose();
    }
  };
  bar.addEventListener('pointerdown',beginDrag);
  close.addEventListener('click',requestClose);
  const toggleMinimize=()=>{
    const minimized=pane.classList.toggle('is-minimized');
    content.hidden=minimized;
    minimize.textContent=minimized?'▢':'−';
    minimize.title=minimized?'Развернуть окно':'Свернуть окно';
    minimize.setAttribute('aria-label',minimize.title);
  };
  minimize.addEventListener('click',toggleMinimize);
  pane.addEventListener('keydown',keydown);
  return {
    element:pane,open,hide,
    setTitle(value){const name=String(value||title);label.textContent=name;pane.setAttribute('aria-label',name);},
    destroy(){
      bar.removeEventListener('pointerdown',beginDrag);
      close.removeEventListener('click',requestClose);
      minimize.removeEventListener('click',toggleMinimize);
      pane.removeEventListener('keydown',keydown);
      pane.remove();
    }
  };
}
