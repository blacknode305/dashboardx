const dictionaries = {
  ru: {
    'ui.clear':'Очистить данные','ui.theme':'Тема','ui.background':'Фон','ui.fullscreen':'Полный экран','ui.exitFullscreen':'Выйти из полноэкранного режима','ui.templateUnavailable':'Шаблон этого виджета пока недоступен.','ui.serverOnly':'Для этого виджета требуется сервер; локальная версия показывает только заглушку.','ui.language':'Язык',
    'ui.workspaces':'Рабочие столы','ui.categories':'Категории','ui.canvas':'Рабочая область',
    'ui.createWorkspace':'Создать рабочий стол','ui.deleteWorkspace':'Удалить рабочий стол',
    'ui.goWorkspace':'Открыть рабочий стол','ui.defaultWorkspace':'Главная','ui.newWorkspace':'Название нового рабочего стола:',
    'ui.confirmDelete':'Удалить стол «{name}»? Виджеты на других столах останутся.',
    'ui.confirmReset':'Удалить все рабочие столы, виджеты, финансы и настройки DashboardX из этого браузера? Действие нельзя отменить.',
    'ui.backgroundPrompt':'Вставьте HTTPS/HTTP URL фонового изображения для стола «{name}».\nОставьте поле пустым, чтобы убрать фон:',
    'ui.backgroundInvalid':'Нужна ссылка на изображение, начинающаяся с https:// или http://.',
    'ui.otherWorkspace':'Сначала создайте ещё один рабочий стол кнопкой +.',
    'ui.sharePrompt':'Где показать экземпляр {id}?\n{choices}\nВведите номер:',
    'ui.already':'Этот экземпляр уже находится на выбранном столе.',
    'ui.invalidWorkspace':'Неверный номер рабочего стола.',
    'ui.alreadyThere':'уже есть','ui.confirmRemove':'Убрать экземпляр {id} с этого стола?',
    'ui.loading':'Загрузка DashboardX…','ui.startError':'Ошибка запуска: {error}','ui.templatesMissing':'Не удалось загрузить системный виджет добавления.',
    'ui.frameClose':'Убрать виджет со стола','ui.frameHide':'Скрыть виджет','ui.frameShow':'Показать виджет',
    'ui.framePin':'Закрепить положение','ui.frameUnpin':'Открепить положение',
    'ui.frameFavorite':'В избранное','ui.frameUnfavorite':'Убрать из избранного',
    'ui.frameShare':'Показать на другом столе','ui.frameSave':'Сохранить положение',
    'ui.frameExpand':'Развернуть окно','ui.frameRestore':'Восстановить размер',
    'ui.frameResize':'Изменить размер, потянув за угол',
    'nav.all':'Все','nav.pinned':'Закреплённые','nav.hidden':'Скрытые','nav.favorite':'Избранное',
    'nav.system':'Система','nav.finance':'Финансы','nav.tools':'Инструменты',
    'nav.media':'Медиа','nav.telegram':'Telegram','nav.games':'Игры','nav.other':'Другое',
    'manager.title':'Добавить виджет','manager.new':'Новый экземпляр',
    'manager.chooseType':'Выбрать тип виджета','manager.create':'Добавить',
    'manager.createHint':'Каждое добавление создаёт новый ID. Можно создать несколько одинаковых виджетов.',
    'manager.existing':'Существующий экземпляр','manager.chooseId':'Выбрать по ID',
    'manager.show':'Показать','manager.existingHint':'Один и тот же ID может отображаться на нескольких столах. Расположение на них независимое.',
    'manager.onDesk':'На этом рабочем столе','manager.empty':'Здесь пока нет виджетов. Выберите тип и добавьте новый.',
    'manager.noneCreated':'Экземпляров ещё нет — сначала создайте один.',
    'manager.templateUnavailable':'Не удалось загрузить шаблоны. Обновите страницу.',
    'manager.already':'Уже на этом столе','manager.unplaced':'Не размещён',
    'manager.copy':'Копия','manager.copyTip':'Создать самостоятельный экземпляр с новым ID',
    'manager.share':'На другой стол','manager.shareTip':'Показать тот же ID на другом столе',
    'manager.remove':'Убрать','manager.removeTip':'Убрать экземпляр с текущего стола',
    'widget.add':'Добавить виджет','widget.datetime':'Дата и время','widget.dayBalance':'Доходы и расходы',
    'widget.financeSummary':'Итоги финансов','widget.financeTable':'История финансов',
    'widget.moneyConvertApi':'Курсы валют','widget.binanceApi':'Binance',
    'widget.calculator':'Калькулятор','widget.audioPlayer':'Аудиоплеер',
    'widget.videoPlayer':'Видеоплеер','widget.wishlistPrice':'Список покупок',
    'widget.wishlistGames':'Список игр','widget.nesEmulator':'NES-эмулятор',
    'widget.torrentTracker':'Торренты','widget.telegramBot':'Telegram-бот',
    'widget.telegramSettings':'Настройки Telegram','tg.tokenLabel':'Token TelegramApi','tg.placeholder':'Вставьте токен бота','tg.apply':'Применить в этой вкладке','tg.clear':'Удалить токен','tg.show':'Показать','tg.hide':'Скрыть','tg.notice':'Токен хранится только в памяти этой вкладки и исчезает при перезагрузке. Для безопасных запросов Telegram нужен сервер.','tg.saved':'Токен принят для текущей вкладки.','tg.cleared':'Токен не задан.','tg.invalid':'Введите непустой токен.',
    'widget.serverConsole':'Консоль сервера',
    'finance.income':'Доход','finance.expense':'Расход','finance.summary':'Итого',
    'finance.date':'Дата','finance.view':'Показать','finance.add':'Добавить',
    'fx.from':'Исходная валюта','fx.to':'В какую валюту','fx.searchFrom':'Код или название: USD…','fx.searchTo':'Код или название: KZT…','fx.add':'Добавить пару','fx.refresh':'Обновить курсы','fx.loading':'Загрузка доступных валют…','fx.ready':'Валюты загружены','fx.updated':'Курсы обновлены','fx.offline':'Не удалось загрузить курсы. Проверьте интернет и нажмите ↻.','fx.stale':'Нет связи: показаны ранее загруженные данные текущего сеанса.','fx.invalid':'Выберите две валюты из предложенного списка.','fx.same':'Выберите разные валюты.','fx.duplicate':'Эта пара уже добавлена.','fx.savedPairs':'Добавленные пары','fx.empty':'Пока нет пар. Выберите две валюты и нажмите «Добавить пару».','fx.delete':'Удалить пару','fx.rateUnavailable':'Курс недоступен','fx.disclaimer':'Справочные курсы, не для торговых операций',
    'finance.rates':'Курсы валют','finance.addCurrency':'Добавить валюту','finance.high':'Макс.','finance.low':'Мин.','finance.volume':'Объём',
    'wishlist.image':'Изображение','wishlist.name':'Название',
    'wishlist.description':'Описание','wishlist.price':'Цена',
    'game.start':'Старт','game.select':'Выбор',
  },
  kz: {
    'ui.clear':'Деректерді тазалау','ui.theme':'Тақырып','ui.background':'Фон','ui.fullscreen':'Толық экран','ui.exitFullscreen':'Толық экраннан шығу','ui.templateUnavailable':'Бұл виджеттің үлгісі қолжетімсіз.','ui.serverOnly':'Бұл виджетке сервер қажет; жергілікті нұсқада тек хабарлама көрсетіледі.','ui.language':'Тіл',
    'ui.workspaces':'Жұмыс үстелдері','ui.categories':'Санаттар','ui.canvas':'Жұмыс аймағы',
    'ui.createWorkspace':'Жұмыс үстелін жасау','ui.deleteWorkspace':'Жұмыс үстелін жою',
    'ui.goWorkspace':'Жұмыс үстелін ашу','ui.defaultWorkspace':'Басты','ui.newWorkspace':'Жаңа жұмыс үстелінің атауы:',
    'ui.confirmDelete':'«{name}» жұмыс үстелін жоясыз ба? Басқа үстелдердегі виджеттер сақталады.',
    'ui.confirmReset':'Осы браузердегі DashboardX жұмыс үстелдері, виджеттері, қаржысы және баптаулары жойылсын ба? Бұл әрекетті қайтару мүмкін емес.',
    'ui.backgroundPrompt':'«{name}» үстелінің фонына HTTPS/HTTP сурет сілтемесін енгізіңіз.\nФонды өшіру үшін бос қалдырыңыз:',
    'ui.backgroundInvalid':'Сурет сілтемесі https:// немесе http:// арқылы басталуы керек.',
    'ui.otherWorkspace':'Алдымен + арқылы тағы бір жұмыс үстелін жасаңыз.',
    'ui.sharePrompt':'{id} виджетін қай үстелде көрсету керек?\n{choices}\nНөмірін енгізіңіз:',
    'ui.already':'Бұл виджет таңдалған үстелде бар.',
    'ui.invalidWorkspace':'Жұмыс үстелінің нөмірі дұрыс емес.',
    'ui.alreadyThere':'бар','ui.confirmRemove':'{id} виджетін осы үстелден алып тастайсыз ба?',
    'ui.loading':'DashboardX жүктелуде…','ui.startError':'Іске қосу қатесі: {error}','ui.templatesMissing':'Виджет қосу панелі жүктелмеді.',
    'ui.frameClose':'Виджетті үстелден алып тастау','ui.frameHide':'Виджетті жасыру','ui.frameShow':'Виджетті көрсету',
    'ui.framePin':'Орнын бекіту','ui.frameUnpin':'Бекітуді алу',
    'ui.frameFavorite':'Таңдаулыларға қосу','ui.frameUnfavorite':'Таңдаулылардан алу',
    'ui.frameShare':'Басқа үстелде көрсету','ui.frameSave':'Орнын сақтау',
    'ui.frameExpand':'Терезені кеңейту','ui.frameRestore':'Өлшемін қалпына келтіру',
    'ui.frameResize':'Бұрышынан тартып өлшемін өзгерту',
    'nav.all':'Барлығы','nav.pinned':'Бекітілген','nav.hidden':'Жасырын','nav.favorite':'Таңдаулылар',
    'nav.system':'Жүйе','nav.finance':'Қаржы','nav.tools':'Құралдар',
    'nav.media':'Медиа','nav.telegram':'Telegram','nav.games':'Ойындар','nav.other':'Басқа',
    'manager.title':'Виджет қосу','manager.new':'Жаңа дана',
    'manager.chooseType':'Виджет түрін таңдаңыз','manager.create':'Қосу',
    'manager.createHint':'Әр қосылған виджет жаңа ID алады. Бір түрден бірнеше виджет жасауға болады.',
    'manager.existing':'Бар виджет','manager.chooseId':'ID бойынша таңдау',
    'manager.show':'Көрсету','manager.existingHint':'Бір ID бірнеше үстелде көріне алады. Әр үстелде орналасуы бөлек сақталады.',
    'manager.onDesk':'Осы жұмыс үстелінде','manager.empty':'Әзірше виджет жоқ. Түрін таңдап, жаңасын қосыңыз.',
    'manager.noneCreated':'Әлі виджет жоқ — алдымен біреуін жасаңыз.',
    'manager.templateUnavailable':'Үлгілер жүктелмеді. Бетті жаңартыңыз.',
    'manager.already':'Осы үстелде бар','manager.unplaced':'Орналастырылмаған',
    'manager.copy':'Көшірме','manager.copyTip':'Жеке ID бар жаңа дана жасау',
    'manager.share':'Басқа үстелге','manager.shareTip':'Бірдей ID-ді басқа үстелде көрсету',
    'manager.remove':'Алу','manager.removeTip':'Осы үстелден алып тастау',
    'widget.add':'Виджет қосу','widget.datetime':'Күн мен уақыт','widget.dayBalance':'Кіріс пен шығыс',
    'widget.financeSummary':'Қаржы қорытындысы','widget.financeTable':'Қаржы тарихы',
    'widget.moneyConvertApi':'Валюта бағамдары','widget.binanceApi':'Binance',
    'widget.calculator':'Калькулятор','widget.audioPlayer':'Аудиоплеер',
    'widget.videoPlayer':'Бейнеплеер','widget.wishlistPrice':'Сатып алу тізімі',
    'widget.wishlistGames':'Ойындар тізімі','widget.nesEmulator':'NES эмуляторы',
    'widget.torrentTracker':'Торренттер','widget.telegramBot':'Telegram боты',
    'widget.telegramSettings':'Telegram баптаулары','tg.tokenLabel':'Token TelegramApi','tg.placeholder':'Бот токенін енгізіңіз','tg.apply':'Осы бетте қолдану','tg.clear':'Токенді өшіру','tg.show':'Көрсету','tg.hide':'Жасыру','tg.notice':'Токен тек осы беттің жадында сақталады және қайта жүктегенде жойылады. Telegram сұраулары үшін қауіпсіз сервер қажет.','tg.saved':'Токен осы бет үшін қабылданды.','tg.cleared':'Токен енгізілмеген.','tg.invalid':'Токен енгізіңіз.',
    'widget.serverConsole':'Сервер консолі',
    'finance.income':'Кіріс','finance.expense':'Шығыс','finance.summary':'Қорытынды',
    'finance.date':'Күні','finance.view':'Көрсету','finance.add':'Қосу',
    'fx.from':'Бастапқы валюта','fx.to':'Қай валютаға','fx.searchFrom':'Код немесе атау: USD…','fx.searchTo':'Код немесе атау: KZT…','fx.add':'Жұпты қосу','fx.refresh':'Бағамдарды жаңарту','fx.loading':'Валюталар жүктелуде…','fx.ready':'Валюталар жүктелді','fx.updated':'Бағамдар жаңартылды','fx.offline':'Бағамдарды жүктеу мүмкін болмады. Интернетті тексеріп, ↻ басыңыз.','fx.stale':'Желі жоқ: осы сеанстағы алдыңғы деректер көрсетілді.','fx.invalid':'Ұсынылған тізімнен екі валютаны таңдаңыз.','fx.same':'Екі түрлі валютаны таңдаңыз.','fx.duplicate':'Бұл жұп қосылған.','fx.savedPairs':'Қосылған жұптар','fx.empty':'Жұптар жоқ. Екі валютаны таңдап, «Жұпты қосу» түймесін басыңыз.','fx.delete':'Жұпты жою','fx.rateUnavailable':'Бағам қолжетімсіз','fx.disclaimer':'Анықтамалық бағамдар, сауда үшін емес',
    'finance.rates':'Валюта бағамдары','finance.addCurrency':'Валюта қосу','finance.high':'Ең жоғары','finance.low':'Ең төмен','finance.volume':'Көлемі',
    'wishlist.image':'Сурет','wishlist.name':'Атауы',
    'wishlist.description':'Сипаттама','wishlist.price':'Бағасы',
    'game.start':'Бастау','game.select':'Таңдау',
  },
  en: {
    'ui.clear':'Clear data','ui.theme':'Theme','ui.background':'Background','ui.fullscreen':'Fullscreen','ui.exitFullscreen':'Exit fullscreen','ui.templateUnavailable':'This widget template is unavailable.','ui.serverOnly':'This widget requires a server and is a placeholder in local mode.','ui.language':'Language',
    'ui.workspaces':'Workspaces','ui.categories':'Categories','ui.canvas':'Workspace',
    'ui.createWorkspace':'Create workspace','ui.deleteWorkspace':'Delete workspace',
    'ui.goWorkspace':'Open workspace','ui.defaultWorkspace':'Home','ui.newWorkspace':'New workspace name:',
    'ui.confirmDelete':'Delete workspace “{name}”? Widgets on other workspaces will remain.',
    'ui.confirmReset':'Delete all DashboardX workspaces, widgets, finances and settings from this browser? This cannot be undone.',
    'ui.backgroundPrompt':'Enter an HTTPS/HTTP image URL for “{name}”.\nLeave empty to remove the background:',
    'ui.backgroundInvalid':'Image URL must start with https:// or http://.',
    'ui.otherWorkspace':'Create another workspace with + first.',
    'ui.sharePrompt':'Where should {id} appear?\n{choices}\nEnter a number:',
    'ui.already':'This instance is already on that workspace.',
    'ui.invalidWorkspace':'Invalid workspace number.',
    'ui.alreadyThere':'already here','ui.confirmRemove':'Remove instance {id} from this workspace?',
    'ui.loading':'Loading DashboardX…','ui.startError':'Startup error: {error}','ui.templatesMissing':'Could not load the widget manager.',
    'ui.frameClose':'Remove widget from workspace','ui.frameHide':'Hide widget','ui.frameShow':'Show widget',
    'ui.framePin':'Pin position','ui.frameUnpin':'Unpin position',
    'ui.frameFavorite':'Add to favorites','ui.frameUnfavorite':'Remove from favorites',
    'ui.frameShare':'Show on another workspace','ui.frameSave':'Save position',
    'ui.frameExpand':'Maximize window','ui.frameRestore':'Restore window size',
    'ui.frameResize':'Drag the corner to resize',
    'nav.all':'All','nav.pinned':'Pinned','nav.hidden':'Hidden','nav.favorite':'Favorites',
    'nav.system':'System','nav.finance':'Finance','nav.tools':'Tools',
    'nav.media':'Media','nav.telegram':'Telegram','nav.games':'Games','nav.other':'Other',
    'manager.title':'Add widget','manager.new':'New instance',
    'manager.chooseType':'Choose widget type','manager.create':'Add',
    'manager.createHint':'Each addition gets a new ID. You can create several widgets of the same type.',
    'manager.existing':'Existing instance','manager.chooseId':'Choose by ID',
    'manager.show':'Show','manager.existingHint':'The same ID can appear on different workspaces. Positions remain separate.',
    'manager.onDesk':'On this workspace','manager.empty':'No widgets yet. Choose a type and add one.',
    'manager.noneCreated':'No instances yet — create one first.',
    'manager.templateUnavailable':'Templates unavailable. Refresh the page.',
    'manager.already':'Already here','manager.unplaced':'Not placed',
    'manager.copy':'Copy','manager.copyTip':'Create an independent instance with a new ID',
    'manager.share':'Other workspace','manager.shareTip':'Show the same ID on another workspace',
    'manager.remove':'Remove','manager.removeTip':'Remove this instance from the current workspace',
    'widget.add':'Add widget','widget.datetime':'Date and time','widget.dayBalance':'Income and expenses',
    'widget.financeSummary':'Finance summary','widget.financeTable':'Finance history',
    'widget.moneyConvertApi':'Exchange rates','widget.binanceApi':'Binance',
    'widget.calculator':'Calculator','widget.audioPlayer':'Audio player',
    'widget.videoPlayer':'Video player','widget.wishlistPrice':'Shopping wishlist',
    'widget.wishlistGames':'Games wishlist','widget.nesEmulator':'NES emulator',
    'widget.torrentTracker':'Torrents','widget.telegramBot':'Telegram bot',
    'widget.telegramSettings':'Telegram settings','tg.tokenLabel':'Token TelegramApi','tg.placeholder':'Enter bot token','tg.apply':'Use in this tab','tg.clear':'Clear token','tg.show':'Show','tg.hide':'Hide','tg.notice':'The token is held only in this tab\'s memory and disappears on reload. Telegram requests require a secure backend.','tg.saved':'Token accepted for this tab.','tg.cleared':'No token provided.','tg.invalid':'Enter a non-empty token.',
    'widget.serverConsole':'Server console',
    'finance.income':'Income','finance.expense':'Expense','finance.summary':'Total',
    'finance.date':'Date','finance.view':'View','finance.add':'Add',
    'fx.from':'From currency','fx.to':'Convert to','fx.searchFrom':'Code or name: USD…','fx.searchTo':'Code or name: KZT…','fx.add':'Add pair','fx.refresh':'Refresh rates','fx.loading':'Loading currencies…','fx.ready':'Currencies loaded','fx.updated':'Rates updated','fx.offline':'Could not load rates. Check the connection and press ↻.','fx.stale':'Offline: showing earlier rates from this browser session.','fx.invalid':'Choose both currencies from the suggestions.','fx.same':'Choose two different currencies.','fx.duplicate':'This pair has already been added.','fx.savedPairs':'Saved pairs','fx.empty':'No pairs yet. Choose two currencies and select Add pair.','fx.delete':'Remove pair','fx.rateUnavailable':'Rate unavailable','fx.disclaimer':'Indicative rates, not for trading',
    'finance.rates':'Exchange rates','finance.addCurrency':'Add currency','finance.high':'High','finance.low':'Low','finance.volume':'Volume',
    'wishlist.image':'Image','wishlist.name':'Name',
    'wishlist.description':'Description','wishlist.price':'Price',
    'game.start':'Start','game.select':'Select',
  },
};
let language='ru';
export const languages=['ru','kz','en'];
export const getLanguage=()=>language;
export function setLanguage(value) {
  language=languages.includes(value)?value:'ru';
  document.documentElement.lang=language==='kz'?'kk':language;
}
export function t(key,values={}) {
  const phrase=dictionaries[language]?.[key]??dictionaries.ru[key]??key;
  return phrase.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
}
export const widgetTitle=(type,fallback='')=>dictionaries[language]?.['widget.'+type]??fallback??type;
export const locale=()=>({ru:'ru-RU',kz:'kk-KZ',en:'en-US'})[language];

