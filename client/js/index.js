import eventBus from './module/EventBus.js';
import ClientDB from './module/ClientDB.js';
import WidgetElement from './module/WidgetElement.js';
import NavigationBar from './module/NavigationBar.js';
import { t, widgetTitle, setLanguage, translateElement } from './module/i18n.js';

// Canonical catalog of ALL original DashboardX widgets and their original categories.
// Entries are available immediately; HTML template loading does not control the menu.
const WIDGET_CATALOG = Object.freeze({
  add:            {category:'system',   file:'_add.html',             builtIn:true},
  datetime:       {category:'system',   file:'_datetime.html'},
  dayBalance:     {category:'finance',  file:'_dayBalance.html'},
  financeSummary: {category:'finance',  file:'_financeSummary.html'},
  financeTable:   {category:'finance',  file:'_financeTable.html'},
  moneyConvertApi:{category:'finance',  file:'_moneyConvertApi.html'},
  binanceApi:     {category:'finance',  file:'_binanceApi.html'},
  calculator:     {category:'tools',    file:'_calculator.html'},
  wishlistPrice:  {category:'finance',  file:'_wishlistPrice.html'},
  wishlistGames:  {category:'tools',    file:'_wishlistGames.html'},
  audioPlayer:    {category:'media',    file:'_audioPlayer.html',      serverOnly:true},
  videoPlayer:    {category:'media',    file:'_videoPlayer.html'},
  serverConsole:  {category:'system',   file:'_serverConsole.html',   serverOnly:true},
  telegramBot:    {category:'telegram', file:'_telegramBot.html',     serverOnly:true},
  dashboardSettings:{category:'system',file:'_dashboardSettings.html'},
  optimaSuppliers:{category:'optima',file:'_optimaSuppliers.html'},
  optimaProducts:{category:'optima',file:'_optimaProducts.html'},
  optimaProposals:{category:'optima',file:'_optimaProposals.html'},
  optimaOffers:{category:'optima',file:'_optimaOffers.html'},
  optimaCompare:{category:'optima',file:'_optimaCompare.html'},
  optimaStocks:{category:'optima',file:'_optimaStocks.html'},
  optimaOrders:{category:'optima',file:'_optimaOrders.html'},
  torrentTracker: {category:'tools',    file:'_torrentTracker.html'},
  nesEmulator:    {category:'games',    file:'_nesEmulator.html'}
});
window.dashboardxCatalog=WIDGET_CATALOG;
const CATALOG_ENTRIES = Object.entries(WIDGET_CATALOG);
window.dashboardxTemplates = CATALOG_ENTRIES.map(([id,entry])=>({
  id, category:entry.category, title:widgetTitle(id,id),serverOnly:Boolean(entry.serverOnly)
}));
const store = new ClientDB();
let navBar=null;
// Focus is ephemeral, per workspace, and never written to localStorage.
const activeWidgetByWorkspace = new Map();
const deskName = w => w.name === 'Главная' ? t('ui.defaultWorkspace') : w.name;
window.dashboardxStore = store;
let templates = [];

function fallbackTemplate(id,entry) {
  const template=document.createElement('template');
  template.dataset.widget='';
  template.dataset.id=id;
  template.dataset.category=entry.category;
  template.dataset.title=widgetTitle(id,id);
  const message=document.createElement('p');
  message.className='widget-template-notice';
  message.textContent=t('ui.templateUnavailable');
  template.content.append(message);
  return template;
}

