import { t, widgetTitle } from './i18n.js';

export default class WidgetBase extends HTMLElement {
  static zIndexCounter = 10;

  // HTMLElement constructors must not attach attributes/children before upgrade.
  // Configure the element after document.createElement('widget-element').
  constructor() {
    super();
  }

  initialize(config) {
    if (this._initialized) throw new Error('Widget already initialized');
    this._initialized=true;
    this.instanceId=config.instanceId || config.id + '-widget';
    this.id=this.instanceId;
    this.workspaceId=config.workspaceId || 'home';
    this.legacyKey=config.legacyKey || null;
    this.templateId=config.id;
    this.category=config.category || 'other';
    this.dataset.widgetType=this.templateId;
    this.className='widget--element ' + this.category + '--widget';
    this.tabIndex = -1; // An active window can receive keyboard focus without altering tab order.
    this.storageKey='dashboardx.layout.' + this.workspaceId + '.' + this.instanceId;
    this.styleData=this.readStyle();
    this.restoreLayout();
    this.buildHeader();
    this.buildResizeHandle();
  }

  readStyle() {
    try {
      const value = localStorage.getItem(this.storageKey) ||
        (this.legacyKey ? localStorage.getItem(this.legacyKey) : null);
      const parsed = value ? JSON.parse(value) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.warn('Widget layout could not be read:', error);
      return {};
    }
  }

  restoreLayout() {
    const saved = this.styleData;
    // Reject legacy negative layout coordinates without deleting the saved layout.
    // No part of a widget may be positioned above/left of the workspace origin.
    const top = saved.top ? Number.parseFloat(saved.top) : 50;
    const left = saved.left ? Number.parseFloat(saved.left) : 0;
    this.style.top = Math.max(0, Number.isFinite(top) ? top : 50) + 'px';
    this.style.left = Math.max(0, Number.isFinite(left) ? left : 0) + 'px';
    if (saved.width) this.style.width = saved.width;
    if (saved.height) this.style.height = saved.height;
    if (saved.pinned) this.classList.add('is-pinned');
    if (saved.favorite) this.classList.add('is-favorite');
    if (saved.hidden) this.classList.add('is-hidden');
    if (saved.hidden) this.style.display = 'none';
  }

  saveWidget() {
    const data = {
      top: this.style.top,
      left: this.style.left,
      width: this.style.width || '',
      height: this.style.height || '',
      pinned: this.classList.contains('is-pinned'),
      hidden: this.classList.contains('is-hidden'),
      favorite: this.classList.contains('is-favorite')
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      this.styleData = data;
    } catch (error) { console.warn('Widget layout could not be saved:', error); }
  }

  makeButton(symbol, titleKey, handler, extra = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'window-action ' + extra;
    btn.textContent = symbol;
    btn.title = t(titleKey);
    btn.setAttribute('aria-label', t(titleKey));
    btn.addEventListener('click', event => {
      event.stopPropagation();
      handler();
    });
    return btn;
  }

  buildHeader() {
    this.header = document.createElement('div');
    this.header.className = 'widget--element--header';
    this.header.title = t('ui.frameResize');

    const heading = document.createElement('div');
    heading.className = 'window-heading';
    const name = document.createElement('strong');
    name.className = 'window-title';
    name.textContent = widgetTitle(this.templateId, this.templateId);
    heading.append(name);
    if (this.templateId !== 'add') {
      const id = document.createElement('small');
      id.className = 'window-id';
      id.textContent = this.instanceId;
      heading.append(id);
    }
    this.header.append(heading);

    const actions = document.createElement('div');
    actions.className = 'window-actions';
    if (this.templateId !== 'add') {
      actions.append(
        this.makeButton('⤓', 'ui.frameSave', () => this.saveWidget(), 'window-save'),
        this.makeButton('↗', 'ui.frameShare', () => this.toggleWorkplace(), 'window-share'),
        this.makeButton('☆', 'ui.frameFavorite', () => this.toggleFavorite(), 'window-favorite'),
        this.makeButton('⌖', 'ui.framePin', () => this.togglePinned(), 'window-pin'),
        this.makeButton('−', 'ui.frameHide', () => this.toggleHidden(), 'window-hide')
      );
    }
    actions.append(
      this.makeButton('▢', 'ui.frameExpand', () => this.toggleMaximized(), 'window-expand')
    );
    if (this.templateId !== 'add') {
      actions.append(this.makeButton('×', 'ui.frameClose', () => this.closeWidget(), 'window-close'));
    }
    this.header.append(actions);
    this.header.addEventListener('pointerdown', e => this.startDrag(e));
    this.refreshActionState();
  }

