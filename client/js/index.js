import eventBus from './module/EventBus.js';
import ClientDB from './module/ClientDB.js';
import WidgetElement from './module/WidgetElement.js';
import NavigationBar from './module/NavigationBar.js';
import { t, widgetTitle, setLanguage, translateElement } from './module/i18n.js';

const filenames = [
  '_add.html', '_audioPlayer.html', '_binanceApi.html', '_calculator.html',
  '_datetime.html', '_dayBalance.html', '_financeSummary.html', '_financeTable.html',
  '_moneyConvertApi.html', '_nesEmulator.html', '_serverConsole.html', '_telegramBot.html',
  '_torrentTracker.html', '_videoPlayer.html', '_wishlistGames.html', '_wishlistPrice.html'
];
const disabled = new Set(['audioPlayer', 'serverConsole', 'telegramBot']);
const store = new ClientDB();
let navBar=null;
const deskName = w => w.name === 'Главная' ? t('ui.defaultWorkspace') : w.name;
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
    throw new Error(t('ui.templatesMissing'));
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
    title.textContent = deskName(workspace);
    title.title = t('ui.goWorkspace') + ': ' + deskName(workspace);
    title.setAttribute('aria-pressed', String(workspace.id === store.workspace.id));
    title.addEventListener('click', () => {
      if (store.selectWorkspace(workspace.id)) reload();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'workspace-delete';
    remove.textContent = '×';
    remove.title = t('ui.deleteWorkspace') + ': ' + deskName(workspace);
    remove.setAttribute('aria-label', remove.title);
    remove.addEventListener('click', () => {
      const question = t('ui.confirmDelete',{name:deskName(workspace)});
      if (confirm(question) && store.deleteWorkspace(workspace.id)) reload();
    });
    tile.append(title, remove);
    tabs.append(tile);
  }
  const create = document.createElement('button');
  create.type = 'button';
  create.id = 'create-workspace';
  create.textContent = '+';
  create.title = t('ui.createWorkspace');
  create.setAttribute('aria-label', create.title);
  create.addEventListener('click', () => {
    const name = prompt(t('ui.newWorkspace'));
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
    title: widgetTitle(type,template.dataset.title || type)
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

function updateCanvasHeight() {
  const canvas=document.getElementById('workspace-canvas');
  let height=Math.max(480,window.innerHeight - canvas.getBoundingClientRect().top);
  canvas.querySelectorAll('widget-element').forEach(el=>{
    if (el.style.display !== 'none') height=Math.max(height,el.offsetTop + el.offsetHeight + 55);
  });
  canvas.style.minHeight=Math.ceil(height)+'px';
}

function renderCanvas() {
  const canvas = document.getElementById('workspace-canvas');
  canvas.replaceChildren();
  const image=store.workspace.backgroundUrl;
  canvas.style.backgroundImage=image ? 'linear-gradient(rgba(7,12,22,.18),rgba(7,12,22,.2)), url(' + JSON.stringify(image) + ')' : '';
  canvas.classList.toggle('has-background',Boolean(image));
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
  navBar = new NavigationBar(categories);
  document.getElementById('widget-navigation').replaceChildren(navBar);
  navBar.filterWidgets('all');
  updateCanvasHeight();
}

function shareInstance(id) {
  const alternatives = store.state.workspaces.filter(w => w.id !== store.workspace.id);
  if (!alternatives.length) {
    alert(t('ui.otherWorkspace'));
    return;
  }
  const choices = alternatives.map((w, index) =>
    String(index + 1) + '. ' + deskName(w) + (w.widgets.includes(id) ? ' ('+t('ui.alreadyThere')+')' : '')
  ).join('\n');
  const response = prompt(t('ui.sharePrompt',{id,choices}));
  if (response === null) return;
  const index = Number(response) - 1;
  if (!Number.isInteger(index) || !alternatives[index]) {
    alert(t('ui.invalidWorkspace'));
    return;
  }
  if (!store.showInstance(id, alternatives[index].id)) {
    alert(t('ui.already'));
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
      if (store.workspace.widgets.includes(id) && confirm(t('ui.confirmRemove',{id}))) {
        store.removeInstanceFromWorkspace(id); reload();
      }
      break;
    default: break;
  }
}

async function boot() {
  try {
    document.documentElement.dataset.theme = store.state.system.theme.active === 'light' ? 'light' : 'dark';
    setLanguage(store.state.system.language);
    translateElement(document);
    document.getElementById('theme-toggle').textContent =
      (store.state.system.theme.active === 'dark' ? '☼ ' : '☾ ') + t('ui.theme');
    const languageSwitch = document.getElementById('language-switch');
    languageSwitch.value = store.state.system.language;
    languageSwitch.addEventListener('change', () => {
      store.state.system.language = languageSwitch.value;
      store.save();reload();
    });
    document.getElementById('background-button').addEventListener('click', () => {
      const raw=prompt(t('ui.backgroundPrompt',{name:deskName(store.workspace)}),store.workspace.backgroundUrl || '');
      if (raw === null) return;
      if (!store.setWorkspaceBackground(raw.trim())) {alert(t('ui.backgroundInvalid'));return;}
      reload();
    });
    await loadTemplates();

    document.getElementById('clear-storage').addEventListener('click', () => {
      if (confirm(t('ui.confirmReset'))) {
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
    window.addEventListener('dashboardx:widget-layout', updateCanvasHeight);
    window.addEventListener('dashboardx:widget-visibility', () => {
      const category=document.querySelector('#widget-navigation .nav--element[aria-pressed="true"]')?.dataset.category || 'all';
      navBar?.filterWidgets(category);
    });
    eventBus.on('finance:dayBalanceWidget:updated', () => store.save());

    renderWorkspaceTabs();
    renderCanvas();
    // Fresh browser storage stays physically empty until the user makes a change.
    // Do not write starter/demo data simply because the page was opened.
    document.getElementById('app-loader')?.remove();
  } catch (error) {
    console.error('DashboardX startup failed:', error);
    const label = document.getElementById('loader-text');
    if (label) label.textContent = t('ui.startError',{error:error.message});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