async function loadTemplates() {
  const results=await Promise.allSettled(CATALOG_ENTRIES.map(async ([id,entry])=>{
    // The manager template is embedded in index.html to survive template fetch failures.
    const embedded=document.querySelector('template[data-widget][data-id="'+id+'"]');
    if(embedded) return {id,template:embedded};
    const response=await fetch(new URL('../'+entry.file,import.meta.url));
    if(!response.ok)throw Error(entry.file+': HTTP '+response.status);
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    const source=doc.querySelector('template[data-widget][data-id="'+id+'"]');
    if(!source)throw Error(entry.file+': expected template '+id+' missing');
    return {id,template:document.importNode(source,true)};
  }));
  for(let i=0;i<CATALOG_ENTRIES.length;i++){
    const [id,entry]=CATALOG_ENTRIES[i];
    const result=results[i];
    const template=result.status==='fulfilled'?result.value.template:fallbackTemplate(id,entry);
    if(result.status==='rejected')console.warn('Widget template failed; using placeholder:',id,result.reason);
    if(!template.isConnected)document.body.appendChild(template);
  }
  templates=CATALOG_ENTRIES.map(([id,entry])=>({
    id,category:entry.category,title:widgetTitle(id,id),
    serverOnly:Boolean(entry.serverOnly),
    template:document.querySelector('template[data-widget][data-id="'+id+'"]')
  }));
  // Not derived from fetch results; keeps every original widget visible in the picker.
  window.dashboardxTemplates=templates.map(({id,category,title,serverOnly})=>({id,category,title,serverOnly}));
}

function reload() {
  location.reload();
}

// Mouse, keyboard and widget actions share the same renderer. No page refresh.
function activateWorkspace(id) {
  if (id !== store.workspace.id && !store.selectWorkspace(id)) return false;
  renderWorkspaceTabs();
  renderCanvas();
  const canvas = document.getElementById('workspace-canvas');
  canvas.scrollTop = 0;
  canvas.scrollLeft = 0;
  measureHeader();
  return true;
}
function updateWorkspace() {
  return activateWorkspace(store.workspace.id);
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
      activateWorkspace(workspace.id);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'workspace-delete';
    remove.textContent = '×';
    remove.title = t('ui.deleteWorkspace') + ': ' + deskName(workspace);
    remove.setAttribute('aria-label', remove.title);
    remove.addEventListener('click', () => {
      const question = t('ui.confirmDelete',{name:deskName(workspace)});
      if (confirm(question) && store.deleteWorkspace(workspace.id)) {
        activeWidgetByWorkspace.delete(workspace.id);
        updateWorkspace();
      }
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
    if (name && store.addWorkspace(name)) updateWorkspace();
  });
  tabs.append(create); // Always exactly one permanent + tile, after all desktops.
}