  buildResizeHandle() {
    this.resizeHandle = document.createElement('button');
    this.resizeHandle.type = 'button';
    this.resizeHandle.className = 'window-resize-handle';
    this.resizeHandle.title = t('ui.frameResize');
    this.resizeHandle.setAttribute('aria-label', t('ui.frameResize'));
    this.resizeHandle.textContent = '◢';
    this.resizeHandle.addEventListener('pointerdown', e => this.startResize(e));
  }

  buildFromTemplate(template) {
    if (!template) throw new Error('Widget template not provided: ' + this.templateId);
    this.body = document.createElement('div');
    this.body.className = 'widget--element--body';
    this.body.append(template.content.cloneNode(true));
    this.append(this.header, this.body, this.resizeHandle);
    // Activate even when a child control handles its own pointer or keyboard event.
    this.addEventListener('pointerdown', event => {
      this.activate();
      // Preserve native focus for inputs, buttons, selectors and editable content.
      const interactive=event.target?.closest?.(
        'button,input,textarea,select,a,summary,[contenteditable="true"]'
      );
      if (!interactive) this.focus({ preventScroll:true });
    }, { capture:true });
    this.addEventListener('focusin', () => this.activate());
    this.afterBuild?.();
  }

  activate() {
    if (!this.isConnected || this.style.display === 'none') return false;
    const surface=this.parentElement;
    if (!surface || surface.id !== 'workspace-surface') return false;
    if (this.classList.contains('is-focus') &&
        surface.querySelectorAll('widget-element.is-focus').length === 1) return true;
    surface.querySelectorAll('widget-element.is-focus').forEach(widget => {
      if (widget === this) return;
      widget.classList.remove('is-focus');
      widget.removeAttribute('data-active');
      widget.style.zIndex = '';
    });
    this.classList.add('is-focus');
    this.dataset.active = 'true';
    this.style.zIndex = String(++WidgetBase.zIndexCounter);
    window.dispatchEvent(new CustomEvent('dashboardx:widget-activated', {
      detail: { id:this.instanceId, workspaceId:this.workspaceId }
    }));
    return true;
  }

