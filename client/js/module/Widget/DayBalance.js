import eventBus from '../EventBus.js';

export default class DayBalanceWidget {
  constructor(widget) {
    this.widget = widget;
    this.buttons = [];
    this.attach();
  }

  attach() {
    for (const type of ['income', 'expense']) {
      const button = this.widget.querySelector('[data-action="submit-' + type + '"]');
      const input = this.widget.querySelector('[data-input="' + type + '"]');
      if (!button || !input) continue;
      const click = () => {
        const amount = input.valueAsNumber;
        if (!Number.isFinite(amount) || amount <= 0) return;
        input.value = '';
        const date = new Date().toLocaleDateString('ru-RU');
        const finance = window.db.finance;
        if (!Array.isArray(finance.table)) finance.table = [];
        let row = finance.table.find(item => item.date === date);
        if (!row) {
          row = { date, income: 0, expense: 0, result: 0 };
          finance.table.push(row);
        }
        row[type] = Number(row[type] || 0) + amount;
        row.result = Number(row.income || 0) - Number(row.expense || 0);
        // Only the clicked widget updates the database, even with many instances on the same screen.
        window.dashboardxStore.save();
        eventBus.emit('finance:dayBalanceWidget:updated');
      };
      button.addEventListener('click', click);
      this.buttons.push([button, click]);
    }
  }

  destroy() {
    for (const [button, handler] of this.buttons) button.removeEventListener('click', handler);
  }
}
