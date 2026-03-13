// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class FinanceTableWidget {
  constructor(widget) {
    this.widget = widget;
    this.initEventBus();
    this.attachEventListeners();
    // Загружаем данные
    this.loadData();
    // Отрисовка таблицы
    this.renderFinanceTable();
  }
  initEventBus() {
    // Слушаем событие добавления финансов
    eventBus.on('finance:dayBalanceWidget:updated', () => {
      // Загружаем данные
      this.loadData();
      // Отрисовка таблицы
      this.renderFinanceTable();
      // Вызываем событие после отрисовки таблицы
      eventBus.emit('finance:financeTableWidget:updated');
    });
  }
  // Навешивание обработчиков
  attachEventListeners() {
    // Кнопка просмотр по периоду
    this.widget.querySelector('[data-action="view-period"]')?.addEventListener('click', () => {
      //console.log('view-period');
      //eventBus.emit('finance:financeTableWidget:updated');
    });
  }
  // Загрузка из localStorage
  loadData() {
    const saved = localStorage.getItem(`finance_${window.db.userId}`);
    if (saved) {
      window.db.finance = JSON.parse(saved);
    }
  }
  // Отрисовка таблицы
  renderFinanceTable() {
    document.querySelectorAll('[data-role=rows]').forEach(tbody => {
      tbody.innerHTML = '';
      window.db.finance.table.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row.date}</td>
          <td class="green">${row.income.toFixed(0) + ' KZT'}</td>
          <td class="red">${row.expense.toFixed(0) + ' KZT'}</td>
          <td class="${row.result >= 0 ? 'blue' : 'red'}">${row.result.toFixed(0) + ' KZT'}</td>
        `;
        tbody.appendChild(tr);
      });
    });
  }
}