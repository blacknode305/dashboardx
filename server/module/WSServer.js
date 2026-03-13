import { WebSocketServer } from 'ws';

import db from './Database.js';  

import server from './Server.js';

class WSServer {
  constructor() {
    this.wss = new WebSocketServer({ server: server.http });
    this.counter = 0;
    this.ws = [ ];
    this.init();
  }
  init(wss) {
    this.wss.on('connection', (ws) => {
      ws.id = this.counter++;
      this.ws.push(ws);
      console.log(`Client WebSocket ${ws.id} connected:`);
      // Отправка базы данных клиенту
      const { ROOT_PATH, ...message } = db;
      this.ws[ws.id].send(JSON.stringify({ 
        type: 'wsServer:message:db', 
        message: message
      }));
      
      
      // TODO: ...
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          //console.log({ type: 'ws:client:message', message: data });
          //console.log('clients', wss.clients[0]);
          
          // Ответ клиенту
          if (data.type === 'get#workplace') {
            console.log('GETWORKPLACE');
          }
          ws.send(JSON.stringify({ type: 'ws:server:message', message: 'Сообщение получено!' }));
          
          // Пример broadcast всем клиентам
          /*
          wss.clients.forEach((client) => {
            db.wss = [ ];
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'ws:server:message', message: 'Наслаждайся процессом!' }));
            }
            if (client === ws && client.readyState === WebSocket.OPEN) {
              db.wss.push({
                id: 'id',
                info: {
                  username: 'blacknode301',
                  telegramId: db.telegram[0].id,
                  telegram: db.telegram[0],
                  other: undefined,
                },
                client: client,
              });
              //console.log(db.wss);
              client.send(JSON.stringify({ type: 'ws:server:message', message: 'Наслаждайся процессом!' }));
            }
          });
          */
          
          ws.send(JSON.stringify({ type: 'ws:server:message', message: 'Наслаждайся уверенно!' }));
        } 
        catch (err) {
          console.error('Ошибка парсинга JSON:', err);
          ws.send(JSON.stringify({ type: 'error', message: 'Неверный JSON' }));
        }
      });
      ws.on('close', () => {
        console.log('Client WebSocket отключен');
        //db.ws[ws.id];
      });
    });
  }
  sendAll(data) {
    const message = JSON.stringify(data);
    for (const ws of db.ws) {
      if (ws.readyState === 1) {
        console.log('log:wsServer.js:sendAll:message', message);
        ws.send(message);
      }
    }
  }
  sendOne(data, filter) {
    const message = JSON.stringify(data);
    for (const ws of db.ws) {
      if (filter(ws) && ws.readyState === 1) {
        ws.send(message);
      }
    }
  }
  sendLog(link, data) { 
    const date = new Date();
    const message = JSON.stringify({
      type: 'serverLog',
      link: data.link,
      datetime: {
        d: date.toLocaleDateString('ru-RU'),
        t: date.toLocaleTimeString('ru-RU'),
      },
      message: data, 
    });
    for (const ws of db.ws) {
      if (ws.readyState === 1) {
        console.log(message);
        ws.send(message);
      }
    }
  }
}

export default new WSServer();

/*
wsServer.sendOne(ws => ws.id === 'blacknode301', { message: 'hello' });
wsServer.sendAll({ type: 'eth', price: 2450 });

*/