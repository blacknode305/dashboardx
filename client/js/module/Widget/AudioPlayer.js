// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class AudioPlayerWidget {
  constructor(widget) {
    this.widget = widget;
    
    this.audio = this.widget.querySelector('audio');
    this.currentTrack = 0;
    this.initEventBus();
    this.attachEventListeners();
    // Старт
    //this.loadTrack(0);
  }
  // Подписка на события
  initEventBus() {
    eventBus.on('ws:server:message:db', (args) => {
      console.log('eventBus.on(ws:server:message:db)', args.detail);
      this.renderPlaylist();
    });
    // // Слушаем событие добавления финансов
    // eventBus.emit('ws:server:message:db', { id: this.id, data });
  }
  // Навешивание обработчиков
  attachEventListeners() {
    // Play / Pause
    this.widget.querySelector('[data-action="play"]').addEventListener('click', () => {
      if (this.audio.paused) {
        this.audio.play();
        this.widget.querySelector('[data-action="play"]').textContent = '⏸';
      } 
      else {
        this.audio.pause();
        this.widget.querySelector('[data-action="play"]').textContent = '▶';
      }
    });
    // Следующий трэк
    this.widget.querySelector('[data-action="next"]').addEventListener('click', () => {
      this.loadTrack((this.currentTrack + 1) % Array.from(this.widget.querySelectorAll('[data-role="playlist"] div')).length);
    });
    // Предыдущий трэк
    this.widget.querySelector('[data-action="prev"]').addEventListener('click', () => {
      this.loadTrack((this.currentTrack - 1 + Array.from(this.widget.querySelectorAll('[data-role="playlist"] div')).length) % Array.from(this.widget.querySelectorAll('[data-role="playlist"] div')).length);
    });
    // Прогресс
    this.audio.addEventListener('timeupdate', () => {
      const percent = (this.audio.currentTime / this.audio.duration) * 100;
      this.widget.querySelector('.progress-bar').style.width = percent + '%';
    });
    // Перемотка
    this.widget.querySelector('.progress').addEventListener('click', (e) => {
      const width = this.widget.querySelector('.progress').clientWidth;
      const clickX = e.offsetX;
      this.audio.currentTime = (clickX / width) * this.audio.duration;
    });
    // Автопереключени
    this.audio.addEventListener('ended', () => this.widget.querySelector('[data-action="next"]').click());
  }
  // Загрузка трека
  loadTrack(index) {
    console.log('audio:loadTrack');
    this.currentTrack = index;
    this.audio.src = Array.from(this.widget.querySelectorAll('[data-role="playlist"] div'))[index].dataset.src;
    this.widget.querySelector('[data-role="track"]').textContent = Array.from(this.widget.querySelectorAll('[data-role="playlist"] div'))[index].textContent;
    this.audio.play();
    this.widget.querySelector('[data-action="play"]').textContent = '⏸';
  }
  // Рендер плэйлиста
  renderPlaylist() {
    console.log('renderPlaylist:now');
    this.widget.querySelector('[data-role="playlist"]').innerHTML = '';
    const div = document.createElement('div');
    var clone;
    for (const track of window.db.playlist[0].track) {
      clone = div.cloneNode(true);
      clone.dataset.src = window.db.playlist[0].dir + track;
      clone.textContent = track.split('.mp3')[0];
      this.widget.querySelector('[data-role="playlist"]').appendChild(clone);
    }
    //console.log('ARRAY: ', Array.from(this.widget.querySelectorAll('[data-role="playlist"] div')));
    Array.from(this.widget.querySelectorAll('[data-role="playlist"] div')).forEach((track, index) => {
      // Клик по плейлисту
      //console.log(track, index);
      track.addEventListener('click', () => this.loadTrack(index));
    });
  }
}


