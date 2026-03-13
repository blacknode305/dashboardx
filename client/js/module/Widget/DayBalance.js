// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class DayBalanceWidget {
  constructor(widget) {
    this.widget = widget;
    this.initEventBus();
    this.attachEventListeners();
    // Загружаем данные
    this.loadData();
  }
  // Подписка на события
  initEventBus() {
    // Слушаем событие добавления финансов
    eventBus.on('finance:dayBalanceWidget:update', (args) => {
      // Загружаем данные
      this.loadData();
      // Обновляем данные
      this.updateFinance({ type: args.detail.type, value: args.detail.value });
      // Запуск события завершенного обновления без аргументов
      eventBus.emit('finance:dayBalanceWidget:updated');
    });
  }
  // Навешивание обработчиков
  attachEventListeners() {
    // Кнопка дохода
    this.widget.querySelector('[data-action="submit-income"]')?.addEventListener('click', () => {
        const value = this.widget.querySelector('[data-input=income]').valueAsNumber;
        const amount = Number.isNaN(value) ? 0 : value;
        this.widget.querySelector('[data-input=income]').value = '';
        eventBus.emit('finance:dayBalanceWidget:update', { type: 'income', value: amount });
      });
    // Кнопка расхода
    this.widget.querySelector('[data-action="submit-expense"]')?.addEventListener('click', () => {
        const value = this.widget.querySelector('[data-input=expense]').valueAsNumber;
        const amount = Number.isNaN(value) ? 0 : value;
        this.widget.querySelector('[data-input=expense]').value = '';
        eventBus.emit('finance:dayBalanceWidget:update', { type: 'expense', value: amount });
      });
  }
  // Обновление финансов
  updateFinance({ type, value }) {
    // Текущая дата
    const date = new Date().toLocaleDateString('ru-RU');
    // Поиск строки по дате
    let row = window.db.finance.table.find(r => r.date === date);
    // Если строки нет — создаём
    if (!row) {
      row = { date, income: 0, expense: 0, result: 0 };
      window.db.finance.table.push(row);
    }
    // Обработка дохода
    if (type === 'income') {
      row.income += value;
      row.result += value;
    }
    // Обработка расхода
    if (type === 'expense') {
      row.expense += value;
      row.result -= value;
    }
    // Сохраняем данные
    this.saveData();
  }
  // Загрузка из localStorage
  loadData() {
    const saved = localStorage.getItem(`finance_${window.db.userId}`);
    if (saved) {
      window.db.finance = JSON.parse(saved);
    }
  }
  // Сохранение в localStorage
  saveData() {
    localStorage.setItem(
      `finance_${window.db.userId}`,
      JSON.stringify(window.db.finance)
    );
  }
}