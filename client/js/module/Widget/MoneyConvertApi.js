import eventBus from '../EventBus.js';

// Rates are optional: this local widget must not prevent DashboardX from loading offline.
export default class MoneyConvertApiWidget {
  constructor(widget) {
    this.widget = widget;
    this.onFinance = () => this.render();
    eventBus.on('finance:dayBalanceWidget:updated', this.onFinance);
    this.refreshRates();
    this.timer = setInterval(() => this.refreshRates(), 5 * 60 * 1000);
  }

  async refreshRates() {
    try {
      const response = await fetch('https://cdn.moneyconvert.net/api/latest.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      const rate = result.rates || {};
      window.db.rate.KZT = Number(rate.KZT) || null;
      window.db.rate.RUB = Number(rate.RUB) || null;
      window.db.rate.ETHM = Number(rate.ETH) || null;
      this.render();
    } catch (error) {
      console.warn('Exchange rates unavailable:', error);
      this.render();
    }
  }

  render() {
    const rate = window.db.rate || {};
    const rows = window.db.finance?.table || [];
    const total = rows.reduce((sum, row) => sum + Number(row.income || 0) - Number(row.expense || 0), 0);
    const kzt = rate.KZT, rub = rate.RUB, eth = rate.ETH;
    const fmt = (number, currency) => Number.isFinite(number) && number > 0 ? number.toFixed(2) + ' ' + currency : '—';
    const values = {
      'rate-kzt': fmt(kzt, 'KZT'),
      'rate-rub': fmt(kzt && rub ? kzt / rub : NaN, 'KZT'),
      'rate-rub-usd': fmt(rub, 'RUB'),
      'rate-eth': fmt(eth, 'USDT'),
      'rate-eth-m': fmt(rate.ETHM, 'USD'),
      'rate-eth-kzt': fmt(eth && kzt ? eth * kzt : NaN, 'KZT'),
      'rate-eth-rub': fmt(eth && rub ? eth * rub : NaN, 'RUB'),
      'result-usd': fmt(kzt ? total / kzt : NaN, 'USD')
    };
    for (const [role, text] of Object.entries(values)) {
      this.widget.querySelectorAll('[data-role="' + role + '"]').forEach(el => { el.textContent = text; });
    }
    this.widget.querySelectorAll('[data-role="result-usd"]').forEach(el => {
      el.className = total >= 0 ? 'blue-color' : 'red-color';
    });
  }

  destroy() {
    clearInterval(this.timer);
    eventBus.off('finance:dayBalanceWidget:updated', this.onFinance);
  }
}
