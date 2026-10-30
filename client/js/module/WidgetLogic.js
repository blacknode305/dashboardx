// Импорт базового класса виджета (пока не используется напрямую)
// Импорт класса для работы с DOM-элементами виджета
// Импорт глобальной шины событий (EventBus)
// Импорт виджетов
import AddWidget from './Widget/Add.js?v=folded-widget-categories-20261026';
import BinanceApiWidget from './Widget/BinanceApi.js';
import DatetimeWidget from './Widget/Datetime.js';
import DayBalanceWidget from './Widget/DayBalance.js';
import FinanceSummaryWidget from './Widget/FinanceSummary.js';
import FinanceTableWidget from './Widget/FinanceTable.js';
import MoneyConvertApiWidget from './Widget/MoneyConvertApi.js';
import CalculatorWidget from './Widget/Calculator.js';
import LocalCollectionWidget from './Widget/LocalCollection.js?v=nes-interactions-20261026';
import MediaPlayerWidget from './Widget/MediaPlayer.js?v=nes-interactions-20261026';
import ServerConsoleWidget from './Widget/ServerConsole.js?v=nes-interactions-20261026';
import TelegramBotWidget from './Widget/TelegramBot.js?v=nes-interactions-20261026';
import DashboardSettingsWidget from './Widget/DashboardSettings.js';
import OptimaSuppliersWidget from './Widget/OptimaSuppliers.js?v=optima-add-supplier-20261030';
import OptimaDataWidget from './Widget/OptimaData.js?v=optima-branch-clean-20261030';
import OptimaOrdersWidget from './Widget/OptimaOrders.js';
import NesEmulatorWidget from './Widget/NesEmulator.js?v=nes-interactions-20261026';
import {
  GithubControlWidgetView,
  ServerMonitorWidgetView,
  SmartContactsWidgetView,
  DashboardAiWidgetView
} from './Widget/WidgetLabViews.js';

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
  AudioPlayerWidget: MediaPlayerWidget,
  VideoPlayerWidget: MediaPlayerWidget,
  WishlistPriceWidget: LocalCollectionWidget,
  WishlistGamesWidget: LocalCollectionWidget,
  ServerConsoleWidget,
  TelegramBotWidget,
  DashboardSettingsWidget,
  OptimaSuppliersWidget,
  OptimaProductsWidget: OptimaDataWidget,
  OptimaProposalsWidget: OptimaDataWidget,
  OptimaOffersWidget: OptimaDataWidget,
  OptimaCompareWidget: OptimaDataWidget,
  OptimaStocksWidget: OptimaDataWidget,
  OptimaOrdersWidget,
  TorrentTrackerWidget: LocalCollectionWidget,
  NesEmulatorWidget,
  GithubControlWidget: GithubControlWidgetView,
  ServerMonitorWidget: ServerMonitorWidgetView,
  SmartContactsWidget: SmartContactsWidgetView,
  DashboardAiWidget: DashboardAiWidgetView,
};
// Экспорт реестра
export default WidgetLogic;
