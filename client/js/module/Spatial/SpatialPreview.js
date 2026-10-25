/**
 * DashboardX Spatial Preview — the SAME live DOM/widget instances as Desktop.
 * Three.js renders a lightweight room; CSS3DRenderer positions real interactive
 * widget elements. No copy of widget controllers, inputs, or data is created.
 * Desktop layout and spatial poses are stored under different keys.
 */
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { getSpatialLayout, saveSpatialLayout, deleteSpatialLayout } from './SpatialLayout.js';
import { defaultSpatialPose, spatialSizeFromDesktop, SPATIAL_PIXELS_PER_METER } from './SpatialMath.js';
import { readGlassTransparency, saveGlassTransparency, glassBackgroundAlpha } from './SpatialGlass.js';
import { makeSpatialRoom, makeFallbackSpatialRoom, ROOM_BOUNDS, getRoomTheme, getRoomPalette } from './SpatialRoom.js';

const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
const round = number => Math.round(number * 100) / 100;

export default class SpatialPreview {
  constructor({ canvas = document.getElementById('workspace-canvas'), onClose = () => {} } = {}) {
    if (!canvas) throw new Error('Dashboard workspace is missing');
    this.canvas = canvas;
    this.onClose = onClose;
    this.isOpen = false;
    this.records = [];
    this.selected = null;
    this.yaw = 0;
    this.pitch = 0.15;
    this.distance = 3.8;
    this.roomVisible = true;
    this.roomTheme = getRoomTheme(document.documentElement.dataset.theme);
    this.target = new THREE.Vector3(0, 1.47, -1.8);
    this.handleResize = () => this.resize();
    this.handleKey = event => {
      if (!this.isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }
      // Navigate the architectural volume, without stealing keys from inputs.
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing ||
          event.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) return;
      const forward = key==='w'||key==='arrowup' ? 1 : key==='s'||key==='arrowdown' ? -1 : 0;
      const sideways = key==='d'||key==='arrowright' ? 1 : key==='a'||key==='arrowleft' ? -1 : 0;
      const step=.22;
      // Keep camera a safe distance from walls, and preserve the orbit angle.
      this.target.x = clamp(this.target.x +
        (Math.cos(this.yaw)*sideways - Math.sin(this.yaw)*forward)*step,
        ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
      this.target.z = clamp(this.target.z -
        (Math.cos(this.yaw)*forward + Math.sin(this.yaw)*sideways)*step,
        ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ);
      event.preventDefault();
      this.render();
    };
  }

