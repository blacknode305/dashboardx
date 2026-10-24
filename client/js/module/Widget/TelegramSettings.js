import { t } from '../i18n.js';
import { setTelegramToken, hasTelegramToken, clearTelegramToken } from '../TelegramSession.js';

export default class TelegramSettingsWidget {
  constructor(widget) {
    this.widget = widget;
    this.instanceId = widget.instanceId;
    this.form = widget.querySelector('[data-role="telegram-form"]');
    this.field = widget.querySelector('[data-role="telegram-token"]');
    // Multiple settings widgets may coexist. Associate each label with its own input.
    this.field.id = this.instanceId + '-token';
    const tokenLabel = widget.querySelector('.tg-settings-form label');
    if (tokenLabel) tokenLabel.htmlFor = this.field.id;
    this.reveal = widget.querySelector('[data-role="telegram-reveal"]');
    this.clear = widget.querySelector('[data-role="telegram-clear"]');
    this.status = widget.querySelector('[data-role="telegram-status"]');
    this.onSubmit = event => {
      event.preventDefault();
      const entered = this.field.value.trim();
      if (!entered || !setTelegramToken(this.instanceId, entered)) {
        this.status.textContent = t('tg.invalid');
        return;
      }
      this.field.value = ''; // Keep the secret out of live DOM when not editing.
      this.field.type = 'password';
      this.reveal.textContent = t('tg.show');
      this.status.textContent = t('tg.saved');
    };
    this.onReveal = () => {
      this.field.type = this.field.type === 'password' ? 'text' : 'password';
      this.reveal.textContent = t(this.field.type === 'password' ? 'tg.show' : 'tg.hide');
    };
    this.onClear = () => {
      clearTelegramToken(this.instanceId);
      this.field.value = '';
      this.field.type = 'password';
      this.reveal.textContent = t('tg.show');
      this.status.textContent = t('tg.cleared');
    };
    this.form.addEventListener('submit', this.onSubmit);
    this.reveal.addEventListener('click', this.onReveal);
    this.clear.addEventListener('click', this.onClear);
    this.status.textContent = t(hasTelegramToken(this.instanceId) ? 'tg.saved' : 'tg.cleared');
  }
  destroy() {
    this.field.value = '';
    this.form.removeEventListener('submit', this.onSubmit);
    this.reveal.removeEventListener('click', this.onReveal);
    this.clear.removeEventListener('click', this.onClear);
  }
}
