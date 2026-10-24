import eventBus from './module/EventBus.js';
import ClientDB from './module/ClientDB.js';
import WidgetElement from './module/WidgetElement.js';
import NavigationBar from './module/NavigationBar.js';

const filenames = [
  '_add.html', '_audioPlayer.html', '_binanceApi.html', '_calculator.html',
  '_datetime.html', '_dayBalance.html', '_financeSummary.html', '_financeTable.html',
  '_moneyConvertApi.html', '_nesEmulator.html', '_serverConsole.html', '_telegramBot.html',
  '_torrentTracker.html', '_videoPlayer.html', '_wishlistGames.html', '_wishlistPrice.html'
];
const disabled = new Set(['audioPlayer', 'serverConsole', 'telegramBot']);
const store = new ClientDB();
window.dashboardxStore = store;
let templates = [];

async function loadTemplates() {
  // One unavailable optional template must not disable all widget controls.
  const results = await Promise.allSettled(filenames.map(async name => {
    const response = await fetch(new URL('../' + name, import.meta.url));
    if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const template = doc.querySelector('template[data-widget]');
    if (!template?.dataset.id) throw new Error(name + ': valid widget template missing');
    return document.importNode(template, true);
  }));
  const loaded = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failed = results.filter(result => result.status === 'rejected');
  if (failed.length) console.warn('Some widget templates are unavailable:', failed.map(result => result.reason));
  document.body.append(...loaded);
  templates = loaded.filter(template => !disabled.has(template.dataset.id));
  if (!templates.some(template => template.dataset.id === 'add')) {
    throw new Error('Не загрузился виджет добавления. Проверьте client/_add.html и настройки GitHub Pages.');
  }
  window.dashboardxTemplates = templates.map(template => ({
    id: template.dataset.id,
    title: template.dataset.title || template.dataset.id,
    category: template.dataset.category || 'other'
  }));
}

function reload() {
  location.reload();
}