  pointerDrag(event, update) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    event.preventDefault();
    this.activate();
    const onMove = move => {
      if (move.pointerId !== event.pointerId) return;
      update(move);
      window.dashboardxUpdateWorkspaceBounds?.();
    };
    const cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', cleanup);
      document.removeEventListener('pointercancel', cleanup);
      this.saveWidget();
      window.dispatchEvent(new CustomEvent('dashboardx:widget-layout'));
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', cleanup);
    document.addEventListener('pointercancel', cleanup);
  }

  startDrag(event) {
    if (event.target.closest('button,input,select,a,summary')) return;
    if (this.classList.contains('is-pinned') || this.classList.contains('is-maximized')) return;
    const viewport=document.getElementById('workspace-canvas');
    const startX=event.clientX, startY=event.clientY;
    const initialTop=this.offsetTop, initialLeft=this.offsetLeft;
    const initialScrollTop=viewport?.scrollTop || 0;
    const initialScrollLeft=viewport?.scrollLeft || 0;
    this.pointerDrag(event,move=>{
      if(viewport){
        const bounds=viewport.getBoundingClientRect();
        // Auto-scroll while dragging at the visible top/bottom.
        if(move.clientY < bounds.top+48){
          // Travel upwards only through existing positive scroll space; stop at Y=0.
          viewport.scrollTop=Math.max(0,viewport.scrollTop-22);
        }else if(move.clientY > bounds.bottom-48){
          // First grow the surface so scrolling can continue beyond its old edge.
          window.dashboardxUpdateWorkspaceBounds?.();
          viewport.scrollTop+=24;
        }
        if(move.clientX>bounds.right-45)viewport.scrollLeft+=20;
        if(move.clientX<bounds.left+45)viewport.scrollLeft=Math.max(0,viewport.scrollLeft-20);
      }
      const shiftY=(viewport?.scrollTop||0)-initialScrollTop;
      const shiftX=(viewport?.scrollLeft||0)-initialScrollLeft;
      this.style.left=Math.max(0,Math.round((initialLeft+move.clientX-startX+shiftX)/5)*5)+'px';
      this.style.top=Math.max(0,Math.round((initialTop+move.clientY-startY+shiftY)/5)*5)+'px';
    });
  }


  startResize(event) {
    if (this.classList.contains('is-pinned') || this.classList.contains('is-maximized')) return;
    const rect = this.getBoundingClientRect();
    const startX = event.clientX, startY = event.clientY;
    this.pointerDrag(event, move => {
      this.style.width = Math.max(260, Math.round(rect.width + move.clientX - startX)) + 'px';
      this.style.height = Math.max(150, Math.round(rect.height + move.clientY - startY)) + 'px';
    });
  }

  toggleMaximized() {
    if (this.classList.contains('is-maximized')) {
      const original = this._restoreSize || {};
      this.style.width = original.width || '';
      this.style.height = original.height || '';
      this.style.left = original.left || '14px';
      this.style.top = original.top || '14px';
      this.classList.remove('is-maximized');
      this._restoreSize = null;
    } else {
      this._restoreSize = {
        width: this.style.width, height: this.style.height,
        left: this.style.left, top: this.style.top
      };
      this.classList.add('is-maximized');
      this.style.left = '12px';
      this.style.top = '12px';
      this.style.width = Math.max(280, window.innerWidth - 28) + 'px';
      this.style.height = Math.max(220, window.innerHeight - 150) + 'px';
    }
    this.refreshActionState();
    // Temporary maximize state is not saved, so opening again restores normal size.
    if (!this.classList.contains('is-maximized')) this.saveWidget();
  }

  togglePinned() {
    this.classList.toggle('is-pinned');
    this.refreshActionState();
    this.saveWidget();
  }

  toggleFavorite() {
    this.classList.toggle('is-favorite');
    this.refreshActionState();
    this.saveWidget();
  }

  toggleHidden() {
    this.classList.toggle('is-hidden');
    this.style.display = this.classList.contains('is-hidden') ? 'none' : 'flex';
    this.refreshActionState();
    this.saveWidget();
    window.dispatchEvent(new CustomEvent('dashboardx:widget-visibility'));
  }

  refreshActionState() {
    const pin = this.header.querySelector('.window-pin');
    if (pin) {
      pin.setAttribute('aria-pressed', String(this.classList.contains('is-pinned')));
      pin.title = t(this.classList.contains('is-pinned') ? 'ui.frameUnpin' : 'ui.framePin');
      pin.setAttribute('aria-label',pin.title);
    }
    const favorite = this.header.querySelector('.window-favorite');
    if (favorite) {
      favorite.setAttribute('aria-pressed', String(this.classList.contains('is-favorite')));
      favorite.textContent = this.classList.contains('is-favorite') ? '★' : '☆';
      favorite.title = t(this.classList.contains('is-favorite') ? 'ui.frameUnfavorite' : 'ui.frameFavorite');
      favorite.setAttribute('aria-label',favorite.title);
    }
    const hide = this.header.querySelector('.window-hide');
    if (hide) {
      const hidden = this.classList.contains('is-hidden');
      hide.textContent = hidden ? '+' : '−';
      hide.title = t(hidden ? 'ui.frameShow' : 'ui.frameHide');
      hide.setAttribute('aria-label', hide.title);
      hide.setAttribute('aria-pressed', String(hidden));
    }
    const maximize = this.header.querySelector('.window-expand');
    if (maximize) {
      maximize.textContent = this.classList.contains('is-maximized') ? '❐' : '▢';
      maximize.title = t(this.classList.contains('is-maximized') ? 'ui.frameRestore' : 'ui.frameExpand');
      maximize.setAttribute('aria-label',maximize.title);
    }
  }

  toggleWorkplace() {
    window.dispatchEvent(new CustomEvent('dashboardx:share-widget', { detail: { id:this.instanceId } }));
  }
  closeWidget() {
    window.dispatchEvent(new CustomEvent('dashboardx:remove-widget', { detail:{ id:this.instanceId } }));
  }
}
