// TODO: Добавить слушатель переключение Navigation или Workplace, 
// TODO: который эмитит EventBus в Navigation и Workplace, на кнопки из footer.
// TODO: Решить где он будет находится, в WidgetElement || WidgetBase || WidgetLogic.
// Экспортируем базовый класс виджета, наследуемся от HTMLElement
export default class WidgetBase extends HTMLElement {
  // Статический счётчик z-index для всех виджетов
  static zIndexCounter = 10;
  // Конструктор класса, принимает конфигурацию из html шаблона каждого виджета
  constructor(config) {
    // Вызываем конструктор HTMLElement
    super();
    // Инициализируем базовые параметры
    this.initBase(config);
    // Загружаем сохранённые стили
    this.loadStyle();
    // Строим заголовок виджета
    this.buildHeader();
    // Строим подвал виджета
    this.buildFooter();
  }
  // Базовая инициализация виджета
  initBase(config) {
    // ID виджета из конфига
    this.id = config.id + 'Widget';
    // Категория виджета для навигации
    this.category = config.category;
    // CSS классы виджета (основной и категории навигации)
    this.className = `widget--element ${this.category}--widget`;
    // Заголовок виджета
    this.widgetTitle = config.title;
    // ID шаблона виджета
    this.templateId = config.id;
  }
  // Загрузка сохранённых стилей из localStorage
  loadStyle() {
    // Объект со стилями
    this.styleData = {};
    // Пробуем получить данные из localStorage
    try {
      // Получаем сохранённые данные
      const stored = localStorage.getItem(this.id);
      // Если данные есть — парсим JSON
      if (stored) {
        this.styleData = JSON.parse(stored);
      }
    } 
    // Обработка ошибок парсинга
    catch (err) {
      // Выводим предупреждение в консоль
      console.warn(`Error loading widget style for ${this.id}:`, err);
    }
    // Позиция сверху
    this.style.top = this.styleData.top || '50px';
    // Позиция слева
    this.style.left = this.styleData.left || '0px';
    // Ширина тела виджета (реализованно в WidgetElement))
    //this.style.width = this.styleData.width || '300px';
    //this.body.style.width = this.styleData.width || '300px';
    // Высота тела виджета (реализованно в WidgetElement)
    //this.style.height = this.styleData.height || '200px';
    //this.body.style.height = this.styleData.height || '200px';
    // Если закреплён — добавляем класс
    if (this.styleData.pinned) this.classList.add('is-pinned');
    // Если скрыт — скрываем
    if (this.styleData.hidden) this.style.display = 'none';
  }
  // Сохранение состояния виджета
  saveWidget() {
    // Формируем объект данных
    const data = {
      // Текущая позиция сверху
      top: this.style.top,
      // Текущая позиция слева
      left: this.style.left,
      // Текущая ширина
      width: this.body.style.width,
      // Текущая высота
      height: this.body.style.height,
      // Закреплён ли виджет
      pinned: this.classList.contains('is-pinned'),
      // Скрыт ли виджет
      hidden: this.style.display === 'none'
    };
    // Сохраняем в localStorage
    localStorage.setItem(this.id, JSON.stringify(data));
  }
  // Создание заголовка виджета
  buildHeader() {
    // Создаём контейнер хедера
    this.header = document.createElement('div');
    // CSS класс хедера
    this.header.className = 'widget--element--header';
    // Создаём заголовок
    const title = document.createElement('h5');
    // Класс заголовка
    title.className = 'title';
    // Текст заголовка
    title.textContent = this.widgetTitle;
    // Добавляем элементы в хедер
    this.header.append(title);
    // Привязываем drag к хэдэру
    this.bindPointer(this.header, e => this.startDrag(e));
    // Добавляем хедер в виджет в buildFromTemplate()
    //this.appendChild(this.header);
  }
  // Построение тела виджета из template
  buildFromTemplate(template) {
    // Если шаблон не передан — ошибка
    if (!template) {
      throw new Error(`Template not provided for widget ${this.id}`);
    }
    // Создаём контейнер тела виджета
    this.body = document.createElement('div');
    // Назначаем CSS класс
    this.body.className = 'widget--element--body';
    // Клонируем содержимое template
    this.body.appendChild(template.content.cloneNode(true));
    // Добавляем хедер в виджет
    this.appendChild(this.header);
    // Добавляем тело в виджет
    this.appendChild(this.body);
    // Добавляем футер в виджет
    this.appendChild(this.footer);
    // Хук после сборки (если есть)
    this.afterBuild?.();
  }
  // Создание подвала виджета
  buildFooter() {
    // Создаём контейнер футера
    this.footer = document.createElement('div');
    // CSS класс футера
    this.footer.className = 'widget--element--footer';
    // Добавляем элементы в футер
    this.footer.append(
      // Кнопка сохранения
      this.createFooterButton({
        cls: 'save',
        tpl: 'iconSave',
        events: { click: () => this.saveWidget() }
      }),
      // Кнопка окружения
      this.createFooterButton({
        cls: 'workplace',
        tpl: 'iconWorkplace',
        events: { click: () => this.toggleWorkplace() }
      }),
      // Кнопка избранное
      this.createFooterButton({
        cls: 'favorite',
        tpl: 'iconFavorite',
        events: { click: () => this.toggleFavorite() }
      }),
      // Кнопка закрепления
      this.createFooterButton({
        cls: 'pin',
        tpl: 'iconPin',
        events: { click: () => { this.togglePinned(); } }
      }),
      // Кнопка изменения размера
      this.createFooterButton({
        cls: 'size',
        tpl: 'iconSize',
        events: {
          mousedown: e => this.startResize(e),
          touchstart: e => this.startResize(e)
        }
      }),
      // Кнопка скрытия
      this.createFooterButton({
        cls: 'hide',
        tpl: 'iconHide',
        events: { click: () => { this.toggleHidden(); } }
      })
    );
    // Добавляем футер в виджет в buildFromTemplate()
    //this.appendChild(this.footer);
  }
  // Создание кнопки в заголовке
  createFooterButton({ cls, tpl, events }) {
    // Создаём кнопку
    const btn = document.createElement('button');
    // CSS класс кнопки
    btn.className = `widget--element--footer-button ${cls}`;
    // Получаем template иконки
    let tplEl = document.getElementById(tpl);
    // Если шаблон не найден — ошибка (разкомментирована)
    if (!tplEl) {
      throw new Error(`Template ${tpl} not found`);
      // Создаем заглушку иконки
      //tplEl = document.createElement('div');
      // Вставляем иконку
      //btn.appendChild(tplEl.cloneNode(true));
    }
    else {
      // Вставляем иконку из template
      btn.appendChild(tplEl.content.cloneNode(true));
    }
    // Назначаем события
    Object.entries(events).forEach(([ev, fn]) =>
      btn.addEventListener(ev, fn)
    );
    // Возвращаем кнопку
    return btn;
  }
  // Универсальный биндинг мыши и тача
  bindPointer(el, handler) {
    // Событие мыши
    el.addEventListener('mousedown', handler);
    // Событие тача
    el.addEventListener('touchstart', e => {
      // Запрещаем скролл
      e.preventDefault();
      // Вызываем обработчик
      handler(e);
    }, { passive: false });
  }
  // Начало перетаскивания
  startDrag(e) {
    // Предотвращаем стандартное поведение
    e.preventDefault();
    // Если закреплён — не двигаем
    if (this.classList.contains('is-pinned')) return;
    // Добавляем фокус
    this.classList.add('is-focus');
    // Увеличиваем z-index
    WidgetBase.zIndexCounter++;
    // Назначаем z-index
    this.style.zIndex = WidgetBase.zIndexCounter;
    // Начальная позиция X
    const startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    // Начальная позиция Y
    const startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    // Смещение по X
    const offsetX = startX - this.offsetLeft;
    // Смещение по Y
    const offsetY = startY - this.offsetTop;
    // Обработчик движения
    const onMove = ev => {
      // Текущая позиция X
      const clientX = ev.type.includes('touch') ? ev.touches[0].clientX : ev.clientX;
      // Текущая позиция Y
      const clientY = ev.type.includes('touch') ? ev.touches[0].clientY : ev.clientY;
      // Обновляем позицию слева с шагом 10px
      this.style.left = `${Math.round((clientX - offsetX)/10)*10}px`;
      // Обновляем позицию сверху с шагом 10px
      this.style.top = `${Math.round((clientY - offsetY)/10)*10}px`;
    };
    // Удаление обработчиков
    const removeListeners = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      // Сохранение при изменении
      // this.saveWidget();
    };
    // Завершение drag
    const onUp = removeListeners;
    // Назначаем события
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }
  // Начало изменения размера
  startResize(e) {
    // Предотвращаем стандартное поведение
    e.preventDefault();
    // Если закреплён — не меняем размер
    if (this.classList.contains('is-pinned')) return;
    // Добавляем фокус
    this.classList.add('is-focus');
    // Увеличиваем z-index
    WidgetBase.zIndexCounter++;
    // Назначаем z-index
    this.style.zIndex = WidgetBase.zIndexCounter;
    // Начальная позиция X
    const startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    // Начальная позиция Y
    const startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    // Начальная ширина
    const startWidth = this.offsetWidth;
    // Начальная высота
    const startHeight = this.offsetHeight;
    // Обработчик изменения размера
    const onMove = ev => {
      // Текущая позиция X
      const clientX = ev.type.includes('touch') ? ev.touches[0].clientX : ev.clientX;
      // Текущая позиция Y
      const clientY = ev.type.includes('touch') ? ev.touches[0].clientY : ev.clientY;
      // Новая ширина
      this.body.style.width =
        `${Math.max(100, Math.round((startWidth + (clientX - startX))/10)*10)}px`;
      // Новая высота
      this.body.style.height =
        `${Math.max(50, Math.round((startHeight + (clientY - startY))/10)*10)}px`;
    };
    // Удаление обработчиков
    const removeListeners = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      // Сохранение при изменении
      // this.saveWidget();
    };
    // Завершение resize
    const onUp = removeListeners;
    // Назначаем события
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }
  // Переключение закрепления
  togglePinned() {
    // Добавляем или убираем класс
    this.classList.toggle('is-pinned');
    // Сохранение при изменении
    // this.saveWidget();
  }
  // Переключение видимости
  toggleHidden() {
    // Скрываем или показываем виджет
    this.style.display = this.style.display === 'none' ? 'flex' : 'none';
    // Сохранение при изменении
    // this.saveWidget();
  }
  // Переключение избранное
  toogleFavorite() {
    console.log('toggleFavorite');
  }
  // Переключение окружения
  toggleWorkplace() {
    console.log('toggleWorkplace');
  }
}