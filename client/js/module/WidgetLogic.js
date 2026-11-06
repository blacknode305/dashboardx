// Импорт базового класса виджета (пока не используется напрямую)
// Импорт класса для работы с DOM-элементами виджета
// Импорт глобальной шины событий (EventBus)
// Импорт виджетов
import AddWidget from './Widget/Add.js?v=study-expanded-20261101d';
import BinanceApiWidget from './Widget/BinanceApi.js';
import DatetimeWidget from './Widget/Datetime.js';
import DayBalanceWidget from './Widget/DayBalance.js';
import FinanceSummaryWidget from './Widget/FinanceSummary.js';
import FinanceTableWidget from './Widget/FinanceTable.js';
import MoneyConvertApiWidget from './Widget/MoneyConvertApi.js';
import CalculatorWidget from './Widget/Calculator.js';
import EnglishLanguageWidget from './Widget/EnglishLanguage.js?v=english-study-20261101c';
import StudyCourseWidget from './Widget/StudyCourse.js?v=mimic-social-20261101b';
import LocalCollectionWidget from './Widget/LocalCollection.js?v=nes-interactions-20261026';
import MediaPlayerWidget from './Widget/MediaPlayer.js?v=nes-interactions-20261026';
import ServerConsoleWidget from './Widget/ServerConsole.js?v=nes-interactions-20261026';
import TelegramBotWidget from './Widget/TelegramBot.js?v=nes-interactions-20261026';
import DiscordPortalWidget from './Widget/DiscordPortal.js?v=discord-portal-20261101';
import DashboardSettingsWidget from './Widget/DashboardSettings.js';
import OptimaSuppliersWidget from './Widget/OptimaSuppliers.js?v=widget-inline-editors-20261101b';
import OptimaDataWidget from './Widget/OptimaData.js?v=catalog-manual-add-20261106';
import OptimaOrdersWidget from './Widget/OptimaOrders.js';
import NesEmulatorWidget from './Widget/NesEmulator.js?v=nes-interactions-20261026';
import SegaEmulatorWidget from './Widget/SegaEmulator.js?v=sega-rom-compat-20261101c';
import RealtyRadarWidget from './Widget/RealtyRadar.js?v=realty-radar-20261101';
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
  EnglishLanguageWidget,
  PsychologyWidget:StudyCourseWidget,
  LogicWidget:StudyCourseWidget,
  MimicWidget:StudyCourseWidget,
  EconomicsWidget:StudyCourseWidget,
  AudioPlayerWidget: MediaPlayerWidget,
  VideoPlayerWidget: MediaPlayerWidget,
  WishlistPriceWidget: LocalCollectionWidget,
  WishlistGamesWidget: LocalCollectionWidget,
  ServerConsoleWidget,
  TelegramBotWidget,
  DiscordPortalWidget,
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
  SegaEmulatorWidget,
  RealtyRadarWidget,
  GithubControlWidget: GithubControlWidgetView,
  ServerMonitorWidget: ServerMonitorWidgetView,
  SmartContactsWidget: SmartContactsWidgetView,
  DashboardAiWidget: DashboardAiWidgetView,
};
// Экспорт реестра
export default WidgetLogic;
