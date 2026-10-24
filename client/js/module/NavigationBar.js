import WidgetBase from './WidgetBase.js';
import { t } from './i18n.js';

export default class NavigationBar extends HTMLElement {
  constructor(categories) {
    super();
    this.className = 'nav--container';
    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav--element';
      button.dataset.category = category;
      button.textContent = t('nav.' + category);
      button.addEventListener('click', () => this.filterWidgets(category));
      this.appendChild(button);
    });
  }

  filterWidgets(category) {
    this.querySelectorAll('button').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.category === category))
    );
    document.querySelectorAll('widget-element.widget--element').forEach(widget => {
      // Exactly one widget manager stays visible on every workspace and every category.
      if (widget.templateId === 'add') {
        widget.style.display = 'flex';
        return;
      }
      const hidden = widget.classList.contains('is-hidden');
      let show = false;
      if (category === 'all') show = !hidden;
      else if (category === 'hidden') show = hidden;
      else if (category === 'pinned') show = !hidden && widget.classList.contains('is-pinned');
      else if (category === 'favorite') show = !hidden && widget.classList.contains('is-favorite');
      else show = !hidden && category === widget.category;
      widget.style.display = show ? 'flex' : 'none';
      if (show) widget.style.zIndex = String(WidgetBase.zIndexCounter);
    });
  }
}
customElements.define('navigation-bar', NavigationBar);
