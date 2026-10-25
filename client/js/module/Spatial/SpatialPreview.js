/**
 * DashboardX Spatial Preview — the SAME live DOM/widget instances as Desktop.
 * Three.js renders a lightweight room; CSS3DRenderer positions real interactive
 * widget elements. No copy of widget controllers, inputs, or data is created.
 * Desktop layout and spatial poses are stored under different keys.
 */
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { getSpatialLayout, saveSpatialLayout, deleteSpatialLayout } from './SpatialLayout.js';
import { defaultSpatialPose, resizeSpatialPose } from './SpatialMath.js';

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
    this.pitch = 0.04;
    this.distance = 3.8;
    this.target = new THREE.Vector3(0, 1.47, -1.8);
    this.handleResize = () => this.resize();
    this.handleKey = event => {
      if (event.key === 'Escape' && this.isOpen) {
        event.preventDefault();
        this.close();
      }
    };
  }

  open() {
    if (this.isOpen) return;
    const surface = this.canvas.querySelector('#workspace-surface');
    if (!surface) throw new Error('Dashboard workspace has not loaded yet');
    const widgets = [...surface.querySelectorAll(':scope > widget-element')].filter(
      el => el.style.display !== 'none' && !el.classList.contains('is-hidden')
    );
    this.isOpen = true;
    this.surface = surface;
    this.root = document.createElement('section');
    this.root.id = 'spatial-preview';
    this.root.setAttribute('aria-label', 'DashboardX Spatial Preview');
    this.root.innerHTML = `
      <div class="spatial-topbar">
        <div class="spatial-heading"><strong>DashboardX <span>Spatial Preview</span></strong>
          <small>Three.js · реальный интерфейс виджетов · без AR-очков</small>
        </div>
        <div class="spatial-actions">
          <button type="button" data-spatial="home" title="Вернуть исходную камеру">Центрировать</button>
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
          <label>Поворот Y, ° <input data-spatial="rotate" type="number" step="5"></label>
          <label>Ширина, м <input data-spatial="scale" type="number" step="0.1" min="0.35" max="2.8"></label>
        </div>
        <div class="spatial-actions"><button type="button" data-spatial="focus">К виджету</button><button type="button" data-spatial="reset">Сбросить позицию</button>
          <span data-spatial="saved" role="status">Отдельный Spatial Layout</span></div>
      </div>
      <div class="spatial-hint">ЛКМ по пустому месту — вращать сцену · колесо — приблизить ·
        за заголовок — переместить виджет · все поля и кнопки внутри виджетов остаются рабочими.
        Чтобы добавить виджеты, используй обычный менеджер: после добавления вернись сюда.</div>
    `;
    // The overlay deliberately stays INSIDE #workspace-canvas: this preserves
    // the user's existing CSS styling for all original widgets and forms.
    this.canvas.append(this.root);
    document.body.classList.add('dx-spatial-active');
    try {
      this.stage = this.root.querySelector('[data-spatial="stage"]');
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x121a20);
      this.scene.fog = new THREE.Fog(0x121a20, 7, 24);
      this.camera = new THREE.PerspectiveCamera(52, 1, 0.05, 80);
      this.cssScene = new THREE.Scene();
      this.cssRenderer = new CSS3DRenderer();
      this.cssRenderer.domElement.classList.add('spatial-css-layer');
      this.stage.append(this.cssRenderer.domElement);
      try {
        this.glRenderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference:'low-power' });
        this.glRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.glRenderer.domElement.classList.add('spatial-gl-layer');
        this.stage.prepend(this.glRenderer.domElement);
        const grid = new THREE.GridHelper(28, 28, 0x5c7785, 0x283c45);
        grid.position.y = -0.03;
        this.scene.add(grid);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
          new THREE.MeshBasicMaterial({ color: 0x142129, side: THREE.DoubleSide }));
        floor.rotation.x = -Math.PI/2;
        floor.position.y = -0.045;
        this.scene.add(floor);
      } catch (error) {
        console.warn('WebGL grid unavailable; CSS3D widgets remain usable', error);
        this.glRenderer?.dispose();
        this.glRenderer = null;
      }

      widgets.forEach((widget, index) => this.attach(widget, index));
      this.bindControls();
      this.select(this.records[0] || null);
      this.resize();
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('keydown', this.handleKey);
      this.render();
    } catch (error) {
      this.close();
      throw error;
    }
  }

  attach(widget, index) {
    const desktopStyle = widget.getAttribute('style');
    const panel = document.createElement('div');
    panel.className = 'spatial-panel';
    panel.dataset.spatialId = widget.instanceId;
    panel.style.width = '430px';
    panel.style.height = '340px';
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

    const stored = (() => {
      try { return localStorage.getItem('dashboardx:spatial:v1:' + widget.instanceId); }
      catch { return null; }
    })();
    const pose = stored ? getSpatialLayout(widget.instanceId) : defaultSpatialPose(index);
    const object = new CSS3DObject(panel);
    this.cssScene.add(object);
    const record = { widget, desktopStyle, panel, object, pose, index };
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
    const widthPx = 430;
    const scale = pose.widthMeters / widthPx;
    object.scale.setScalar(scale);
    panel.style.height = Math.round(pose.heightMeters / scale) + 'px';
    panel.classList.toggle('is-selected', this.selected === record);
  }

  persist(record) {
    saveSpatialLayout(record.widget.instanceId, record.pose);
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
    for (const id of ['x','y','z','rotate','scale']) {
      const input = this.root.querySelector('[data-spatial="'+id+'"]');
      if (!input) continue;
      input.disabled = !record;
      if (!record) {input.value='';continue;}
      const p = record.pose;
      input.value = String(id==='x'?round(p.position[0]):id==='y'?round(p.position[1]):
        id==='z'?round(p.position[2]):id==='rotate'?
        Math.round(THREE.MathUtils.radToDeg(p.rotation[1])):round(p.widthMeters));
    }
  }

  bindControls() {
    const read = name => this.root.querySelector('[data-spatial="'+name+'"]');
    read('exit').addEventListener('click',()=>this.close());
    read('home').addEventListener('click',()=>{
      this.yaw=0; this.pitch=0.04; this.distance=3.8;
      this.target.set(0,1.47,-1.8); this.render();
    });
    read('focus').addEventListener('click',()=>{
      if (!this.selected) return;
      this.target.set(...this.selected.pose.position);
      this.distance=2.8;
      this.render();
    });
    read('reset').addEventListener('click',()=>{
      if (!this.selected) return;
      deleteSpatialLayout(this.selected.widget.instanceId);
      this.selected.pose=defaultSpatialPose(this.selected.index);
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
    for (const [field,index] of [['x',0],['y',1],['z',2],['rotate',null],['scale',null]]) {
      read(field).addEventListener('change',event=>{
        const record=this.selected;
        const value=Number(event.target.value);
        if (!record || !Number.isFinite(value)) return;
        if (index!==null) record.pose.position[index]=clamp(value,-20,20);
        else if (field==='rotate') record.pose.rotation[1]=THREE.MathUtils.degToRad(clamp(value,-180,180));
        else {
          record.pose = resizeSpatialPose(record.pose,clamp(value,.35,2.8));
        }
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
    this.glRenderer?.render(this.scene,this.camera);
    this.cssRenderer?.render(this.cssScene,this.camera);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen=false;
    window.removeEventListener('resize',this.handleResize);
    window.removeEventListener('keydown',this.handleKey);
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
    this.glRenderer?.dispose();
    this.glRenderer?.domElement.remove();
    this.glRenderer=null;
    this.root?.remove();
    document.body.classList.remove('dx-spatial-active');
    this.selected=null;
    this.onClose();
  }
}
