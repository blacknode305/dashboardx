const KEY = 'dashboardx.local.v1';
const defaults = () => ({
  userId: 'local',
  finance: { table: [], crypto: {}, fiat: {} },
  rate: {},
  system: { theme: { active: 'dark' } },
  workspaces: [{ id: 'home', name: 'Главная', widgets: ['datetime', 'dayBalance', 'financeSummary', 'financeTable'] }],
  activeWorkspaceId: 'home',
});
export default class ClientDB {
  constructor() {
    this.state = this.load();
    window.db = this.state;
  }
  load() {
    const base = defaults();
    try {
      const old = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (old && typeof old === 'object' && !Array.isArray(old)) {
        const state = { ...base, ...old };
        state.system = { ...base.system, ...old.system, theme: { ...base.system.theme, ...old.system?.theme } };
        state.finance = Array.isArray(old.finance?.table) ? old.finance : base.finance;
        state.rate = old.rate && typeof old.rate === 'object' ? old.rate : {};
        state.workspaces = Array.isArray(old.workspaces)
          ? old.workspaces.filter(w => w && typeof w.id === 'string' && Array.isArray(w.widgets)) : base.workspaces;
        if (!state.workspaces.length) state.workspaces = base.workspaces;
        if (!state.workspaces.some(w => w.id === state.activeWorkspaceId)) state.activeWorkspaceId = state.workspaces[0].id;
        return state;
      }
      const legacy = localStorage.getItem('finance_local') || localStorage.getItem('finance_blacknode301');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed?.table)) base.finance = parsed;
      }
    } catch (error) { console.warn('DashboardX restore failed:', error); }
    return base;
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); }
    catch (error) { console.warn('DashboardX localStorage save failed:', error); }
  }
  get workspace() {
    return this.state.workspaces.find(w => w.id === this.state.activeWorkspaceId) || this.state.workspaces[0];
  }
  addWorkspace(name) {
    const clean = String(name || '').trim().slice(0, 60);
    if (!clean) return;
    const id = 'workspace-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.state.workspaces.push({ id, name: clean, widgets: [] });
    this.state.activeWorkspaceId = id;
    this.save();
  }
  selectWorkspace(id) {
    if (!this.state.workspaces.some(w => w.id === id)) return;
    this.state.activeWorkspaceId = id;
    this.save();
  }
  addWidget(type) {
    if (!type || this.workspace.widgets.includes(type)) return;
    this.workspace.widgets.push(type);
    this.save();
  }
  removeWidget(type) {
    this.workspace.widgets = this.workspace.widgets.filter(t => t !== type);
    this.save();
  }
  moveWidget(type, destination) {
    const target = this.state.workspaces.find(w => w.id === destination);
    if (!target || target.id === this.workspace.id || target.widgets.includes(type)) return;
    this.removeWidget(type);
    target.widgets.push(type);
    this.save();
  }
}