// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class MoneyConvertApiWidget {
  constructor(widget) {
    this.widget = widget;
    this.initEventBus();
    this.init(); // запуск асинхронной инициализации
    //this.renderMoneyConvertApi();
    //this.timer = setInterval(() => this.init(), 1000 * 60 * 5);
    this.timer = setInterval(() => this.init(), 1000);
  }
  async init() {
    await this.getExchangeRate();
    this.renderMoneyConvertApi();
  }
  initEventBus() {
    eventBus.on('finance:dayBalanceWidget:updated', async () => {
      this.loadData();
      await this.getExchangeRate();
      this.renderMoneyConvertApi();
      eventBus.emit('finance:MoneyConvertApiWidget:updated');
    });
  }
  async getExchangeRate() {
    const res = await fetch("https://cdn.moneyconvert.net/api/latest.json");
    const data = await res.json();
    window.db.rate.KZT = data.rates.KZT;
    window.db.rate.ETHM = data.rates.ETH;
    window.db.rate.RUB = data.rates.RUB;
    //console.log(window.db.finance);
  }
  // Загрузка из localStorage
  loadData() {
    const saved = localStorage.getItem(`finance_${window.db.userId}`);
    if (saved) {
      window.db.finance = JSON.parse(saved);
    }
  }
  renderMoneyConvertApi() {
    let incomeUSD = 0, expenseUSD = 0, resultUSD = 0;
    
    if (window.db.rate.KZT) {
      const income = window.db.finance.table.reduce((a, b) => a + b.income, 0);
      const expense = window.db.finance.table.reduce((a, b) => a + b.expense, 0);
      
      incomeUSD = income / window.db.rate.KZT;
      expenseUSD = expense / window.db.rate.KZT;
      resultUSD = incomeUSD - expenseUSD;
    }
    this.widget.querySelectorAll('[data-role="rate-kzt"]').forEach(el => el.textContent = window.db.rate.KZT.toFixed(2) + ' KZT');
    this.widget.querySelectorAll('[data-role="rate-rub"]').forEach(el => el.textContent = (window.db.rate.KZT / window.db.rate.RUB).toFixed(2) + ' KZT');
    this.widget.querySelectorAll('[data-role="rate-rub-usd"]').forEach(el => el.textContent = window.db.rate.RUB.toFixed(2) + ' RUB');
    
    //console.log(window.db.rate.ETH.toFixed(2))
    this.widget.querySelectorAll('[data-role="rate-eth"]').forEach(el => el.textContent = window.db.rate.ETH.toFixed(2) + ' USDT');
    this.widget.querySelectorAll('[data-role="rate-eth-m"]').forEach(el => el.textContent = window.db.rate.ETHM.toFixed(2) + ' USD');
    this.widget.querySelectorAll('[data-role="rate-eth-kzt"]').forEach(el => el.textContent = (window.db.rate.ETH * window.db.rate.KZT).toFixed(2) + ' KZT');
    this.widget.querySelectorAll('[data-role="rate-eth-rub"]').forEach(el => el.textContent = (window.db.rate.ETH * window.db.rate.RUB).toFixed(2) + ' RUB');
    
    //this.widget.querySelectorAll('[data-role="income-usd"]').forEach(el => el.textContent = incomeUSD.toFixed(2) + ' USD');
    //this.widget.querySelectorAll('[data-role="expense-usd"]').forEach(el => el.textContent = expenseUSD.toFixed(2) + ' USD');
    this.widget.querySelectorAll('[data-role="result-usd"]').forEach(el => el.className = resultUSD >= 0 ? 'blue-color' : 'red-color');
    this.widget.querySelectorAll('[data-role="result-usd"]').forEach(el => el.textContent = resultUSD.toFixed(2) + ' USD');
  }
  destroy() {
    clearInterval(this.timer);
  }
}