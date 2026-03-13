// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class ServerConsoleWidget {
  constructor(widget) {
    this.widget = widget;
    this.initEventBus();
    //this.attachEventListeners();
  }
  // Подписка на события
  initEventBus() {
    // Слушаем событие получения ws подключения
    eventBus.on('ws:onopen', (args) => {
      console.log('initEventBus:ws:onopen', args);
      // Обновляем данные
      //this.renderMessage(args);
      // Запуск события завершенного обновления без аргументов
      //eventBus.emit('finance:dayBalanceWidget:updated');
    });
    eventBus.on('ws:onmessage', (args) => {
      //console.log('initEventBus:ws:onmessage', args);
      console.log('initEventBus:ws:onmessage', args.detail.data);
      const message = args.detail.data;
      // Обновляем данные
      this.renderMessage(message);
      // Запуск события завершенного обновления без аргументов
      //eventBus.emit('finance:dayBalanceWidget:updated');
    });
  }
  // Навешивание обработчиков
  /*
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
  */
  renderMessage(message) {
    console.log('renderMessage:message', message);
    /*
    message = {
      data: {
        time: datetime,
        type: 'type:message',
        message: 'message'
      }
    };
    */
    
    const line = document.createElement('div');
    line.className = 'line';
    
    const time = document.createElement('span');
    time.innerHTML = message.data.time;
    
    const div = document.createElement('div');
    
    const type = document.createElement('span');
    type.className = message.data.type.split(':')[0];
    type.innerHTML = message.data.type.split(':')[1];
    
    div.appendChild(type);
    if (message.data.message) {
      const message = document.createElement('span');
      message.className = message;
      message.innerHTML = message.data.message;
      
      div.appendChild(message);
    }
    
    line.appendChild(time);
    line.appendChild(div);
    
    this.widget.querySelectorAll('[data-role="server-console"]').forEach(el => el.appendChild(line));
  }
}