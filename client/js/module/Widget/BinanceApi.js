// Импорт базового класса виджета (пока не используется напрямую)
import WidgetBase from '../WidgetBase.js';
// Импорт класса для работы с DOM-элементами виджета
import WidgetElement from '../WidgetElement.js';
// Импорт глобальной шины событий (EventBus)
import eventBus from '../EventBus.js';

export default class BinanceApiWidget {
  constructor(widget) {
    this.widget = widget;

    // Пара
    this.symbol = widget.dataset.symbol && widget.dataset.symbol !== '#'
      ? widget.dataset.symbol
      : 'ETHUSDT';

    // Таймфрейм
    this.interval = '1m';

    // DOM
    this.symbolEl = widget.querySelector('[data-role="symbol"]');
    this.priceEl = widget.querySelector('[data-role="price"]');
    this.changeEl = widget.querySelector('[data-role="change"]');
    this.statsEl = widget.querySelector('[data-role="stats"]');
    this.intervalSelect = widget.querySelector('[data-role="interval"]');
    this.canvas = widget.querySelector('canvas');

    this.chart = null;

    // UI
    this.symbolEl && (this.symbolEl.textContent = this.symbol);

    // События
    this.intervalSelect?.addEventListener('change', e => {
      this.interval = e.target.value;
      this.loadKlines();
    });

    // Инициализация
    this.loadTicker();
    this.loadKlines();

    this.tickerTimer = setInterval(() => this.loadTicker(), 5000);
  }

  /* ===============================
     24h Ticker
  =============================== */
  async loadTicker() {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${this.symbol}`
      );
      const d = await res.json();
      if (!d?.lastPrice) return;

      const price = +d.lastPrice;
      const change = +d.priceChangePercent;
      const high = +d.highPrice;
      const low = +d.lowPrice;
      const volume = +d.volume;
      
      window.db.rate.ETH = price;
      //console.log(window.db.rate.ETH);
      this.priceEl && (this.priceEl.textContent = price.toFixed(2));

      if (this.changeEl) {
        this.changeEl.textContent = `${change.toFixed(2)}%`;
        this.changeEl.className = change >= 0 ? 'green-color' : 'red-color';
      }

      if (this.statsEl) {
        this.statsEl.innerHTML = `
          <div>High: ${high.toFixed(2)}</div>
          <div>Low: ${low.toFixed(2)}</div>
          <div>Volume: ${volume.toFixed(2)}</div>
        `;
      }
    } catch (e) {
      console.warn('BinanceApiWidget ticker error', e);
    }
  }

  /* ===============================
     Klines / Chart
  =============================== */
  async loadKlines() {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${this.symbol}&interval=${this.interval}&limit=60`
      );
      const data = await res.json();

      const labels = data.map(d =>
        new Date(d[0]).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      );
      const prices = data.map(d => +d[4]);

      this.renderChart(labels, prices);
    } catch (e) {
      console.warn('BinanceApiWidget klines error', e);
    }
  }

  renderChart(labels, prices) {
    if (!this.canvas) return;

    this.chart?.destroy();

    this.chart = new Chart(this.canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: prices,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: false }
        }
      }
    });
  }

  /* ===============================
     Destroy
  =============================== */
  destroy() {
    clearInterval(this.tickerTimer);
    this.chart?.destroy();
    this.chart = null;
  }
}