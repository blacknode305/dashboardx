import SmartContactsWidget from './module/Widget/SmartContacts.js';
import GitHubControlWidget from './module/Widget/GitHubControl.js';
import ServerMonitorWidget from './module/Widget/ServerMonitor.js';

const $ = id => document.getElementById(id);
const github = new GitHubControlWidget();
const monitor = new ServerMonitorWidget({ endpoint: '/' });

async function refreshGitHub() {
  const state = $('github-state');
  const data = $('github-data');
  data.replaceChildren();
  try {
    github.setRepository($('repo').value.trim());
    state.textContent = 'Загрузка GitHub…';
    const result = await github.refresh();
    if (result.status !== 'ready') {
      state.className = 'status error';
      state.textContent = result.error || 'Нет данных';
      return;
    }
    const info = result.data;
    state.className = 'status online';
    state.textContent = 'Данные обновлены: ' + new Date(result.updatedAt).toLocaleString('ru-RU');
    const name = document.createElement('h3');
    const link = document.createElement('a');
    link.textContent = info.fullName;
    link.href = 'https://github.com/' + github.repository;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    name.append(link);
    const description = document.createElement('p');
    description.textContent = info.description || 'Описание отсутствует';
    const stats = document.createElement('div');
    stats.className = 'stats';
    for (const [label, value] of [['Звёзды',info.stars],['Форки',info.forks],['Issues',info.openIssues]]) {
      const cell = document.createElement('div');
      cell.className = 'stat';
      const number = document.createElement('div'); number.className = 'num'; number.textContent = value;
      const text = document.createElement('div'); text.className = 'small'; text.textContent = label;
      cell.append(number,text); stats.append(cell);
    }
    const branch = document.createElement('p'); branch.textContent = 'Основная ветка: ' + info.defaultBranch;
    data.append(name,description,stats,branch);
  } catch (error) {
    state.className = 'status error';
    state.textContent = String(error.message || error);
  }
}
async function refreshMonitor() {
  const state = $('monitor-state');
  const data = $('monitor-data');
  data.replaceChildren();
  try {
    monitor.setEndpoint($('endpoint').value.trim());
    state.textContent = 'Проверка…';
    const result = await monitor.refresh();
    state.className = 'status ' + (result.status === 'online' ? 'online' : 'error');
    state.textContent = result.status === 'online' ? 'Сервис доступен' : 'Не удалось подтвердить доступность';
    const latency = document.createElement('p');
    latency.textContent = result.latencyMs == null ? 'Задержка неизвестна' : 'Ответ: ' + result.latencyMs + ' мс';
    const checked = document.createElement('p');
    checked.textContent = 'Проверено: ' + new Date(result.checkedAt).toLocaleString('ru-RU');
    const error = document.createElement('p');
    error.className = 'error'; error.textContent = result.error || '';
    data.append(latency,checked,error);
  } catch (error) {
    state.className = 'status error'; state.textContent = String(error.message || error);
  }
}
$('github-refresh').addEventListener('click',refreshGitHub);
$('monitor-refresh').addEventListener('click',refreshMonitor);
void refreshGitHub();
void refreshMonitor();

const contacts = new SmartContactsWidget();
function renderContacts() {
  const list = $('contacts-list');
  const results = contacts.search($('contact-query').value);
  list.replaceChildren();
  for (const item of results.slice(0,50)) {
    const entry=document.createElement('p');
    entry.textContent=[item.name,item.phone,item.email].filter(Boolean).join(' · ');
    list.append(entry);
  }
  $('contact-status').textContent=`${results.length} найдено, ${contacts.getState().count} всего`;
}
$('vcf-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try {
    if(file.size>5_000_000)throw new Error('Файл слишком большой (максимум 5 МБ)');
    const result=contacts.importVCF(await file.text());
    $('contact-status').textContent=`Импортировано: ${result.imported}`;
    renderContacts();
  } catch(error) {
    $('contact-status').textContent=String(error.message||error);
  }
});
$('contact-query').addEventListener('input',renderContacts);
