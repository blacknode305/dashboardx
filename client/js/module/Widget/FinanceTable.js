import eventBus from '../EventBus.js';

export default class FinanceTableWidget {
  constructor(widget) {
    this.widget = widget;
    this.onChange = () => this.render();
    eventBus.on('finance:dayBalanceWidget:updated', this.onChange);
    this.render();
  }

  render() {
    const tbody = this.widget.querySelector('[data-role="rows"]');
    if (!tbody) return;
    tbody.replaceChildren();
    for (const row of window.db.finance?.table || []) {
      const tr = document.createElement('tr');
      const values = [
        [String(row.date || ''), ''],
        [Number(row.income || 0).toFixed(0) + ' KZT', 'green-color'],
        [Number(row.expense || 0).toFixed(0) + ' KZT', 'red-color'],
        [Number(row.result || 0).toFixed(0) + ' KZT', Number(row.result || 0) >= 0 ? 'blue-color' : 'red-color']
      ];
      for (const [value, className] of values) {
        const td = document.createElement('td');
        td.textContent = value; // Escape user data instead of injecting HTML.
        if (className) td.className = className;
        tr.append(td);
      }
      tbody.append(tr);
    }
  }

  destroy() {
    eventBus.off('finance:dayBalanceWidget:updated', this.onChange);
  }
}
