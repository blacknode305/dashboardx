// TODO: Добавить слушатель переключение Navigation или Workplace, 
// TODO: который эмитит EventBus в Navigation и Workplace, на кнопки из footer.
// TODO: Решить где он будет находится, в WidgetElement || WidgetBase || WidgetLogic.

export default class Worplacer extends HTMLElement {
  constructor(args) {
    this.id = args.id;
    this.name = args.name;
    
    this.styleThemes = args.styleThemes;
    
    // Настройки можно менять в виджете WorkplacerWidget#ID
    // там же активный фулскрин, активная категория виджетов, активная тема.
    // там же список виджетов которые можно удалять или добавлять.
    this.settings = args.settings;
    this.settings.widgetsList = args.settings.widgetsList;
    this.settings.activeFullScreenWidget = args.settings.activeFullScreenWidget;
    this.settings.activeWidgetCategory = args.settings.activeWidgetCategory;
    this.settings.activeStyleTheme = argsv.settings.activeStyleTheme;
    
    this.initEventBus();
    this.addEventsListener();
  }
  // Создание всех статичных DOM-элементов по шаблону
  createContent() {
    // Эмитить события окончания этого этапа рендеринга
  }
  // Создание NavigationBar DOM-элемента по шаблону
  createNavigationBar() {
    // Эмитить события окончания этого этапа рендеринга
    // обязательно сгенерировать событие по активации конкретной активной категории 
  }
  // Создание виджетов для конкретного ворпласера по базе данныз
  createWidgets() {
    // Эмитить события окончания этого этапа рендеринга
    for (const widget of this.widgetsList) {
      alert(widget);
      // создаем виджет по id - (калькулятор001) с размерами и расположением
    }
  }
  // Подписка на события
  initEventBus() {
    // прослушивать emit'ы на изменение настроек воркплэйсера
    // прослушивать emit'ы на изменение состояния подключения к WEBSOCKET,
      // в случае чего переключатся на сохрание бд в localStorage с накоплением бд, 
      // повторным подключением и отправкой при повторном подключении.
  }
  // Навешивание обработчиков
  attachEventListeners() {
    this.themeButton.addEventsListener('click', (e) => {
      
    });
  }
    // TODO: Workplacer ищет базу данных и генерирует
    // дисплей под навигацией, в котором по базе данных 
    // id воркплэйсера
    // имя воркплэйсера
    // очередность воркплейсера накидывается за счет создания, наложения по очереди
    // навигационное меню с выбранными активными виджетами
    // виджеты с:
      // именем по id, например калткулятор001 или бинансеАпи004 в котором хранится символы которые чекаются
      // размером
      // расположением
    // выбранная тема
    // события с:
      // сменой темы
      // полноэкранным режимом
      // переключателем за счет свайпа тремя пальцами и свайпа с зажатой клавишей на клавиатуре
}