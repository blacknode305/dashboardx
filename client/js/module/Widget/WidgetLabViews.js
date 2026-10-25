/**
 * DOM adapters for the standard DashboardX WidgetElement lifecycle.
 * Data controllers remain independent and usable by later Spatial AR surfaces.
 * Only textContent is used for external data; never inject API text as HTML.
 */
import GitHubControlController from './GitHubControl.js';
import ServerMonitorController from './ServerMonitor.js';
import SmartContactsController from './SmartContacts.js';
import DashboardAIController from './DashboardAI.js';

const byRole = (widget, role) => widget.body.querySelector('[data-role="' + role + '"]');
function line(label, value) {
  const el = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = label + ': ';
  el.append(strong, document.createTextNode(String(value ?? '—')));
  return el;
}
function setStatus(widget, message, error = false) {
  const status = byRole(widget, 'status');
  if (!status) return;
  status.textContent = message;
  status.dataset.level = error ? 'error' : 'normal';
}

export class GithubControlWidgetView {
  constructor(widget) {
    this.widget = widget;
    this.controller = new GitHubControlController();
    this.list = byRole(widget, 'results');
    this.input = byRole(widget, 'repo');
    this.onRefresh = () => { void this.refresh(); };
    this.button = byRole(widget, 'refresh');
    this.button?.addEventListener('click', this.onRefresh);
    void this.refresh();
  }
  async refresh() {
    try {
      this.controller.setRepository(this.input?.value.trim() || 'blacknode305/dashboardx');
      setStatus(this.widget, 'Загрузка…');
      const state = await this.controller.refresh();
      this.list.replaceChildren();
      if (state.status !== 'ready') {
        setStatus(this.widget, state.error || 'Нет данных', true);
        return;
      }
      const d = state.data;
      setStatus(this.widget, 'Публичный репозиторий · обновлено ' + new Date(state.updatedAt).toLocaleTimeString('ru-RU'));
      const link = document.createElement('a');
      link.href = 'https://github.com/' + this.controller.repository;
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      link.textContent = d.fullName;
      this.list.append(link, line('Ветка', d.defaultBranch), line('Звёзды', d.stars),
        line('Форки', d.forks), line('Issues', d.openIssues));
    } catch (error) {
      setStatus(this.widget, String(error.message || error), true);
    }
  }
  destroy() { this.button?.removeEventListener('click', this.onRefresh); this.controller.destroy(); }
}

export class ServerMonitorWidgetView {
  constructor(widget) {
    this.widget = widget;
    this.controller = new ServerMonitorController({endpoint:'/'});
    this.input = byRole(widget, 'endpoint');
    this.list = byRole(widget, 'results');
    this.onRefresh = () => { void this.refresh(); };
    this.button = byRole(widget, 'refresh');
    this.button?.addEventListener('click', this.onRefresh);
    void this.refresh();
  }
  async refresh() {
    try {
      this.controller.setEndpoint(this.input?.value.trim() || '/');
      setStatus(this.widget, 'Проверка…');
      const state = await this.controller.refresh();
      this.list.replaceChildren();
      const ok = state.status === 'online';
      setStatus(this.widget, ok ? 'Доступен' : ('Ошибка / неизвестно: ' + (state.error || state.status)), !ok);
      this.list.append(line('Ответ', state.latencyMs == null ? '—' : state.latencyMs + ' мс'),
        line('Проверено', state.checkedAt ? new Date(state.checkedAt).toLocaleTimeString('ru-RU') : '—'));
    } catch (error) {
      setStatus(this.widget, String(error.message || error), true);
    }
  }
  destroy() { this.button?.removeEventListener('click', this.onRefresh); this.controller.destroy(); }
}

export class SmartContactsWidgetView {
  constructor(widget) {
    this.widget = widget;
    this.controller = new SmartContactsController();
    this.file = byRole(widget,'file');
    this.search = byRole(widget,'search');
    this.list = byRole(widget,'results');
    this.onImport = event => { void this.importFile(event); };
    this.onSearch = () => this.render();
    this.file?.addEventListener('change',this.onImport);
    this.search?.addEventListener('input',this.onSearch);
    setStatus(widget,'Контакты только в памяти вкладки · без загрузки на сервер');
  }
  async importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Файл больше 5 МБ');
      const result = this.controller.importVCF(await file.text());
      setStatus(this.widget, 'Импортировано: ' + result.imported + '. Всего: ' + result.total);
      this.render();
    } catch(error) { setStatus(this.widget, String(error.message || error), true); }
    this.file.value = '';
  }
  render() {
    this.list.replaceChildren();
    const entries = this.controller.search(this.search?.value || '');
    for (const item of entries.slice(0, 30)) {
      const row = document.createElement('p');
      row.textContent = [item.name, item.phone, item.email].filter(Boolean).join(' · ');
      this.list.append(row);
    }
    if (!entries.length) this.list.append(line('Контакты','ничего не найдено'));
  }
  destroy() {
    this.file?.removeEventListener('change',this.onImport);
    this.search?.removeEventListener('input',this.onSearch);
    this.controller.destroy();
  }
}

export class DashboardAiWidgetView {
  constructor(widget) {
    this.widget = widget;
    this.controller = new DashboardAIController();
    this.input = byRole(widget,'prompt');
    this.list = byRole(widget,'results');
    this.button = byRole(widget,'send');
    this.onAsk = () => { void this.ask(); };
    this.button?.addEventListener('click',this.onAsk);
    setStatus(widget,'Для работы необходим защищённый серверный /api/ai/chat; ключ не хранится в браузере');
  }
  async ask() {
    if (!this.input?.value.trim()) return;
    this.button.disabled = true;
    setStatus(this.widget,'Ожидание ответа…');
    try {
      const reply = await this.controller.ask(this.input.value);
      const row = document.createElement('p');
      row.textContent = reply;
      this.list.prepend(row);
      this.input.value = '';
      setStatus(this.widget,'Ответ получен');
    } catch(error) {
      setStatus(this.widget, 'AI не подключён: ' + String(error.message || error), true);
    } finally { this.button.disabled = false; }
  }
  destroy() { this.button?.removeEventListener('click',this.onAsk); this.controller.destroy(); }
}
