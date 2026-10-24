import eventBus from '../EventBus.js';

export default class FinanceSummaryWidget {
  constructor(widget) {
    this.widget = widget;
    this.onChange = () => this.render();
    eventBus.on('finance:dayBalanceWidget:updated', this.onChange);
    this.render();
  }

  render() {
    const blocks = this.widget.querySelectorAll('.finance-summary');
    if (blocks.length < 3) return;
    const rows = window.db.finance?.table || [];
    const income = rows.reduce((sum, row) => sum + Number(row.income || 0), 0);
    const expense = rows.reduce((sum, row) => sum + Number(row.expense || 0), 0);
    const result = income - expense;
    blocks[0].children[1].textContent = income.toFixed(0) + ' KZT';
    blocks[1].children[1].textContent = expense.toFixed(0) + ' KZT';
    blocks[2].children[1].className = result >= 0 ? 'blue-color' : 'red-color';
    blocks[2].children[1].textContent = result.toFixed(0) + ' KZT';
  }

  destroy() {
    eventBus.off('finance:dayBalanceWidget:updated', this.onChange);
  }
}
