import eventBus from './EventBus.js';

class WSClient {
  constructor(url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host, id = 'admin') {
    this.ws = null;
    this.url = url;
    this.id = id;
    this.authOverlay = null;
    this.connection();
  }

  connection() {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;
    const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]'];
    if (location.protocol !== 'https:' && !localHosts.includes(location.hostname)) {
      console.error('DashboardX requires HTTPS/WSS outside localhost to protect the access token.');
      eventBus.emit('wsClient:security:error', { id: this.id });
      return;
    }

    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => eventBus.emit('wsClient:onopen', { id: this.id });
    this.ws.onclose = () => {
      this.authOverlay?.remove();
      this.authOverlay = null;
      eventBus.emit('wsClient:onclose', { id: this.id });
    };
    this.ws.onerror = () => eventBus.emit('wsClient:onerror', { id: this.id });
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'wsServer:auth:required') {
          this.requestToken();
        } else if (data.type === 'wsServer:auth:ok') {
          eventBus.emit('wsClient:authenticated', { id: this.id });
        } else if (data.type === 'wsServer:message:db') {
          window.db = data.message;
          eventBus.emit('wsClient:onmessage:db', { id: this.id });
        } else if (data.type === 'wsServer:error') {
          console.warn('DashboardX WebSocket:', data.message);
        }
      } catch (error) {
        console.warn('Invalid DashboardX WebSocket message:', error);
      }
    };
  }

  requestToken() {
    if (this.authOverlay) return;
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'DashboardX access');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:grid;place-items:center;padding:16px';

    const form = document.createElement('form');
    form.style.cssText = 'max-width:360px;width:100%;padding:24px;background:#20232b;color:white;border:1px solid #555;border-radius:12px;font:16px sans-serif';
    const label = document.createElement('label');
    label.textContent = 'DashboardX access token';
    label.htmlFor = 'dashboardx-access-token';
    label.style.display = 'block';
    const input = document.createElement('input');
    input.id = 'dashboardx-access-token';
    input.type = 'password';
    input.required = true;
    input.autocomplete = 'off';
    input.style.cssText = 'display:block;box-sizing:border-box;width:100%;padding:10px;margin:12px 0;color:#111';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Connect';
    submit.style.cssText = 'padding:10px 18px;cursor:pointer';
    form.append(label, input, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      this.ws.send(JSON.stringify({ type: 'auth', token: input.value }));
      input.value = '';
      overlay.remove();
      this.authOverlay = null;
    });
    overlay.append(form);
    document.body.append(overlay);
    this.authOverlay = overlay;
    input.focus();
  }

  send(data) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(data));
  }

  disconnect() {
    this.ws?.close();
  }
}

window.wsClient = new WSClient();
export default WSClient;
