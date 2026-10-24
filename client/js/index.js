import eventBus from './module/EventBus.js';
import ClientDB from './module/ClientDB.js';
import WidgetElement from './module/WidgetElement.js';
import NavigationBar from './module/NavigationBar.js';

// Each template is an existing static HTML file. No Node.js or Webpack required.
const filenames = [
  '_add.html', '_audioPlayer.html', '_binanceApi.html', '_calculator.html',
  '_datetime.html', '_dayBalance.html', '_financeSummary.html', '_financeTable.html',
  '_moneyConvertApi.html', '_nesEmulator.html', '_serverConsole.html', '_telegramBot.html',
  '_torrentTracker.html', '_videoPlayer.html', '_wishlistGames.html', '_wishlistPrice.html'
];
const disabled = new Set(['audioPlayer', 'serverConsole', 'telegramBot']);
const store = new ClientDB();

async function loadTemplates() {
  const templates = await Promise.all(filenames.map(async file => {
    const response = await fetch(new URL('../' + file, import.meta.url));
    if (!response.ok) throw new Error(file + ': HTTP ' + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const template = doc.querySelector('template[data-widget]');
    if (!template) throw new Error(file + ': widget template missing');
    return document.importNode(template, true);
  }));
  document.body.append(...templates);
}

function availableTemplates() {
  return [...document.querySelectorAll('template[data-widget]')].filter(t => !disabled.has(t.dataset.id));
}

function render() {
  const select = document.getElementById('workspace-select');
  select.replaceChildren();
  for (const ws of store.state.workspaces) {
    const option = document.createElement('option');
    option.value = ws.id;
    option.textContent = ws.name;
    select.append(option);
  }
  select.value = store.workspace.id;
  const templates = availableTemplates();
  const widgetSelect = document.getElementById('widget-select');
  widgetSelect.replaceChildren();
  for (const t of templates) {
    if (store.workspace.widgets.includes(t.dataset.id)) continue;
    const opt = document.createElement('option');
    opt.value = t.dataset.id;
    opt.textContent = t.dataset.title || t.dataset.id;
    widgetSelect.append(opt);
  }
  document.getElementById('add-widget').disabled = widgetSelect.options.length === 0;

  const canvas = document.getElementById('workspace-canvas');
  canvas.replaceChildren();
  const lookup = new Map(templates.map(t => [t.dataset.id, t]));
  const cols = Math.max(1, Math.floor(Math.max(340, canvas.clientWidth) / 360));
  store.workspace.widgets.forEach((type, i) => {
    const t = lookup.get(type);
    if (!t) return;
    const element = new WidgetElement({
      id: type,
      instanceId: store.workspace.id + '-' + type + '-widget',
      workspaceId: store.workspace.id,
      category: t.dataset.category || 'other',
      title: t.dataset.title || type
    });
    if (!element.styleData.top) {
      element.style.top = 24 + Math.floor(i / cols) * 300 + 'px';
      element.style.left = 14 + (i % cols) * 360 + 'px';
    }
    canvas.appendChild(element);
  });

  const categories = ['all','pinned','hidden','favorite', ...new Set(templates.map(t => t.dataset.category))];
  const navbar = new NavigationBar(categories);
  document.getElementById('widget-navigation').replaceChildren(navbar);
  navbar.filterWidgets('all');
}

function reload() { window.location.reload(); }
async function boot() {
  try {
    document.documentElement.dataset.theme = store.state.system.theme.active === 'light' ? 'light' : 'dark';
    await loadTemplates();
    document.getElementById('workspace-select').addEventListener('change', event => {
      store.selectWorkspace(event.target.value); reload();
    });
    document.getElementById('create-workspace').addEventListener('click', () => {
      const name = prompt('Название нового рабочего стола:');
      if (name) { store.addWorkspace(name); reload(); }
    });
    document.getElementById('add-widget').addEventListener('click', () => {
      store.addWidget(document.getElementById('widget-select').value); reload();
    });
    document.getElementById('theme-toggle').addEventListener('click', () => {
      store.state.system.theme.active = store.state.system.theme.active === 'dark' ? 'light' : 'dark';
      store.save(); reload();
    });
    window.addEventListener('dashboardx:remove-widget', event => {
      if (confirm('Удалить этот виджет с рабочего стола?')) {
        store.removeWidget(event.detail.type); reload();
      }
    });
    window.addEventListener('dashboardx:move-widget', event => {
      const other = store.state.workspaces.filter(w => w.id !== store.workspace.id);
      if (!other.length) { alert('Сначала создайте ещё один рабочий стол.'); return; }
      const requested = prompt('Переместить на рабочий стол: ' + other.map(w => w.name).join(', '));
      const target = other.find(w => w.name === requested);
      if (target) { store.moveWidget(event.detail.type, target.id); reload(); }
    });
    eventBus.on('finance:dayBalanceWidget:updated', () => store.save());
    render();
    store.save();
    document.getElementById('app-loader')?.remove();
  } catch (error) {
    console.error('DashboardX initialization failed:', error);
    const label = document.getElementById('loader-text');
    if (label) label.textContent = 'Ошибка запуска: ' + error.message;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();