function renderWorkspaceTabs() {
  const tabs = document.getElementById('workspace-tabs');
  tabs.replaceChildren();
  for (const workspace of store.state.workspaces) {
    const tile = document.createElement('div');
    tile.className = 'workspace-tile' + (workspace.id === store.workspace.id ? ' is-active' : '');

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'workspace-name';
    title.textContent = workspace.name;
    title.title = 'Перейти на стол «' + workspace.name + '»';
    title.setAttribute('aria-pressed', String(workspace.id === store.workspace.id));
    title.addEventListener('click', () => {
      if (store.selectWorkspace(workspace.id)) reload();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'workspace-delete';
    remove.textContent = '×';
    remove.title = 'Удалить рабочий стол «' + workspace.name + '»';
    remove.setAttribute('aria-label', remove.title);
    remove.addEventListener('click', () => {
      const question = 'Удалить рабочий стол «' + workspace.name + '»? Он исчезнет вместе с его расположением виджетов. Виджеты на других столах останутся.';
      if (confirm(question) && store.deleteWorkspace(workspace.id)) reload();
    });
    tile.append(title, remove);
    tabs.append(tile);
  }
  const create = document.createElement('button');
  create.type = 'button';
  create.id = 'create-workspace';
  create.textContent = '+';
  create.title = 'Создать рабочий стол';
  create.setAttribute('aria-label', create.title);
  create.addEventListener('click', () => {
    const name = prompt('Название нового рабочего стола:');
    if (name && store.addWorkspace(name)) reload();
  });
  tabs.append(create); // Always exactly one permanent + tile, after all desktops.
}

function makeWidget(type, instanceId, index, wide, managerBottom = 400, managerWidth = 490) {
  const template = templates.find(t => t.dataset.id === type);
  if (!template) return null;
  const instance = new WidgetElement({
    id: type,
    instanceId,
    workspaceId: store.workspace.id,
    legacyKey: store.getInstance(instanceId)?.legacyKey,
    category: template.dataset.category || 'other',
    title: template.dataset.title || type
  });
  if (!instance.styleData.top) {
    const startX = wide ? managerWidth + 30 : 14;
    const availableWidth = Math.max(330, window.innerWidth - startX - 18);
    const cols = wide ? Math.max(1, Math.floor(availableWidth / 350)) : 1;
    const startY = wide ? 18 : managerBottom + 24;
    instance.style.top = startY + Math.floor(index / cols) * 325 + 'px';
    instance.style.left = startX + (index % cols) * 350 + 'px';
  }
  return instance;
}

function renderCanvas() {
  const canvas = document.getElementById('workspace-canvas');
  canvas.replaceChildren();
  // Keep the panel and widgets in separate lanes; avoid covering dropdown controls.
  const wide = window.innerWidth >= 960;
  // Manager is a built-in tool, not a database widget. Users cannot remove or duplicate it.
  const manager = makeWidget('add', 'manager-' + store.workspace.id, 0, wide);
  if (manager) {
    if (!manager.styleData.top) { manager.style.top = '14px'; manager.style.left = '14px'; }
    canvas.append(manager);
  }

  const managerBottom = manager ? manager.offsetTop + Math.max(manager.offsetHeight, 300) : 360;
  const managerWidth = manager ? Math.max(manager.offsetWidth, 370) : 490;
  store.workspace.widgets.forEach((id, index) => {
    const instance = store.getInstance(id);
    if (!instance) return;
    const el = makeWidget(instance.type, id, index, wide, managerBottom, managerWidth);
    if (el) canvas.append(el);
  });

  const categories = ['all', 'pinned', 'hidden', 'favorite',
    ...new Set(templates.filter(t => t.dataset.id !== 'add').map(t => t.dataset.category))];
  const nav = new NavigationBar(categories);
  document.getElementById('widget-navigation').replaceChildren(nav);
  nav.filterWidgets('all');
}

function shareInstance(id) {
  const alternatives = store.state.workspaces.filter(w => w.id !== store.workspace.id);
  if (!alternatives.length) {
    alert('Сначала создайте ещё один рабочий стол кнопкой + вверху.');
    return;
  }
  const choices = alternatives.map((w, index) =>
    String(index + 1) + '. ' + w.name + (w.widgets.includes(id) ? ' (уже есть)' : '')
  ).join('\n');
  const response = prompt('На каком рабочем столе показать тот же экземпляр ' + id + '?\n' + choices + '\nВведите номер:');
  if (response === null) return;
  const index = Number(response) - 1;
  if (!Number.isInteger(index) || !alternatives[index]) {
    alert('Неверный номер рабочего стола.');
    return;
  }
  if (!store.showInstance(id, alternatives[index].id)) {
    alert('Этот экземпляр уже отображается на выбранном рабочем столе.');
  } else {
    reload();
  }
}

function widgetAction(event) {
  const { action, type, id } = event.detail || {};
  switch (action) {
    case 'create':
      if (templates.some(t => t.dataset.id === type && type !== 'add') && store.createInstance(type)) reload();
      break;
    case 'link':
      if (store.showInstance(id)) reload();
      break;
    case 'clone':
      if (store.cloneInstance(id)) reload();
      break;
    case 'share':
      if (store.workspace.widgets.includes(id)) shareInstance(id);
      break;
    case 'remove':
      if (store.workspace.widgets.includes(id) && confirm('Убрать экземпляр ' + id + ' с этого стола?')) {
        store.removeInstanceFromWorkspace(id); reload();
      }
      break;
    default: break;
  }
}

async function boot() {
  try {
    document.documentElement.dataset.theme = store.state.system.theme.active === 'light' ? 'light' : 'dark';
    await loadTemplates();

    document.getElementById('clear-storage').addEventListener('click', () => {
      if (confirm('Очистить localStorage DashboardX? Все рабочие столы, виджеты, финансы и настройки этого приложения будут удалены без возможности отмены.')) {
        store.reset(); reload();
      }
    });
    document.getElementById('theme-toggle').addEventListener('click', () => {
      store.state.system.theme.active = store.state.system.theme.active === 'dark' ? 'light' : 'dark';
      store.save(); reload();
    });

    window.addEventListener('dashboardx:widget-action', widgetAction);
    window.addEventListener('dashboardx:remove-widget', event =>
      widgetAction({ detail: { action: 'remove', id: event.detail.id } })
    );
    window.addEventListener('dashboardx:share-widget', event => shareInstance(event.detail.id));
    eventBus.on('finance:dayBalanceWidget:updated', () => store.save());

    renderWorkspaceTabs();
    renderCanvas();
    // Fresh browser storage stays physically empty until the user makes a change.
    // Do not write starter/demo data simply because the page was opened.
    document.getElementById('app-loader')?.remove();
  } catch (error) {
    console.error('DashboardX startup failed:', error);
    const label = document.getElementById('loader-text');
    if (label) label.textContent = 'Ошибка запуска: ' + error.message;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
