import { getCredential, setCredential, clearCredential } from '../CredentialStore.js';
import { OPTIMA_BASE, optimaRequest, setOptimaWritePassword, hasOptimaWritePassword } from '../OptimaAPI.js';

const find = (root, role) => root.querySelector('[data-role="' + role + '"]');
const make = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };

export default class OptimaSettingsWidget {
  constructor(widget) {
    this.widget = widget;
    this.controllers = new Set();
    this.listeners = [];
    this.destroyed = false;
    this.token = find(widget, 'os-token');
    this.password = find(widget, 'os-password');
    this.authStatus = find(widget, 'os-auth-status');
    this.serverStatus = find(widget, 'os-server-status');
    this.branchStatus = find(widget, 'os-branch-status');
    this.branchList = find(widget, 'os-branch-list');
    this.testButton = find(widget, 'os-test');
    this.backupButton = find(widget, 'os-backup');
    const tokenForm = find(widget, 'os-token-form');
    const passwordForm = find(widget, 'os-password-form');
    this.bind(tokenForm, 'submit', event => {
      event.preventDefault();
      const value = this.token.value.trim();
      if (!value) return this.report(this.authStatus, 'Введите Admin Token.', true);
      if (!setCredential('optima', value)) return this.report(this.authStatus, 'Не удалось сохранить токен.', true);
      this.token.value = '';
      this.report(this.authStatus, 'Admin Token задан. Проверка доступа выполняется на сервере.');
      this.load();
    });
    this.bind(find(widget, 'os-token-clear'), 'click', () => {
      clearCredential('optima');
      setOptimaWritePassword('');
      this.token.value = ''; this.password.value = '';
      this.branchList.replaceChildren();
      this.report(this.authStatus, 'Доступ отключён.');
      this.report(this.serverStatus, 'Нет подключения.');
      this.report(this.branchStatus, 'Требуется Admin Token.');
    });
    this.bind(passwordForm, 'submit', event => {
      event.preventDefault();
      if (!this.password.value) return this.report(this.authStatus, 'Введите пароль администратора.', true);
      setOptimaWritePassword(this.password.value);
      this.password.value = '';
      this.report(this.authStatus, 'Пароль действует только в открытой вкладке. Проверка на сервере обязательна для изменения PIN.');
      this.load();
    });
    this.bind(find(widget, 'os-password-clear'), 'click', () => {
      setOptimaWritePassword('');
      this.password.value = '';
      this.report(this.authStatus, 'Изменения заблокированы до повторного ввода пароля.');
    });
    this.bind(this.testButton, 'click', () => this.load());
    this.bind(this.backupButton, 'click', () => this.exportSnapshot());
    this.onCredential = event => {
      if (event.detail?.service === 'optima') this.load();
    };
    window.addEventListener('dashboardx:credential-changed', this.onCredential);
    this.report(this.authStatus, getCredential('optima')
      ? 'Admin Token задан.' + (hasOptimaWritePassword() ? ' Пароль администратора введён.' : ' Введите пароль для изменений.')
      : 'Admin Token отсутствует.');
    this.load();
  }
  bind(target, name, handler) {
    target?.addEventListener(name, handler);
    this.listeners.push(() => target?.removeEventListener(name, handler));
  }
  report(node, message, error = false) {
    if (this.destroyed || !node) return;
    node.textContent = message;
    if (error) node.setAttribute('role', 'alert');
    else node.removeAttribute('role');
  }
  async request(path, options = {}) {
    const controller = new AbortController();
    this.controllers.add(controller);
    try { return await optimaRequest(path, { ...options, signal: controller.signal }); }
    finally { this.controllers.delete(controller); }
  }
  async load() {
    if (!getCredential('optima')) {
      this.branchList.replaceChildren();
      this.report(this.serverStatus, 'Требуется Admin Token.');
      this.report(this.branchStatus, 'Подключитесь для просмотра настроек филиалов.');
      return;
    }
    const seq = this.seq = (this.seq || 0) + 1;
    this.testButton.disabled = true;
    this.report(this.serverStatus, 'Проверка соединения…');
    try {
      const [database, access] = await Promise.all([
        this.request('/api/admin/db'),
        this.request('/api/admin/access')
      ]);
      if (this.destroyed || seq !== this.seq) return;
      this.report(this.serverStatus, 'Railway · подключено · ревизия ' + String(database.revision ?? '—')
        + ' · поставщиков: ' + String(database.data?.suppliers?.length ?? 0));
      this.pinWriteVerified = access.passwordRequiredForPins === true;
      this.renderBranches(Array.isArray(access.branches) ? access.branches : []);
      this.report(this.branchStatus, this.pinWriteVerified
        ? 'Пароли филиалов хранятся на сервере в виде хешей. Сохранение защищено паролем администратора.'
        : 'Сохранение PIN отключено до установки серверной проверки пароля администратора.');
    } catch (error) {
      if (this.destroyed || seq !== this.seq) return;
      this.branchList.replaceChildren();
      this.report(this.serverStatus, error.status === 401 ? 'Нет доступа: проверьте Admin Token.' :
        'Не удалось загрузить: ' + String(error.message || error), true);
      this.report(this.branchStatus, 'Данные филиалов недоступны.');
    } finally {
      if (!this.destroyed && seq === this.seq) this.testButton.disabled = false;
    }
  }
  renderBranches(branches) {
    this.branchList.replaceChildren();
    if (!branches.length) {
      this.branchList.append(make('p', 'Филиалы ещё не настроены.'));
      return;
    }
    for (const record of branches) {
      const row = make('div'); row.className = 'os-branch';
      const heading = make('div', String(record.branch || '—'));
      heading.className = 'os-branch-name';
      heading.append(make('span', record.configured ? ' · пароль задан' : ' · пароль не задан'));
      const form = make('form'); form.className = 'os-row'; form.autocomplete = 'off';
      const input = make('input'); input.type = 'password'; input.autocomplete = 'new-password';
      input.placeholder = 'Новый PIN филиала (от 4 символов)';
      input.setAttribute('aria-label', 'Новый PIN: ' + String(record.branch || ''));
      const button = make('button', 'Сохранить'); button.type = 'submit';
      // Never enable a PIN mutation against an older server that only checks Admin Token.
      if (!this.pinWriteVerified) { input.disabled = true; button.disabled = true; }
      form.append(input, button);
      this.bind(form, 'submit', async event => {
        event.preventDefault();
        const pin = input.value;
        if (pin.length < 4) return this.report(this.branchStatus, 'Минимум 4 символа.', true);
        if (!hasOptimaWritePassword()) return this.report(this.branchStatus, 'Сначала введите пароль администратора.', true);
        button.disabled = true;
        try {
          await this.request('/api/admin/access', { method: 'PUT', body: JSON.stringify({ branch: record.branch, pin }) });
          this.report(this.branchStatus, 'Пароль филиала обновлён. Старые сессии отозваны.');
          this.load();
        } catch (error) {
          this.report(this.branchStatus, 'Не удалось обновить PIN: ' + String(error.message || error), true);
        } finally {
          input.value = '';
          if (!this.destroyed) button.disabled = false;
        }
      });
      row.append(heading, form);
      this.branchList.append(row);
    }
  }
  async exportSnapshot() {
    if (!getCredential('optima')) return this.report(this.serverStatus, 'Требуется Admin Token.', true);
    this.backupButton.disabled = true;
    const controller = new AbortController(); this.controllers.add(controller);
    try {
      const res = await fetch(OPTIMA_BASE + '/api/admin/export', {
        method: 'GET', cache: 'no-store', signal: controller.signal,
        headers: { Authorization: 'Bearer ' + getCredential('optima') }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      if (this.destroyed) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PRO_OPTIMA_backup_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.report(this.serverStatus, 'Копия JSON подготовлена. Файлы вложений выгружаются отдельно.');
    } catch (error) {
      if (!this.destroyed && !controller.signal.aborted)
        this.report(this.serverStatus, 'Экспорт не выполнен: ' + String(error.message || error), true);
    } finally {
      this.controllers.delete(controller);
      if (!this.destroyed) this.backupButton.disabled = false;
    }
  }
  destroy() {
    this.destroyed = true;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
    this.listeners.forEach(fn => fn());
    window.removeEventListener('dashboardx:credential-changed', this.onCredential);
    this.token.value = ''; this.password.value = '';
  }
}
