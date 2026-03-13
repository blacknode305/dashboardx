// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class FinanceSummaryWidget {
  constructor(widget) {
    this.widget = widget;
    this.initEventBus();
    // Загружаем данные
    this.loadData();
    // Отрисовка итоговых сумм
    this.renderFinanceSummary();
  }
  // Подписка на события
  initEventBus() {
    // Слушаем событие добавления финансов
    eventBus.on('finance:dayBalanceWidget:updated', () => {
      // Загружаем данные
      this.loadData();
      // Рендерим данные
      this.renderFinanceSummary();
      // Запускаем событие после отрисовки итоговых сумм
      eventBus.emit('finance:financeSummaryWidget:updated');
    });
  }
  // Загрузка из localStorage
  loadData() {
    const saved = localStorage.getItem(`finance_${window.db.userId}`);
    if (saved) {
      window.db.finance = JSON.parse(saved);
    }
  }
  // Рендер итоговых сумм
  renderFinanceSummary() {
    const blocks = document.querySelectorAll('.finance-summary');
    const commonIncome = window.db.finance.table.reduce((a, b) => a + b.income, 0);
    const commonExpense = window.db.finance.table.reduce((a, b) => a + b.expense, 0);
    const commonSummary = commonIncome - commonExpense;
    if (!blocks.length) return;
    blocks[0].children[1].textContent = commonIncome.toFixed(0) + ' KZT';
    blocks[1].children[1].textContent = commonExpense.toFixed(0)  + ' KZT';
    blocks[2].children[1].className = commonSummary >= 0 ? 'blue-color' : 'red-color';
    blocks[2].children[1].textContent = commonSummary.toFixed(0)  + ' KZT';
  }
}