
console.log('client/index.js/', 'START');
import eventBus from './module/EventBus.js';
//console.log('client/index.js/eventBus', eventBus);
import preloader from './module/Preloader.js';
//console.log('client/index.js/preloader', preloader);
import wsClient from './module/WSClient.js';
//console.log('client/index.js/wsClient', wsClient);

// Генерируем Workplacer'ы их навигацию, настройки и виджеты из бд,
// оставляя возможность создавать новые
//import workplacer from './module/Workplacer.js';

// WEBPACK 
//import '../css/style.css';
// JS
//import ClientDB from './module/ClientDB.js';
/*
console.log('now');

import NavigationBar from './module/NavigationBar.js';
import WidgetElement from './module/WidgetElement.js';
// ========================== GLOBAL DB ==========================
// TODO: ОБЬЕКТЫ БАЗЫ ЭТО с сервера и обмен по ws
window.db = {
  userId: 'blacknode301',
  finance: { 
    table: [ ],
  },
  rate: {
    list: [],
    KZT: undefined,
    USD: undefined,
    RUB: undefined,
  },
  widget: { 
    template: [], 
    list: [], 
    proto: [], 
    category: [],
    element: [],
  },
};
// TODO: слелать возможность сохранять в localstorage по кнопке
window.localStorage.setItem(`finance_${window.db.userId}`, '')
// TODO: НАСТРОИТЬ ВОРКПЛЭЙСЕР WORKPLACER с набором виджетов их состояний
// TODO: ПЕРЕДЕЛАТЬ ВИДДЕТЫ ДЛЯ ДУБЛИРОВАНИЯ ИЛИ ПЕРЕСТРАИВАТЬ ПОЛОЖЕНИЕ ПО НАВИГАЦИИ ПО WORKPLACAM
// TODO: ДОБАВИТЬ СЕРФЕР И КНОПКУ ДОБАВЛЕНИЯ ВИДЖЕТОВ
// TODO: НАСТРОИТЬ УДАЛЕНИЕ ВИДЖЕТОВ С DOM и из памяти
// TODO: модули в вэбпаке или аналоге, чтобы js css были как один файл и все файлы были сжаты
// TODO: подгружать внешние модули с cdn и шрифты с серверного хранения (чтобы избежать изменения в новых версиях)
// TODO: и в обшем обдумать еще раз внешний вид и функционал
// ========================== DOM CONTENT LOADED ==========================
document.addEventListener('DOMContentLoaded', () => {
  const events = [
    "click", "dblclick", "mousedown", "mouseup", "mousemove",
    "contextmenu", "wheel",
    "keydown", "keyup",
    "touchstart", "touchmove", "touchend",
    "pointerdown", "pointerup", "pointermove",
    "dragstart", "drop",
    "scroll"
  ];
  const events = [
    "dblclick"
  ];
  events.forEach(event => {
    document.addEventListener(event, e => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
  });
  // Переключение темы
  const switchBtn = document.getElementById('switchTheme');
  switchBtn?.addEventListener('click', () => {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
  });
  // Получаем все шаблоны виджетов
  db.widget.template = Array.from(document.querySelectorAll('template[data-widget]'));
  db.widget.list = db.widget.template.map(tpl => tpl.dataset.id);
  db.widget.category = [...new Set(db.widget.template.map(tpl => tpl.dataset.category))];
  // Создаём все виджеты
  var wg;
  db.widget.template.forEach(tpl => {
    wg = new WidgetElement({
      id: tpl.dataset.id,
      category: tpl.dataset.category,
      title: tpl.dataset.title,
    });
    //console.log(wg);
    document.body.appendChild(wg);
  });
  // Создаём навигацию
  const navCategories = ['all', 'pinned', 'hidden', 'favorite', ...db.widget.category];
  const navBar = new NavigationBar(navCategories);
  document.body.appendChild(navBar);
  
  
  const ws = new WSClient();
  
  /*
  const ws = new WebSocket('ws://localhost:3030');
  ws.onopen = () => {
    console.log('ws.onopen', event);
    eventBus.emit('ws:onopen', event);
    ws.send(JSON.stringify({
      message: 'Привет сервер я клиент!'
    }));
  };
  ws.onmessage = event => {
    console.log('ws.onmessage', event);
    eventBus.emit('ws:onmessage', event);
  };
  
  ws.onerror = error => {
    console.log('ws.onerror', error);
    eventBus.emit('ws:onerror', error);
  };
  
  ws.onclose = () => {
    console.log('ws.onclose', event);
    eventBus.emit('ws:onclose', error);
  };
});
*/