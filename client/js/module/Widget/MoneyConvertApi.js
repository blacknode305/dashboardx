import { t, locale } from '../i18n.js';
import {
  loadMoneyRates, listMoneyCurrencies, findMoneyCurrencies,
  calculateMoneyRate, RATE_REFRESH_MS
} from '../MoneyConvertRates.js';

const CODE = /^[A-Z0-9]{2,12}$/;

function normalizePair(pair) {
  if (!pair || typeof pair.from !== 'string' || typeof pair.to !== 'string') return null;
  const from = pair.from.toUpperCase(), to = pair.to.toUpperCase();
  return CODE.test(from) && CODE.test(to) && from !== to ? { from, to } : null;
}

export default class MoneyConvertApiWidget {
  constructor(widget) {
    this.widget = widget;
    this.instanceId = widget.instanceId;
    this.store = window.dashboardxStore;
    this.destroyed = false;
    this.rates = null;
    this.codes = [];
    this.nameFormatter = null;
    try { this.nameFormatter = new Intl.DisplayNames([locale()], { type: 'currency' }); }
    catch { /* Currency codes will still be searchable. */ }

    const state = this.store?.getWidgetState(this.instanceId);
    // IMPORTANT: never migrate the previous hard-coded KZT/RUB/ETH rows or
    // the old global window.db.rate cache. New pairs start empty.
    this.pairs = Array.isArray(state?.pairs)
      ? state.pairs.map(normalizePair).filter(Boolean) : [];
    this.pairs = [...new Map(this.pairs.map(pair => [pair.from + '/' + pair.to, pair])).values()];

    this.form = widget.querySelector('[data-role="fx-form"]');
    this.submit = widget.querySelector('[data-role="fx-add"]');
    this.refreshButton = widget.querySelector('[data-role="fx-refresh"]');
    this.status = widget.querySelector('[data-role="fx-status"]');
    this.results = widget.querySelector('[data-role="fx-pairs"]');
    this.count = widget.querySelector('[data-role="fx-count"]');
    this.combos = Object.fromEntries(['from', 'to'].map(side => [side, {
      input: widget.querySelector('[data-role="fx-input-' + side + '"]'),
      suggestions: widget.querySelector('[data-role="fx-suggestions-' + side + '"]'),
      selected: null
    }]));

    this.onSubmit = event => {
      event.preventDefault();
      this.addPair();
    };
    this.onRefresh = () => this.refreshRates(true);
    this.onOutside = event => {
      if (!this.widget.contains(event.target)) this.hideSuggestions();
    };
    this.form.addEventListener('submit', this.onSubmit);
    this.refreshButton.addEventListener('click', this.onRefresh);
    document.addEventListener('pointerdown', this.onOutside);

    for (const side of ['from', 'to']) {
      const combo = this.combos[side];
      combo.suggestions.id = this.instanceId + '-fx-options-' + side;
      combo.input.setAttribute('aria-controls', combo.suggestions.id);
      combo.onInput = () => {
        const current = combo.input.value.trim().toUpperCase();
        combo.selected = this.codes.includes(current) ? current : null;
        this.showSuggestions(side);
        this.updateSubmit();
      };
      combo.onFocus = () => this.showSuggestions(side);
      combo.onKeydown = event => {
        if (event.key === 'Escape') this.hideSuggestions();
        if (event.key === 'ArrowDown') {
          const buttons = combo.suggestions.querySelectorAll('button:not(:disabled)');
          if (buttons.length) {
            event.preventDefault();
            buttons[0].focus();
          }
        }
        if (event.key === 'Enter' && !combo.selected) {
          event.preventDefault();
          const first = combo.suggestions.querySelector('button:not(:disabled)');
          first?.click();
        }
      };
      combo.onListKeydown = event => {
        const options = [...combo.suggestions.querySelectorAll('button:not(:disabled)')];
        const position = options.indexOf(document.activeElement);
        if (event.key === 'Escape') {
          event.preventDefault();
          this.hideSuggestions();
          combo.input.focus();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          options[(position + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
        }
      };
      combo.input.addEventListener('input', combo.onInput);
      combo.input.addEventListener('focus', combo.onFocus);
      combo.input.addEventListener('keydown', combo.onKeydown);
      combo.suggestions.addEventListener('keydown', combo.onListKeydown);
    }

    this.updateSubmit();
    this.renderPairs();
    this.refreshRates();
    this.timer = setInterval(() => this.refreshRates(false), RATE_REFRESH_MS);
  }

  getName(code) {
    try {
      const name = this.nameFormatter?.of(code);
      return name && name !== code ? name : '';
    } catch { return ''; }
  }

  setStatus(key) {
    this.status.textContent = t(key);
  }

  hideSuggestions() {
    for (const combo of Object.values(this.combos)) {
      combo.suggestions.hidden = true;
      combo.input.setAttribute('aria-expanded', 'false');
    }
  }

  showSuggestions(side) {
    const combo = this.combos[side];
    this.hideSuggestions();
    if (!this.codes.length || this.destroyed) return;

    const list = combo.suggestions;
    list.replaceChildren();
    const matches = findMoneyCurrencies(this.codes, combo.input.value, code => this.getName(code));
    if (!matches.length) {
      list.hidden = true;
      return;
    }
    for (const code of matches) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'fx-choice';
      option.setAttribute('role', 'option');
      option.dataset.code = code;
      const short = document.createElement('strong');
      short.textContent = code;
      option.append(short);
      const fullName = this.getName(code);
      if (fullName) {
        const caption = document.createElement('span');
        caption.textContent = fullName;
        option.append(caption);
      }
      option.addEventListener('click', () => this.selectCurrency(side, code));
      list.append(option);
    }
    list.hidden = false;
    combo.input.setAttribute('aria-expanded', 'true');
  }

  selectCurrency(side, code) {
    if (!this.codes.includes(code)) return;
    const combo = this.combos[side];
    combo.selected = code;
    combo.input.value = code;
    this.hideSuggestions();
    this.updateSubmit();
  }

  updateSubmit() {
    const from = this.combos.from.selected;
    const to = this.combos.to.selected;
    this.submit.disabled = !from || !to || from === to || !this.rates;
  }

  addPair() {
    const from = this.combos.from.selected;
    const to = this.combos.to.selected;
    if (!this.rates || !from || !to || !this.codes.includes(from) || !this.codes.includes(to)) {
      this.setStatus('fx.invalid');
      return;
    }
    if (from === to) { this.setStatus('fx.same'); return; }
    if (this.pairs.some(pair => pair.from === from && pair.to === to)) {
      this.setStatus('fx.duplicate');
      return;
    }
    this.pairs.push({ from, to });
    this.store.updateWidgetState(this.instanceId, { pairs: this.pairs.map(pair => ({ ...pair })) });
    for (const combo of Object.values(this.combos)) {
      combo.selected = null;
      combo.input.value = '';
    }
    this.hideSuggestions();
    this.updateSubmit();
    this.renderPairs();
    this.setStatus('fx.updated');
  }

  removePair(from, to) {
    this.pairs = this.pairs.filter(pair => !(pair.from === from && pair.to === to));
    this.store.updateWidgetState(this.instanceId, { pairs: this.pairs.map(pair => ({ ...pair })) });
    this.renderPairs();
  }

  formatRate(value) {
    if (!Number.isFinite(value) || value <= 0) return t('fx.rateUnavailable');
    const decimals = value < 0.001 ? 10 : value < 1 ? 8 : 6;
    return new Intl.NumberFormat(locale(), { maximumFractionDigits: decimals }).format(value);
  }

  renderPairs() {
    this.count.textContent = String(this.pairs.length);
    this.results.replaceChildren();
    if (!this.pairs.length) {
      const message = document.createElement('p');
      message.className = 'fx-empty';
      message.textContent = t('fx.empty');
      this.results.append(message);
      return;
    }
    for (const pair of this.pairs) {
      const row = document.createElement('div');
      row.className = 'fx-pair';
      const content = document.createElement('div');
      content.className = 'fx-pair-content';
      const label = document.createElement('strong');
      label.className = 'fx-pair-title';
      label.textContent = pair.from + ' → ' + pair.to;
      const value = document.createElement('span');
      value.className = 'fx-pair-value';
      const rate = calculateMoneyRate(this.rates, pair.from, pair.to);
      value.textContent = rate === null
        ? t('fx.rateUnavailable')
        : '1 ' + pair.from + ' = ' + this.formatRate(rate) + ' ' + pair.to;
      content.append(label, value);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'fx-remove';
      remove.textContent = '×';
      remove.title = t('fx.delete');
      remove.setAttribute('aria-label', t('fx.delete') + ': ' + pair.from + '/' + pair.to);
      remove.addEventListener('click', () => this.removePair(pair.from, pair.to));
      row.append(content, remove);
      this.results.append(row);
    }
  }

  async refreshRates(force = false) {
    this.refreshButton.disabled = true;
    if (!this.rates) this.setStatus('fx.loading');
    try {
      const data = await loadMoneyRates(force);
      if (this.destroyed) return;
      this.rates = data.rates;
      this.codes = listMoneyCurrencies(data.rates);
      this.setStatus(data.stale ? 'fx.stale' : 'fx.ready');
      this.renderPairs();
      this.updateSubmit();
    } catch (error) {
      if (this.destroyed) return;
      console.warn('MoneyConvert unavailable:', error);
      this.setStatus('fx.offline');
    } finally {
      if (!this.destroyed) this.refreshButton.disabled = false;
    }
  }

  destroy() {
    this.destroyed = true;
    clearInterval(this.timer);
    this.form.removeEventListener('submit', this.onSubmit);
    this.refreshButton.removeEventListener('click', this.onRefresh);
    document.removeEventListener('pointerdown', this.onOutside);
    for (const combo of Object.values(this.combos)) {
      combo.input.removeEventListener('input', combo.onInput);
      combo.input.removeEventListener('focus', combo.onFocus);
      combo.input.removeEventListener('keydown', combo.onKeydown);
      combo.suggestions.removeEventListener('keydown', combo.onListKeydown);
    }
  }
}
