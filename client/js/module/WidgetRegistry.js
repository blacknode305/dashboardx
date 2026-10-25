/**
 * Runtime registry for ALL DashboardX widgets, including existing Web Components.
 * This module does not change how a widget is rendered or controlled.
 */
class WidgetRegistry {
  constructor() {
    this.widgets = new Map();
    this.listeners = new Set();
  }
  register(widget) {
    if (!widget || typeof widget.id !== 'string' || !widget.id) {
      throw new TypeError('Widget must have a non-empty id');
    }
    if (this.widgets.has(widget.id) && this.widgets.get(widget.id) !== widget) {
      throw new Error(`Duplicate widget id: ${widget.id}`);
    }
    this.widgets.set(widget.id, widget);
    this.notify('registered', widget.id);
    return widget;
  }
  unregister(widget) {
    if (!widget || this.widgets.get(widget.id) !== widget) return false;
    this.widgets.delete(widget.id);
    this.notify('unregistered', widget.id);
    return true;
  }
  get(id) { return this.widgets.get(id) ?? null; }
  list() {
    return Array.from(this.widgets.values(), widget => ({
      id: widget.id,
      type: widget.templateId ?? widget.id,
      title: widget.widgetTitle ?? '',
      category: widget.category ?? '',
      visible: widget.style?.display !== 'none',
      pinned: widget.classList?.contains('is-pinned') ?? false
    }));
  }
  subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('Listener must be a function');
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify(type, id) {
    const event = { type, id };
    for (const fn of this.listeners) {
      try { fn(event); } catch (error) { console.error('WidgetRegistry listener error', error); }
    }
  }
}
export default new WidgetRegistry();