  open() {
    if (this.isOpen) return;
    const surface = this.canvas.querySelector('#workspace-surface');
    if (!surface) throw new Error('Dashboard workspace has not loaded yet');
    const widgets = [...surface.querySelectorAll(':scope > widget-element')].filter(
      el => el.style.display !== 'none' && !el.classList.contains('is-hidden')
    );
    // Snapshot rendered Desktop dimensions BEFORE enabling Spatial CSS.
    // Each widget's size is authoritative here; no separate 3D resize settings.
    const desktopSizes = widgets.map(widget => {
      const rect = widget.getBoundingClientRect();
      return spatialSizeFromDesktop(rect.width, rect.height);
    });
    this.isOpen = true;
    this.surface = surface;
    this.workspaceId=window.dashboardxStore?.workspace.id || 'home';
    this.root = document.createElement('section');
    this.root.id = 'spatial-preview';
    this.root.setAttribute('aria-label', 'DashboardX Spatial Preview');
    this.roomTheme = getRoomTheme(document.documentElement.dataset.theme);
    this.root.dataset.roomTheme = this.roomTheme;
    this.root.innerHTML = `
      <div class="spatial-topbar">
        <div class="spatial-heading"><strong>DashboardX <span>Spatial Preview</span></strong>
          <small>Three.js · реальный интерфейс виджетов · без AR-очков</small>
        </div>
        <div class="spatial-actions">
          <div class="spatial-workspace-switcher" role="group" aria-label="Рабочее пространство">
            <label for="spatial-workspace-select">Пространство</label>
            <select data-spatial="workspace" id="spatial-workspace-select" aria-label="Выбрать рабочее пространство"></select>
            <button type="button" data-spatial="workspace-new" title="Создать пространство" aria-label="Создать рабочее пространство">+</button>
          </div>
          <button type="button" data-spatial="home" title="Вернуть исходную камеру">Центрировать</button>
          <button type="button" data-spatial="room" aria-pressed="true" title="Показать или скрыть виртуальную комнату">◫ Комната</button>
          <button type="button" data-spatial="exit" class="spatial-exit">← Desktop</button>
        </div>
      </div>
      <div class="spatial-stage" data-spatial="stage"></div>
      <div class="spatial-inspector" aria-label="Параметры виджета">
        <label>Виджет <select data-spatial="select"></select></label>
        <div class="spatial-fields">
          <label>X, м <input data-spatial="x" type="number" step="0.1"></label>
          <label>Y, м <input data-spatial="y" type="number" step="0.1"></label>
          <label>Z, м <input data-spatial="z" type="number" step="0.1"></label>
          <label>Поворот X, ° <input data-spatial="rotate-x" type="number" min="-180" max="180" step="5"></label>
          <label>Поворот Y, ° <input data-spatial="rotate" type="number" min="-180" max="180" step="5"></label>
        </div>
        <div class="spatial-desktop-size" data-spatial="desktop-size" aria-live="polite"></div>
        <label class="spatial-glass-control">
          <span>Прозрачность панелей <output data-spatial="glass-value">55%</output></span>
          <input type="range" min="0" max="90" step="5" value="55" data-spatial="glass" aria-label="Прозрачность фона виджетов">
        </label>
        <div class="spatial-actions"><button type="button" data-spatial="focus">К виджету</button><button type="button" data-spatial="reset">Сбросить позицию</button>
          <span data-spatial="saved" role="status">Отдельный Spatial Layout</span></div>
      </div>
      <div class="spatial-room-status" data-spatial="room-status" role="status" aria-live="polite">Инициализация комнаты…</div>
      <div class="spatial-hint">WASD/стрелки — двигаться по комнате · Размер каждого виджета берётся из Desktop · ЛКМ по пустому месту — вращать сцену · колесо — приблизить ·
        за заголовок — переместить виджет · все поля и кнопки внутри виджетов остаются рабочими.
        Чтобы добавить виджеты, используй обычный менеджер: после добавления вернись сюда.</div>
    `;
    // The overlay deliberately stays INSIDE #workspace-canvas: this preserves
    // the user's existing CSS styling for all original widgets and forms.
    this.canvas.append(this.root);
    this.setGlassTransparency(readGlassTransparency(), false);
    document.body.classList.add('dx-spatial-active');
    try {
      this.stage = this.root.querySelector('[data-spatial="stage"]');
      this.stage.dataset.roomTheme=this.roomTheme;
      this.scene = new THREE.Scene();
      const palette=getRoomPalette(this.roomTheme);
      this.scene.background = new THREE.Color(palette.clear);
      this.scene.fog = new THREE.Fog(palette.fog, 10, 35);
      this.camera = new THREE.PerspectiveCamera(52, 1, 0.05, 80);
      this.cssScene = new THREE.Scene();
      this.cssRenderer = new CSS3DRenderer();
      this.cssRenderer.domElement.classList.add('spatial-css-layer');
      this.stage.append(this.cssRenderer.domElement);
      try {
        this.glRenderer = new THREE.WebGLRenderer({
          alpha:false, antialias:true, powerPreference:'default'
        });
        this.glRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.glRenderer.domElement.classList.add('spatial-gl-layer');
        this.stage.prepend(this.glRenderer.domElement);
        this.room3d = makeSpatialRoom(THREE, document, this.roomTheme);
        this.scene.add(this.room3d.group);
        this.stage.dataset.roomRenderer='webgl';
        this.stage.dataset.roomParts=String(this.room3d.getParts());
        this.setRoomStatus('3D-комната активна · Three.js WebGL');
        this.glRenderer.domElement.addEventListener('webglcontextlost', event => {
          event.preventDefault();
          this.installCssRoomFallback('WebGL отключился — показана CSS3D-комната');
        });
      } catch (error) {
        console.warn('WebGL is unavailable; using CSS3D room fallback', error);
        this.glRenderer?.dispose();
        this.glRenderer?.domElement.remove();
        this.glRenderer=null;
        this.installCssRoomFallback('WebGL недоступен · CSS3D-комната');
      }

      widgets.forEach((widget, index) => this.attach(widget, index, desktopSizes[index]));
      this.bindControls();
      this.select(this.records[0] || null);
      this.resize();
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('keydown', this.handleKey);
      this.themeObserver=new MutationObserver(()=>{
        const next=getRoomTheme(document.documentElement.dataset.theme);
        if(next!==this.roomTheme) this.applyRoomTheme(next);
      });
      this.themeObserver.observe(document.documentElement,{
        attributes:true,attributeFilter:['data-theme']
      });
      this.render();
    } catch (error) {
      this.close();
      throw error;
    }
  }

