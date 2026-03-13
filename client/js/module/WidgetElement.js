// Импортируем базовый класс виджета (общая логика, шаблоны, стили и т.п.)
import WidgetBase from './WidgetBase.js';
// Импортируем объект/неймспейс с классами логики виджетов
import WidgetLogic from './WidgetLogic.js';
// TODO: Добавить слушатель переключение Navigation или Workplace, 
// TODO: который эмитит EventBus в Navigation и Workplace, на кнопки из footer.
// TODO: Решить где он будет находится, в WidgetElement || WidgetBase || WidgetLogic.
// Объявляем кастомный Web Component, который наследуется от WidgetBase
export default class WidgetElement extends WidgetBase {
  // lifecycle-хук Web Components вызывается автоматически браузером, когда элемент <widget-element> добавлен в DOM
  connectedCallback() {
    // Ищем в документе <template> у которого есть атрибут data-widget и data-id равный this.templateId (ID текущего виджета)
    const template = document.querySelector(`template[data-widget][data-id="${this.templateId}"]`);
    // Строим DOM-структуру виджета на основе найденного template метод определён в WidgetBase
    this.buildFromTemplate(template);
    // Формируем имя класса логики, по this.id
    const LogicClass = WidgetLogic[this.id[0].toUpperCase() + this.id.slice(1)];
    //console.log(LogicClass);
    // Проверяем, существует ли такой класс логики
    if (LogicClass) {
      // Создаём экземпляр логики виджета передаём текущий элемент (this) внутрь логики сохраняем ссылку, чтобы позже можно было уничтожить
      this.logic = new WidgetLogic[this.id[0].toUpperCase() + this.id.slice(1)](this);
    }
  }
  // lifecycle-хук Web Components вызывается автоматически, когда элемент удаляется из DOM
  disconnectedCallback() {
    // Если логика существует и у неё есть метод destroy вызываем его (без ошибки, если чего-то нет)
    this.logic?.destroy?.();
  }
  // Хук, который вызывается вручную из WidgetBase после того, как template уже вставлен в body виджета
  afterBuild() {
    // Устанавливаем ширину body виджета
    this.body.style.width = this.styleData.width;
    // Устанавливаем высоту body виджета
    this.body.style.height = this.styleData.height;
    // Можно сохранить категорию виджета в data-атрибут чтобы использовать её для CSS-стилей или логики 
    // this.body.dataset.category = this.category;
  }
}
// Регистрируем кастомный HTML-элемент в браузере после этого можно использовать <widget-element></widget-element> в HTML
window.customElements.define('widget-element', WidgetElement);