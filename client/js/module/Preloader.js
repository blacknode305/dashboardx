import eventBus from './EventBus.js';

import workplacer from './Workplacer.js';

class Preloader {
  constructor() {
    this.percent = 0;
    this.message = '';

    this.progressEl = document.getElementById('loader-progress');
    this.textEl = document.getElementById('loader-text');
    this.loaderEl = document.getElementById('app-loader');
    //this.appContent = document.getElementById('app-content');
    
    this.initEventBus();
  }
  // Подписка на события
  initEventBus() {
    // Слушаем событие подключения к websocket
    eventBus.on('wsClient:onopen', (args) => {
      this.percent = 25;
      this.message = 'Client connected: ' + JSON.stringify(args.detail, null, 2);
      
      console.log('Client connected: ' + JSON.stringify(args.detail, null, 2));
      
      this.updateProgress();
    });
    // Слушаем событие завершение инициализации datebase
    eventBus.on('wsClient:onmessage:db', (args) => {
      this.percent = 50;
      this.message = 'Datebase inited!';
      this.updateProgress();
      
      console.log('client/module/Preloader.js/eventBus.on(wsClient:onmessage:db)', window.db);

      for (const wp of window.db.system.workplace) {
        alert(JSON.stringify(wp, null, 2));
      }
      
    });
    // Слушаем событие завершения рендеринга приложения 
    eventBus.on('workplacer:creation:complete', (args) => {
      this.percent = 75;
      this.message = 'workplacer:creation:complete';
      this.updateProgress();
    });
    // Слушаем событие окончания загрузки 
    eventBus.on('app:loading:complete', (args) => {
      this.percent = 100;
      this.message = 'app:loading:complete';
      this.updateProgress();
      this.finishLoader();
    });
  }
  updateProgress() {
    this.progressEl.style.width = this.percent + '%';
    this.textEl.textContent = this.message;
  }
  finishLoader() {
    this.progressEl.style.width = '100%';
    this.textEl.textContent = 'Finish';
    this.loaderEl.style.transition = 'opacity 0.5s, transform 0.5s';
    this.loaderEl.style.opacity = '0';
    this.loaderEl.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.loaderEl.remove();
      //appContent.style.display = 'block'; // показываем приложение
    }, 500);
  }
};
export default new Preloader();