export function translateElement(root) {
  root.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{ el.placeholder=t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title=t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el=>{ el.setAttribute('aria-label',t(el.dataset.i18nAria)); });
}

// Older templates predate localization. Localize their visible controls without altering
// values, financial identifiers, product names, or application-generated data.
export function translateWidgetBody(widget,type) {
  const text=(selector,key)=>widget.querySelectorAll(selector).forEach(el=>{el.textContent=t(key);});
  const placeholder=(selector,key)=>widget.querySelectorAll(selector).forEach(el=>{el.placeholder=t(key);});
  if(type==='dayBalance') {
    placeholder('[data-input="income"]','finance.income');
    placeholder('[data-input="expense"]','finance.expense');
    text('[data-action="submit-income"], [data-action="submit-expense"]','finance.add');
  }
  if(type==='financeSummary') {
    ['finance.income','finance.expense','finance.summary'].forEach((key,i)=>{
      const item=widget.querySelectorAll('.finance-summary')[i]?.querySelector('span:first-child');
      if(item)item.textContent=t(key)+' (KZT):';
    });
  }
  if(type==='financeTable') {
    ['finance.date','finance.income','finance.expense','finance.summary'].forEach((key,i)=>{
      const header=widget.querySelectorAll('th')[i];
      if(header)header.textContent=t(key);
    });
    text('[data-action="view-period"]','finance.view');
  }
  if(type==='wishlistPrice') {
    ['image','name','description','price'].forEach(key=>placeholder('[data-input="'+key+'"]','wishlist.'+key));
    text('[data-action="submit-new"]','finance.add');
  }
  if(type==='nesEmulator') {
    text('[data-key="Enter"]','game.start');
    text('[data-key="ShiftRight"]','game.select');
  }
}
