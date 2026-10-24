const STORAGE_KEY = 'dashboardx.local.v1';
const LAYOUT_PREFIX = 'dashboardx.layout.';
const version = 2;

function initialState() {
  return {
    version, userId: 'local',
    finance: { table: [], crypto: {}, fiat: {} },
    rate: {}, system: { theme: { active: 'dark' }, language: 'ru' },
    instances: {}, nextInstance: 0,
    workspaces: [{ id: 'home', name: 'Главная', widgets: [], backgroundUrl: '' }],
    activeWorkspaceId: 'home',
  };
}

function uid() {
  return 'ws-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export default class ClientDB {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.state = this.load();
    window.db = this.state;
  }

  load() {
    // A new browser starts with an empty dashboard: one workspace and zero user widgets.
    // Do not create demo widgets or silently import legacy financial records.
    const state = initialState();
    try {
      const saved = JSON.parse(this.storage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.version !== version || typeof saved !== 'object' || Array.isArray(saved)) {
        return state;
      }
      if (Array.isArray(saved.finance?.table)) state.finance = saved.finance;
      if (saved.rate && typeof saved.rate === 'object' && !Array.isArray(saved.rate)) state.rate = saved.rate;
      state.system.theme.active = saved.system?.theme?.active === 'light' ? 'light' : 'dark';
      state.system.language = ['ru','kz','en'].includes(saved.system?.language) ? saved.system.language : 'ru';
      if (!saved.instances || typeof saved.instances !== 'object' || Array.isArray(saved.instances)) return state;
      state.nextInstance = Number.isSafeInteger(saved.nextInstance) && saved.nextInstance >= 0 ? saved.nextInstance : 0;
      for (const [id, instance] of Object.entries(saved.instances)) {
        if (id !== '__proto__' && instance && instance.id === id && typeof instance.type === 'string' && instance.type !== 'add') {
          Object.defineProperty(state.instances, id, {
            value: { id, type: instance.type, legacyKey: typeof instance.legacyKey === 'string' ? instance.legacyKey : undefined },
            enumerable: true, configurable: true, writable: true
          });
        }
      }
      if (Array.isArray(saved.workspaces)) {
        const names = new Set();
        const valid = saved.workspaces.filter(w => {
          if (!w || typeof w.id !== 'string' || names.has(w.id) || !Array.isArray(w.widgets)) return false;
          names.add(w.id);
          return true;
        }).map(w => ({
          id: w.id, name: String(w.name || 'Рабочий стол').slice(0, 60),
          widgets: [...new Set(w.widgets.filter(id => typeof id === 'string' && own(state.instances, id)))],
          backgroundUrl: typeof w.backgroundUrl === 'string' && /^https?:\/\//i.test(w.backgroundUrl) ? w.backgroundUrl : ''
        }));
        if (valid.length) state.workspaces = valid;
      }
      state.activeWorkspaceId = state.workspaces.some(w => w.id === saved.activeWorkspaceId)
        ? saved.activeWorkspaceId : state.workspaces[0].id;
    } catch (error) {
      console.warn('DashboardX saved data could not be read; displaying an empty dashboard:', error);
    }
    return state;
  }

  createId(state, type) {
    let id;
    do {
      state.nextInstance += 1;
      id = type + '-' + String(state.nextInstance).padStart(3, '0');
    } while (own(state.instances, id));
    return id;
  }

  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      return true;
    } catch (error) {
      console.warn('DashboardX local save failed:', error);
      return false;
    }
  }

  get workspace() {
    return this.state.workspaces.find(w => w.id === this.state.activeWorkspaceId) || this.state.workspaces[0];
  }

  getInstance(id) {
    return own(this.state.instances, id) ? this.state.instances[id] : null;
  }

  workspaceNamesFor(id) {
    return this.state.workspaces.filter(w => w.widgets.includes(id)).map(w => w.name);
  }

  addWorkspace(name) {
    const title = String(name || '').trim().slice(0, 60);
    if (!title) return false;
    const workspace = { id: uid(), name: title, widgets: [], backgroundUrl: '' };
    this.state.workspaces.push(workspace);
    this.state.activeWorkspaceId = workspace.id;
    return this.save();
  }

  selectWorkspace(id) {
    if (!this.state.workspaces.some(w => w.id === id)) return false;
    this.state.activeWorkspaceId = id;
    return this.save();
  }

  setWorkspaceBackground(value) {
    if (value === '') {
      this.workspace.backgroundUrl = '';
      return this.save();
    }
    let url;
    try { url = new URL(String(value).trim()); }
    catch { return false; }
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return false;
    if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && url.protocol !== 'https:') return false;
    this.workspace.backgroundUrl = url.href;
    return this.save();
  }

  cleanupLayouts(workspaceId, instanceId = null) {
    const prefix = LAYOUT_PREFIX + workspaceId + '.';
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix) && (!instanceId || key === prefix + instanceId)) keys.push(key);
    }
    keys.forEach(key => this.storage.removeItem(key));
  }

  cleanupOrphans() {
    const present = new Set(this.state.workspaces.flatMap(w => w.widgets));
    for (const id of Object.keys(this.state.instances)) {
      if (!present.has(id)) delete this.state.instances[id];
    }
  }

  deleteWorkspace(id) {
    if (!this.state.workspaces.some(w => w.id === id)) return false;
    this.state.workspaces = this.state.workspaces.filter(w => w.id !== id);
    this.cleanupLayouts(id);
    if (!this.state.workspaces.length) {
      this.state.workspaces.push({ id: uid(), name: 'Главная', widgets: [], backgroundUrl: '' });
    }
    if (this.state.activeWorkspaceId === id) this.state.activeWorkspaceId = this.state.workspaces[0].id;
    this.cleanupOrphans();
    return this.save();
  }

  createInstance(type, workspaceId = this.workspace.id) {
    if (!type || typeof type !== 'string' || type === 'add') return null;
    const workspace = this.state.workspaces.find(w => w.id === workspaceId);
    if (!workspace) return null;
    const id = this.createId(this.state, type);
    this.state.instances[id] = { id, type };
    workspace.widgets.push(id);
    this.save();
    return id;
  }

  showInstance(id, workspaceId = this.workspace.id) {
    const workspace = this.state.workspaces.find(w => w.id === workspaceId);
    if (!workspace || !this.getInstance(id) || workspace.widgets.includes(id)) return false;
    workspace.widgets.push(id);
    return this.save();
  }

  cloneInstance(id, workspaceId = this.workspace.id) {
    const instance = this.getInstance(id);
    if (!instance) return null;
    return this.createInstance(instance.type, workspaceId);
  }

  removeInstanceFromWorkspace(id, workspaceId = this.workspace.id) {
    const workspace = this.state.workspaces.find(w => w.id === workspaceId);
    if (!workspace || !workspace.widgets.includes(id)) return false;
    workspace.widgets = workspace.widgets.filter(widgetId => widgetId !== id);
    this.cleanupLayouts(workspaceId, id);
    this.cleanupOrphans();
    return this.save();
  }

  reset() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && (
        key.startsWith('dashboardx.local.') ||
        key.startsWith('dashboardx.layout.') ||
        key === 'finance_local' ||
        key === 'finance_blacknode301'
      )) keys.push(key);
    }
    for (const instance of Object.values(this.state.instances)) {
      if (instance.legacyKey) keys.push(instance.legacyKey);
    }
    [...new Set(keys)].forEach(key => this.storage.removeItem(key));
  }
}
