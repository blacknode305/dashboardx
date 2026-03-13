import WidgetBase from './WidgetBase.js';
// TODO: Навигация и анимация спросить у джипитичата как сделать лучше в виджетбэйс или в навигашн оставить
// TODO: Добавить слушатель переключение Navigation или Workplace, 
// TODO: который эмитит EventBus в Navigation и Workplace, на кнопки из footer.
// TODO: Решить где он будет находится, в WidgetElement || WidgetBase || WidgetLogic.
export default class NavigationBar extends HTMLElement {
  constructor(array) {
    super();
    this.className = 'nav--container';
    array.forEach(navId => {
      const button = document.createElement('button');
      button.id = navId;
      button.className = 'nav--element';
      button.textContent = navId;
      button.addEventListener('click', () => this.filterWidgets(navId));
      this.appendChild(button);
    });
    
    
    // TODO: Create Workplacer Button/Menu
  }
  filterWidgets(navId) {
    const widgets = Array.from(document.getElementsByClassName('widget--element'));
    widgets.forEach(widget => {
      const category = widget.category || 'unknown';
      console.log(widget.category);
      switch (navId) {
        case 'all':
          widget.style.display = 'block';
          widget.style.zIndex = WidgetBase.zIndexCounter;
          widget.style.boxShadow = 'var(--shadow)';
          break;
        case 'pined':
          widget.style.display = widget.this.classList.contains('is-pinned') === 'true' ? 'block' : 'none';
          break;
        case 'hidden':
          widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
          break;
        default:
          widget.style.zIndex = navId === category ? WidgetBase.zIndexCounter : 2;
          
      }
    });
  }
}
window.customElements.define('navigation-bar', NavigationBar);