import widgetRegistry from './WidgetRegistry.js';
import WidgetBase from './WidgetBase.js';
import WidgetLogic from './WidgetLogic.js?v=optima-supplier-links-20261030';
import { translateElement, translateWidgetBody, t } from './i18n.js';

export default class WidgetElement extends WidgetBase {
  connectedCallback() {
    if (this._built || !this._initialized) return;
    this._built = true;
    const template = document.querySelector('template[data-widget][data-id="' + this.templateId + '"]');
    this.buildFromTemplate(template);
    widgetRegistry.register(this);
    if (template?.dataset.unavailable === 'true' || window.dashboardxCatalog?.[this.templateId]?.serverOnly) {
      this.body.textContent = t(template?.dataset.unavailable === 'true' ? 'ui.templateUnavailable' : 'ui.serverOnly');
      return;
    }
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
    if (this._spatialMoving) return; // Live DOM reparent: preserve controllers/state.
    widgetRegistry.unregister(this);
    this.logic?.destroy?.();
  }
}
customElements.define('widget-element',WidgetElement);