  setRoomStatus(label) {
    const el = this.root?.querySelector('[data-spatial="room-status"]');
    if (el) el.textContent = label;
  }

  installCssRoomFallback(message) {
    if (!this.isOpen || this.roomFallback?.length) return;
    this.room3d?.group && (this.room3d.group.visible=false);
    this.roomFallback=makeFallbackSpatialRoom(CSS3DObject,document,this.roomTheme);
    this.roomFallback.forEach(obj=>this.cssScene.add(obj));
    this.stage.dataset.roomRenderer='css3d';
    this.stage.dataset.roomParts=String(this.roomFallback.length);
    this.setRoomStatus(message);
    this.setRoomVisibility(this.roomVisible);
    this.render();
  }

  applyRoomTheme(theme) {
    if(!this.isOpen) return;
    const next=getRoomTheme(theme);
    if(next===this.roomTheme) return;
    this.roomTheme=next;
    this.root.dataset.roomTheme=next;
    const palette=getRoomPalette(next);
    this.scene.background.setHex(palette.clear);
    this.scene.fog.color.setHex(palette.fog);
    if(this.stage.dataset.roomRenderer==='webgl' && this.room3d) {
      this.scene.remove(this.room3d.group);
      this.room3d.dispose();
      this.room3d=makeSpatialRoom(THREE,document,next);
      this.scene.add(this.room3d.group);
      this.stage.dataset.roomParts=String(this.room3d.getParts());
    } else if(this.roomFallback?.length) {
      this.roomFallback.forEach(obj=>{
        this.cssScene.remove(obj);
        obj.element?.remove();
      });
      this.roomFallback=makeFallbackSpatialRoom(CSS3DObject,document,next);
      this.roomFallback.forEach(obj=>this.cssScene.add(obj));
    }
    this.stage.dataset.roomTheme=next;
    this.setRoomVisibility(this.roomVisible);
  }

  setRoomVisibility(visible) {
    this.roomVisible=Boolean(visible);
    if (this.room3d?.group) this.room3d.group.visible=this.roomVisible &&
      this.stage?.dataset.roomRenderer==='webgl';
    for (const object of this.roomFallback||[]) {
      object.visible=this.roomVisible;
      object.element.style.display=this.roomVisible?'':'none';
    }
    const button=this.root?.querySelector('[data-spatial="room"]');
    if (button) {
      button.setAttribute('aria-pressed',String(this.roomVisible));
      button.textContent=this.roomVisible?'◫ Комната':'◫ Показать комнату';
    }
    this.render();
  }

