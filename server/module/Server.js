import http  from 'http';
import fs  from 'fs';
import path  from 'path';

import db from './Database.js';  

class Server {
  constructor() {
    this.ROOT_PATH = path.join(
      process.env.HOME,
      '_data/code',
      //process.env.PROJECT_DIR,
      process.env.DASHBOARDX_DIR,
      process.env.npm_lifecycle_event === 'dev:server' ? process.env.CLIENT_DIR : process.env.PUBLIC_DIR,
    );
    console.log('server ->' + 
      'module ->' + 
      'Server.js ->' + 
      'constructor() ->' + 
      'this.ROOT_PATH', 
      this.ROOT_PATH
    );
    this.init();
  }
  init() {
    this.http = http.createServer((request, responce) => {
      this[request.method](request, responce);
    });
    this.http.listen(process.env.PORT, process.env.HOST, () => {
      console.log(`Server running in module at http://${process.env.HOST}:${process.env.PORT}/`);
    });
  }
  
  GET(request, responce) {
    // Определяем путь к файлу
    const filePath = path.join(this.ROOT_PATH, request.url === '/' ? 'index.html' : request.url);
    // Определяем расширение файла
    const extname = path.extname(filePath);
    // Проверяем, существует ли файл
    fs.readFile(filePath, (err, content) => {
      if (err) {
        responce.writeHead(404, { 'Content-Type': 'text/plain' });
        responce.end('404 Not Found');
      } 
      else {
        const contentType = db.mime[extname] || 'application/octet-stream';
        responce.writeHead(200, { 'Content-Type': contentType });
        responce.end(content);
      }
    });
  }
}

export default new Server();