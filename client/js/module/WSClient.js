import eventBus from './EventBus.js';

class WSClient {
  /**
   * @param {string} url - WebSocket URL, например ws://localhost:8080
   * @param {string} id - уникальный идентификатор клиента для событий
   */
  //constructor(url = `ws://${location.host}`, id = 'default') {
  // Для тестов виджетов по одному меняется location.host
  constructor(url = `ws://127.0.0.1:3030`, id = 'admin') {
    this.ws = null;
    this.url = url;
    this.id = id; // для разграничения событий разных клиентов
    this.connection();
  }
  // Открытие соединения
  connection() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => eventBus.emit('wsClient:onopen', { id: this.id });
    this.ws.onclose = () => eventBus.emit('wsClient:onclose', { id: this.id });
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'wsServer:message:db') {
          window.db = data.message;
          eventBus.emit('wsClient:onmessage:db', { id: this.id });
        }
      } 
      catch (error) {
        console.warn(`Invalid WS message from ${this.id}:`, error);
      }
    };
  }
  // Метод отправления сообщения
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(data));
  }
  // Закрытие соединения
  disconnect() {
    this.ws?.close();
  }
}
// Глобальная переменная, создаем без параметров (используются параметры по умолчанию)
window.wsClient = new WSClient();
// Экспортируем на случай открытия нового сокета с другими сервисами (хотя все сервисы грузятся заранее на сервере)
export default WSClient;