function makeWidget(type, instanceId, index, wide, managerBottom = 400, managerWidth = 490) {
  const template = templates.find(t => t.id === type);
  if (!template) return null;
  const instance = document.createElement('widget-element');
  instance.initialize({
    id: type,
    instanceId,
    workspaceId: store.workspace.id,
    legacyKey: store.getInstance(instanceId)?.legacyKey,
    category: template.category || 'other',
    title: widgetTitle(type,template.title || type)
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

// Canvas scrolls independently of the header and its stationary wallpaper.
function updateCanvasHeight() {
  const canvas=document.getElementById('workspace-canvas');
  const surface=document.getElementById('workspace-surface');
  if(!canvas || !surface)return;
  let bottom=canvas.clientHeight;
  let right=canvas.clientWidth;
  surface.querySelectorAll('widget-element').forEach(el=>{
    if(el.style.display==='none')return;
    bottom=Math.max(bottom,el.offsetTop+el.offsetHeight+120);
    right=Math.max(right,el.offsetLeft+el.offsetWidth+80);
  });
  surface.style.height=Math.ceil(bottom)+'px';
  surface.style.width=Math.ceil(right)+'px';
}

// The canvas begins at Y=0: dragging never creates content above its top edge.
// Its bounds may only expand downwards and rightwards.
window.dashboardxUpdateWorkspaceBounds=updateCanvasHeight;

function measureHeader() {
  const toolbar=document.getElementById('app-toolbar');
  const nav=document.getElementById('widget-navigation');
  if(!toolbar || !nav)return;
  const barHeight=toolbar.offsetHeight;
  nav.style.top=barHeight+'px';
  document.documentElement.style.setProperty('--dashboard-head-height',barHeight+nav.offsetHeight+'px');
  updateCanvasHeight();
}


function renderCanvas() {
  const canvas = document.getElementById('workspace-canvas');
  const surface=document.createElement('div');
  surface.id='workspace-surface';
  canvas.replaceChildren(surface);
  const image=store.workspace.backgroundUrl;
  // Wallpaper belongs to the viewport, not the scrollable content.
  document.body.style.backgroundImage=image
    ? 'linear-gradient(rgba(7,12,22,.13),rgba(7,12,22,.18)),url('+JSON.stringify(image)+')' : '';
  document.body.classList.toggle('has-custom-wallpaper',Boolean(image));
  // Keep the panel and widgets in separate lanes; avoid covering dropdown controls.
  const wide = window.innerWidth >= 960;
  // Manager is a built-in tool, not a database widget. Users cannot remove or duplicate it.
  const manager = makeWidget('add', 'manager-' + store.workspace.id, 0, wide);
  if (manager) {
    if (!manager.styleData.top) { manager.style.top = '14px'; manager.style.left = '14px'; }
    surface.append(manager);
  }

  const managerBottom = manager ? manager.offsetTop + Math.max(manager.offsetHeight, 300) : 360;
  const managerWidth = manager ? Math.max(manager.offsetWidth, 370) : 490;
  store.workspace.widgets.forEach((id, index) => {
    const instance = store.getInstance(id);
    if (!instance) return;
    const el = makeWidget(instance.type, id, index, wide, managerBottom, managerWidth);
    if (el) surface.append(el);
  });

  const categories = ['all', 'pinned', 'hidden', 'favorite',
    ...new Set(templates.filter(t => t.id !== 'add').map(t => t.category))];
  navBar = document.createElement('navigation-bar');
  navBar.initialize(categories);
  document.getElementById('widget-navigation').replaceChildren(navBar);
  navBar.filterWidgets('all');
  const rememberedId = activeWidgetByWorkspace.get(store.workspace.id);
  const selected = [...surface.querySelectorAll('widget-element')].find(el =>
    el.instanceId === rememberedId && el.style.display !== 'none'
  ) || manager;
  selected?.activate();
  updateCanvasHeight();
}


/**
 * Switch workspaces in place, so holding D + Alt and tapping Tab repeatedly
 * keeps cycling without resetting the keyboard state on a page reload.
 * OS-level Alt+Tab cannot be intercepted if the browser never receives it.
 */
function switchWorkspaceWithShortcut(step) {
  const workspaces = store.state.workspaces;
  if (workspaces.length < 2) return false;
  const currentIndex = workspaces.findIndex(ws => ws.id === store.state.activeWorkspaceId);
  const index = currentIndex < 0 ? 0 : currentIndex;
  const nextIndex = (index + step + workspaces.length) % workspaces.length;
  return activateWorkspace(workspaces[nextIndex].id);
}

function installWorkspaceShortcuts() {
  let dHeld = false;
  window.addEventListener('keydown', event => {
    if (event.code === 'KeyD') {
      if (!event.repeat) dHeld = true;
      // Chrome normally uses Alt+D to focus the address bar.
      if (event.altKey && store.state.workspaces.length > 1 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
      }
      return;
    }
    if (!dHeld || !event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const tab = event.code === 'Tab';
    const right = event.code === 'ArrowRight';
    const left = event.code === 'ArrowLeft';
    if ((!tab && !right && !left) || store.state.workspaces.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    switchWorkspaceWithShortcut(left || (tab && event.shiftKey) ? -1 : 1);
  }, true);
  window.addEventListener('keyup', event => {
    if (event.code === 'KeyD') dHeld = false;
  }, true);
  window.addEventListener('blur', () => { dHeld = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) dHeld = false;
  });
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
    updateWorkspace();
  }
}

function widgetAction(event) {
  const { action, type, id } = event.detail || {};
  switch (action) {
    case 'create':
      if (WIDGET_CATALOG[type] && type !== 'add' && store.createInstance(type)) updateWorkspace();
      break;
    case 'link':
      if (store.showInstance(id)) updateWorkspace();
      break;
    case 'clone':
      if (store.cloneInstance(id)) updateWorkspace();
      break;
    case 'share':
      if (store.workspace.widgets.includes(id)) shareInstance(id);
      break;
    case 'remove':
      if (store.workspace.widgets.includes(id) && confirm(t('ui.confirmRemove',{id}))) {
        store.removeInstanceFromWorkspace(id); updateWorkspace();
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
    document.getElementById('theme-toggle').textContent = store.state.system.theme.active === 'dark' ? '☼' : '☾';
    document.getElementById('theme-toggle').title = t('ui.theme');
    const languageSwitch = document.getElementById('language-switch');
    languageSwitch.value = store.state.system.language;
    const languageButtons = document.querySelectorAll('.language-pills [data-lang]');
    const syncLanguageButtons = () => {
      languageButtons.forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.lang === languageSwitch.value))
      );
    };
    languageSwitch.addEventListener('change', () => {
      store.state.system.language = languageSwitch.value;
      store.save();
      setLanguage(languageSwitch.value);
      translateElement(document);
      updateWorkspace();
      syncLanguageButtons();
    });
    languageButtons.forEach(button => button.addEventListener('click', () => {
      if (languageSwitch.value === button.dataset.lang) return;
      languageSwitch.value = button.dataset.lang;
      languageSwitch.dispatchEvent(new Event('change', { bubbles: true }));
    }));
    syncLanguageButtons();
    const fullscreenButton=document.getElementById('fullscreen-toggle');
    const updateFullscreenLabel=()=>{
      fullscreenButton.textContent=t(document.fullscreenElement?'ui.exitFullscreen':'ui.fullscreen');
      fullscreenButton.title=fullscreenButton.textContent;
    };
    fullscreenButton.addEventListener('click',async()=>{
      try{
        if(document.fullscreenElement)await document.exitFullscreen();
        else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
      }catch(error){console.warn('Fullscreen is unavailable:',error);}
    });
    document.addEventListener('fullscreenchange',updateFullscreenLabel);
    updateFullscreenLabel();
        document.getElementById('background-button').addEventListener('click', () => {
      const raw=prompt(t('ui.backgroundPrompt',{name:deskName(store.workspace)}),store.workspace.backgroundUrl || '');
      if (raw === null) return;
      if (!store.setWorkspaceBackground(raw.trim())) {alert(t('ui.backgroundInvalid'));return;}
      updateWorkspace();
    });
    await loadTemplates();

    document.getElementById('clear-storage').addEventListener('click', () => {
      if (confirm(t('ui.confirmReset'))) {
        store.reset(); reload();
      }
    });
    document.getElementById('theme-toggle').addEventListener('click', () => {
      store.state.system.theme.active = store.state.system.theme.active === 'dark' ? 'light' : 'dark';
      store.save();
      document.documentElement.dataset.theme = store.state.system.theme.active;
      document.getElementById('theme-toggle').textContent = store.state.system.theme.active === 'dark' ? '☼' : '☾';
    document.getElementById('theme-toggle').title = t('ui.theme');
    });

    window.addEventListener('dashboardx:widget-action', widgetAction);
    window.addEventListener('dashboardx:remove-widget', event =>
      widgetAction({ detail: { action: 'remove', id: event.detail.id } })
    );
    window.addEventListener('dashboardx:share-widget', event => shareInstance(event.detail.id));
    window.addEventListener('dashboardx:widget-layout', updateCanvasHeight);
    window.addEventListener('dashboardx:widget-activated', event => {
      const { workspaceId, id } = event.detail || {};
      if (workspaceId && id) activeWidgetByWorkspace.set(workspaceId, id);
    });
    // Future widgets can listen for dashboardx:widget-keydown on their element.
    // No default arrow-key actions yet: input fields and page shortcuts keep working.
    window.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.isComposing ||
          event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target?.isContentEditable ||
          target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const active = document.querySelector('#workspace-surface > widget-element.is-focus');
      if (!active || active.style.display === 'none') return;
      active.dispatchEvent(new CustomEvent('dashboardx:widget-keydown', {
        detail: { key:event.key, code:event.code, originalEvent:event },
        bubbles:false
      }));
    });
    window.addEventListener('dashboardx:widget-visibility', () => {
      const category=document.querySelector('#widget-navigation .nav--element[aria-pressed="true"]')?.dataset.category || 'all';
      navBar?.filterWidgets(category);
    });
    eventBus.on('finance:dayBalanceWidget:updated', () => store.save());

    renderWorkspaceTabs();
    renderCanvas();
    measureHeader();
    installWorkspaceShortcuts();
    if(typeof ResizeObserver==='function'){
      const observer=new ResizeObserver(measureHeader);
      observer.observe(document.getElementById('app-toolbar'));
    }
    window.addEventListener('resize',measureHeader);
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
