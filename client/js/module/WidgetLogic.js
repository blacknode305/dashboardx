// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from './WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from './WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from './EventBus.js';
// Импорт виджетов
import AddWidget from './Widget/Add.js';
import BinanceApiWidget from './Widget/BinanceApi.js';
import DatetimeWidget from './Widget/Datetime.js';
import DayBalanceWidget from './Widget/DayBalance.js';
import FinanceSummaryWidget from './Widget/FinanceSummary.js';
import FinanceTableWidget from './Widget/FinanceTable.js';
import MoneyConvertApiWidget from './Widget/MoneyConvertApi.js';
import CalculatorWidget from './Widget/Calculator.js';
import WishlistPriceWidget from './Widget/WishlistPrice.js';
import WishlistGamesWidget from './Widget/WishlistGames.js';
import AudioPlayerWidget from './Widget/AudioPlayer.js';
import VideoPlayerWidget from './Widget/VideoPlayer.js';
import ServerConsoleWidget from './Widget/ServerConsole.js';
import TelegramBotWidget from './Widget/TelegramBot.js';
import TorrentTrackerWidget from './Widget/TorrentTracker.js';
import NesEmulatorWidget from './Widget/NesEmulator.js';
// TODO: Добавить слушатель переключение Navigation или Workplace, 
// TODO: который эмитит EventBus в Navigation и Workplace, на кнопки из footer.
// TODO: Решить где он будет находится, в WidgetElement || WidgetBase || WidgetLogic.

// Реестр всех виджетов
const WidgetLogic = {
  AddWidget,
  DatetimeWidget,
  DayBalanceWidget,
  FinanceSummaryWidget,
  FinanceTableWidget,
  MoneyConvertApiWidget,
  BinanceApiWidget,
  CalculatorWidget,
  AudioPlayerWidget,
  VideoPlayerWidget,
  WishlistPriceWidget,
  WishlistGamesWidget,
  ServerConsoleWidget,
  TelegramBotWidget,
  TorrentTrackerWidget,
  NesEmulatorWidget,
};
// Экспорт реестра
export default WidgetLogic;
