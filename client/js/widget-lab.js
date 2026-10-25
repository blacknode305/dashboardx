import WidgetElement from './module/WidgetElement.js';
import widgetRegistry from './module/WidgetRegistry.js';

const iconTemplates = {
  iconSave: '<path d="M4 4h14l2 2v14H4z"/><path d="M16 4v6H8V4"/>',
  iconWorkplace: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  iconFavorite: '<path d="M12 3l3 6 6 .8-4.5 4.5L18 21l-6-3.3L6 21l1.5-6.7L3 9.8 9 9z"/>',
  iconPin: '<path d="M14 4l6 6M8 10l6 6M9 15l-5 5M15 9l5-5"/>',
  iconSize: '<path d="M4 10V4h6M20 14v6h-6"/>',
  iconHide: '<path d="M3 3l18 18M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>'
};
for (const [id, paths] of Object.entries(iconTemplates)) {
  const template = document.createElement('template');
  template.id = id;
  template.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + paths + '</svg>';
  document.body.append(template);
}

const definitions = [
  {id:'githubControl',category:'developer',title:'GitHub Control',x:26,y:135,w:355,h:315,
    html:'<div class="widget-lab-content"><div class="line"><input aria-label="GitHub owner/repo" data-role="repo" value="blacknode305/dashboardx"><button data-role="refresh">↻</button></div><p data-role="status"></p><div data-role="results"></div></div>'},
  {id:'serverMonitor',category:'developer',title:'Server Monitor',x:405,y:135,w:340,h:310,
    html:'<div class="widget-lab-content"><div class="line"><input aria-label="HTTP endpoint" data-role="endpoint" value="/"><button data-role="refresh">↻</button></div><p data-role="status"></p><div data-role="results"></div></div>'},
  {id:'smartContacts',category:'tools',title:'Smart Contacts',x:26,y:510,w:355,h:345,
    html:'<div class="widget-lab-content"><input type="file" accept=".vcf,text/vcard" aria-label="Импорт VCF" data-role="file"><input placeholder="Поиск имени, телефона, email" aria-label="Поиск контакта" data-role="search"><p data-role="status"></p><div data-role="results"></div></div>'},
  {id:'dashboardAi',category:'ai',title:'DashboardX AI',x:405,y:510,w:340,h:345,
    html:'<div class="widget-lab-content"><textarea rows="3" maxlength="4000" aria-label="Сообщение AI" data-role="prompt" placeholder="Спросить DashboardX AI…"></textarea><button data-role="send">Отправить</button><p data-role="status"></p><div data-role="results"></div></div>'},
  {id:'datetime',category:'system',title:'Date & Time (старый виджет)',x:770,y:135,w:280,h:155,
    html:'<div class="widget-lab-content"><div data-role="date"></div><div data-role="time"></div></div>'}
];

for (const item of definitions) {
  const template = document.createElement('template');
  template.dataset.widget = '';
  template.dataset.id = item.id;
  template.dataset.category = item.category;
  template.dataset.title = item.title;
  template.innerHTML = item.html;
  document.body.append(template);
}

for (const item of definitions) {
  const el = new WidgetElement({id:item.id,category:item.category,title:item.title});
  el.styleData.width ||= item.w + 'px';
  el.styleData.height ||= item.h + 'px';
  if (!localStorage.getItem(el.id)) {
    el.style.left = item.x + 'px';
    el.style.top = item.y + 'px';
  }
  document.body.append(el);
}
const summary = document.getElementById('registry-summary');
const showSummary = () => {
  summary.textContent = 'Зарегистрировано ' + widgetRegistry.list().length +
    ' из ' + definitions.length + ' виджетов (включая существующий DatetimeWidget)';
};
widgetRegistry.subscribe(showSummary);
showSummary();
