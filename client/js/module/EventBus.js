class EventBus {
  constructor(root = document.createElement('div')) {
    this.bus = root;
  }
  on(eventName, callback) {
    this.bus.addEventListener(eventName, callback);
  }
  off(eventName, callback) {
    this.bus.removeEventListener(eventName, callback);
  }
  emit(eventName, detail = {}, bubbles = false) {
    this.bus.dispatchEvent(new CustomEvent(eventName, { detail, bubbles }));
  }
  once(eventName, callback) {
    this.bus.addEventListener(eventName, callback, { once: true });
  }
};
export default new EventBus();