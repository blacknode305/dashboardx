// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class DatetimeWidget {
  constructor(widget) {
    this.widget = widget;
    this.updateDatetime();
    this.timer = setInterval(() => this.updateDatetime(), 1000);
  }
  getDatetime(type) {
    const date = new Date();
    if (type === 'date') return date.toLocaleDateString('ru-RU');
    if (type === 'time') return date.toLocaleTimeString('ru-RU');
  }
  updateDatetime() {
    this.widget.querySelectorAll('[data-role=date]').forEach(el => el.textContent = this.getDatetime('date'));
    this.widget.querySelectorAll('[data-role=time]').forEach(el => el.textContent = this.getDatetime('time'));
  }
  destroy() {
    clearInterval(this.timer);
  }
}