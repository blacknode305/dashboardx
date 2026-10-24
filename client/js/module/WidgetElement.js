import WidgetBase from './WidgetBase.js';
import WidgetLogic from './WidgetLogic.js';
import { translateElement, translateWidgetBody } from './i18n.js';

export default class WidgetElement extends WidgetBase {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const template = document.querySelector('template[data-widget][data-id="' + this.templateId + '"]');
    this.buildFromTemplate(template);
    translateElement(this.body);
    translateWidgetBody(this.body,this.templateId);
    const key = this.templateId[0].toUpperCase() + this.templateId.slice(1) + 'Widget';
    const Logic = WidgetLogic[key];
    if (!Logic) return;
    try { this.logic = new Logic(this); }
    catch (error) {
      console.error('Widget failed:',this.templateId,error);
      this.body.textContent = error?.message || String(error);
    }
  }
  disconnectedCallback() {
    this.logic?.destroy?.();
  }
}
customElements.define('widget-element',WidgetElement);