  spatialPoseId(instanceId) {
    // Existing default-home poses are unchanged. Other workspaces receive
    // their own 3D coordinates, even if they share the SAME widget instance.
    return this.workspaceId==='home' ? instanceId : this.workspaceId+'__'+instanceId;
  }

  attach(widget, index, desktopSize) {
    const desktopStyle = widget.getAttribute('style');
    const panel = document.createElement('div');
    panel.className = 'spatial-panel';
    panel.dataset.spatialId = widget.instanceId;
    panel.style.width = desktopSize.widthPx + 'px';
    panel.style.height = desktopSize.heightPx + 'px';
    const header = widget.header;
    // Moving a custom element would ordinarily destroy its widget controller.
    // Suppress teardown during this controlled reparent, never during removal.
    widget._spatialMoving = true;
    widget._spatialMode = true;
    try {
      panel.append(widget);
    } finally { widget._spatialMoving = false; }
    widget.style.top = '0px';
    widget.style.left = '0px';
    widget.style.width = '100%';
    widget.style.height = '100%';
    widget.style.display = 'flex';
    widget.classList.add('is-spatial-widget');

    const poseId=this.spatialPoseId(widget.instanceId);
    const stored = (() => {
      try { return localStorage.getItem('dashboardx:spatial:v1:' + poseId); }
      catch { return null; }
    })();
    const pose = stored ? getSpatialLayout(poseId) : defaultSpatialPose(index);
    // Ignore widths/heights saved by older Spatial versions. Desktop now owns size.
    pose.widthMeters = desktopSize.widthMeters;
    pose.heightMeters = desktopSize.heightMeters;
    const object = new CSS3DObject(panel);
    this.cssScene.add(object);
    const record = { widget, desktopStyle, panel, object, pose, index, desktopSize };
    this.records.push(record);
    this.applyPose(record);

    const pointerDown = event => {
      if (event.button !== 0 || event.target.closest('button,input,textarea,select,a,summary')) return;
      event.preventDefault();
      event.stopPropagation();
      this.select(record);
      const start = { x:event.clientX, y:event.clientY, p:[...record.pose.position] };
      const factor = 2 * this.distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2)) /
        Math.max(1,this.stage.clientHeight);
      const move = e => {
        if (e.pointerId !== event.pointerId) return;
        record.pose.position[0] = round(start.p[0] + (e.clientX-start.x)*factor);
        record.pose.position[1] = round(start.p[1] - (e.clientY-start.y)*factor);
        this.applyPose(record); this.syncInspector(); this.render();
      };
      const done = e => {
        if (e.pointerId !== event.pointerId) return;
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',done);
        window.removeEventListener('pointercancel',done);
        this.persist(record);
      };
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',done);
      window.addEventListener('pointercancel',done);
    };
    header.addEventListener('pointerdown', pointerDown);
    record.unbind = () => header.removeEventListener('pointerdown',pointerDown);
    widget.addEventListener('pointerdown', () => this.select(record), { signal: this.getAbortSignal() });
  }

  getAbortSignal() {
    if (!this.abortController) this.abortController = new AbortController();
    return this.abortController.signal;
  }

  applyPose(record) {
    const { object, pose, panel } = record;
    object.position.set(...pose.position);
    object.rotation.set(...pose.rotation);
    object.scale.setScalar(1 / SPATIAL_PIXELS_PER_METER);
    panel.classList.toggle('is-selected', this.selected === record);
  }

  persist(record) {
    saveSpatialLayout(this.spatialPoseId(record.widget.instanceId), record.pose);
    const saved = this.root.querySelector('[data-spatial="saved"]');
    if (saved) saved.textContent = 'Spatial Layout сохранён';
  }

  select(record) {
    this.selected = record;
    for (const item of this.records) item.panel.classList.toggle('is-selected', item === record);
    const select = this.root.querySelector('[data-spatial="select"]');
    if (select && record) select.value = record.widget.instanceId;
    this.syncInspector();
  }

  syncInspector() {
    const record = this.selected;
    for (const id of ['x','y','z','rotate-x','rotate']) {
      const input = this.root.querySelector('[data-spatial="'+id+'"]');
      if (!input) continue;
      input.disabled = !record;
      if (!record) {input.value='';continue;}
      const p = record.pose;
      input.value = String(id==='x'?round(p.position[0]):id==='y'?round(p.position[1]):
        id==='z'?round(p.position[2]):
        id==='rotate-x'?Math.round(THREE.MathUtils.radToDeg(p.rotation[0])):
        Math.round(THREE.MathUtils.radToDeg(p.rotation[1])));
    }
    const dimensions = this.root.querySelector('[data-spatial="desktop-size"]');
    if (dimensions) dimensions.textContent = record
      ? 'Размер из Desktop: ' + record.desktopSize.widthPx + ' × ' +
        record.desktopSize.heightPx + ' px · меняется только в Desktop'
      : 'Размер задаётся в Desktop';
  }

  setGlassTransparency(percent, persist = true) {
    const value = persist ? saveGlassTransparency(percent) : percent;
    this.root.style.setProperty('--dx-spatial-panel-alpha', String(glassBackgroundAlpha(value)));
    const input = this.root.querySelector('[data-spatial="glass"]');
    const output = this.root.querySelector('[data-spatial="glass-value"]');
    if (input) input.value = String(value);
    if (output) output.textContent = value + '%';
  }

  bindControls() {
    const read = name => this.root.querySelector('[data-spatial="'+name+'"]');
    read('glass').addEventListener('input', event => {
      this.setGlassTransparency(event.target.value);
    });
    const workspaceSelect=read('workspace');
    const store=window.dashboardxStore;
    if(store){
      for(const workspace of store.state.workspaces){
        const option=document.createElement('option');
        option.value=workspace.id;option.textContent=workspace.name;
        workspaceSelect.append(option);
      }
      workspaceSelect.value=store.workspace.id;
    }
    workspaceSelect.addEventListener('change',()=>{
      window.dispatchEvent(new CustomEvent('dashboardx:workspace-command',{
        detail:{action:'select',id:workspaceSelect.value}
      }));
    });
    read('workspace-new').addEventListener('click',()=>{
      const name=prompt('Название нового пространства (например: Дом, Улица, Кафе)');
      if(name?.trim())window.dispatchEvent(new CustomEvent('dashboardx:workspace-command',{
        detail:{action:'create',name:name.trim()}
      }));
    });
    read('exit').addEventListener('click',()=>this.close());
    read('home').addEventListener('click',()=>{
      this.yaw=0; this.pitch=0.15; this.distance=3.8;
      this.target.set(0,1.47,-1.8); this.render();
    });
    read('room').addEventListener('click',()=>this.setRoomVisibility(!this.roomVisible));
    read('focus').addEventListener('click',()=>{
      if (!this.selected) return;
      this.target.set(...this.selected.pose.position);
      this.distance=2.8;
      this.render();
    });
    read('reset').addEventListener('click',()=>{
      if (!this.selected) return;
      deleteSpatialLayout(this.spatialPoseId(this.selected.widget.instanceId));
      this.selected.pose={
        ...defaultSpatialPose(this.selected.index),
        widthMeters:this.selected.desktopSize.widthMeters,
        heightMeters:this.selected.desktopSize.heightMeters
      };
      this.applyPose(this.selected);this.syncInspector();this.render();
      read('saved').textContent='Стандартная позиция';
    });
    const selector = read('select');
    for (const r of this.records) {
      const option = document.createElement('option');
      option.value=r.widget.instanceId;
      option.textContent=(r.widget.header?.querySelector('.window-title')?.textContent || r.widget.templateId)
        +' · '+r.widget.instanceId;
      selector.append(option);
    }
    selector.addEventListener('change',()=>this.select(this.records.find(
      r=>r.widget.instanceId===selector.value) || null));
    for (const [field,index] of [['x',0],['y',1],['z',2],['rotate-x',null],['rotate',null]]) {
      read(field).addEventListener('change',event=>{
        const record=this.selected;
        const value=Number(event.target.value);
        if (!record || !Number.isFinite(value)) return;
        if (index!==null) record.pose.position[index]=clamp(value,-20,20);
        else if (field==='rotate-x') record.pose.rotation[0]=THREE.MathUtils.degToRad(clamp(value,-180,180));
        else if (field==='rotate') record.pose.rotation[1]=THREE.MathUtils.degToRad(clamp(value,-180,180));
        this.applyPose(record);this.syncInspector();this.persist(record);this.render();
      });
    }
    const startOrbit = event => {
      if (event.button !== 0 || event.target.closest('widget-element,.spatial-panel,.spatial-inspector,.spatial-topbar')) return;
      const x=event.clientX,y=event.clientY,yaw=this.yaw,pitch=this.pitch;
      const move = e => {
        if (e.pointerId!==event.pointerId) return;
        this.yaw = yaw - (e.clientX-x)*.005;
        this.pitch = clamp(pitch + (e.clientY-y)*.004,-1.1,1.1);
        this.render();
      };
      const done = e => {
        if (e.pointerId!==event.pointerId) return;
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',done);
        window.removeEventListener('pointercancel',done);
      };
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',done);
      window.addEventListener('pointercancel',done);
    };
    this.stage.addEventListener('pointerdown',startOrbit);
    this.stage.addEventListener('wheel',event=>{
      if (event.target.closest('widget-element,.spatial-panel')) return;
      event.preventDefault();
      this.distance=clamp(this.distance + Math.sign(event.deltaY)*.35,1.15,14);
      this.render();
    },{passive:false});
  }

  resize() {
    if (!this.isOpen) return;
    const width=Math.max(1,this.stage.clientWidth),height=Math.max(1,this.stage.clientHeight);
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
    this.cssRenderer.setSize(width,height);
    if (this.glRenderer) this.glRenderer.setSize(width,height);
    this.render();
  }

  render() {
    if (!this.isOpen) return;
    const cp=Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x+Math.sin(this.yaw)*cp*this.distance,
      this.target.y+Math.sin(this.pitch)*this.distance,
      this.target.z+Math.cos(this.yaw)*cp*this.distance
    );
    this.camera.lookAt(this.target);
    if (this.glRenderer) {
      this.glRenderer.render(this.scene,this.camera);
      this.stage.dataset.roomTriangles=String(this.glRenderer.info.render.triangles);
    }
    this.cssRenderer?.render(this.cssScene,this.camera);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen=false;
    window.removeEventListener('resize',this.handleResize);
    window.removeEventListener('keydown',this.handleKey);
    this.themeObserver?.disconnect();
    this.themeObserver=null;
    this.abortController?.abort();
    this.abortController=null;
    // Restore the exact original DOM instances BEFORE removing the CSS renderer.
    for (const record of this.records) {
      record.unbind?.();
      const widget=record.widget;
      widget._spatialMoving=true;
      try {
        widget.classList.remove('is-spatial-widget');
        this.surface.append(widget);
        if (record.desktopStyle===null) widget.removeAttribute('style');
        else widget.setAttribute('style',record.desktopStyle);
      } finally {
        widget._spatialMode=false;
        widget._spatialMoving=false;
      }
      this.cssScene?.remove(record.object);
    }
    this.records=[];
    this.roomFallback?.forEach(obj=>{
      this.cssScene?.remove(obj);
      obj.element?.remove();
    });
    this.roomFallback=[];
    this.room3d?.dispose();
    if(this.room3d?.group) this.scene?.remove(this.room3d.group);
    this.room3d=null;
    this.glRenderer?.dispose();
    this.glRenderer?.domElement.remove();
    this.glRenderer=null;
    this.root?.remove();
    document.body.classList.remove('dx-spatial-active');
    this.selected=null;
    this.onClose();
  }
}
