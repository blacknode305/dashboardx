import WebSocket from 'ws';
import axios from 'axios';

const binancePrices = {};
const binanceApi = {};

export default binanceApi;
// Получаем все текущие цены с Binance через REST API
async function fetchBinancePrices() {
  try {
    const { data } = await axios.get('https://api.binance.com/api/v3/ticker/price');
    data.forEach(p => {
      binancePrices[p.symbol] = parseFloat(p.price);
    });
    console.log('Binance prices loaded:', Object.keys(binancePrices).length);
  } 
  catch (err) {
    console.error('Ошибка при получении Binance цен:', err.message);
  }
}
// Подписка на WebSocket Binance для обновления цен в реальном времени
function initBinanceWS() {
  const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
  ws.on('open', () => {
    console.log('Binance WebSocket подключен');
  });
  ws.on('message', msg => {
    const tickers = JSON.parse(msg);
    tickers.forEach(t => {
      if (t.s === 'ETHUSDT') {
        console.log(t.s, t.c);
      }
      /*
      {
        e: '24hrTicker',
        E: 1769754446037,
        s: 'ETHUSDT',
        p: '-227.47000000',
        P: '-7.701',
        w: '2805.83040544',
        x: '2953.69000000',
        c: '2726.22000000',
        Q: '0.00220000',
        b: '2726.21000000',
        B: '10.53560000',
        a: '2726.22000000',
        A: '36.40140000',
        o: '2953.69000000',
        h: '2969.79000000',
        l: '2689.00000000',
        v: '716767.25450000',
        q: '2011127356.30254700',
        O: 1769668046013,
        C: 1769754446013,
        F: 3519686531,
        L: 3527672680,
        n: 7986150
      }
    */
      //db.finance.rate.crypto[t.s] = parseFloat(t.c);
    });
    //db.update('finance');
    //db.update('crypto');
    
    //console.log(binancePrices);
    //db.binancePrices = binancePrices;
    //console.log(binancePrices.ETHUSDT);
    // TODO: EVENTBUS чтобы отслкживать передачу данных иинициализацию базы
    // TODO: EVENTBUS дает сигнал что данные подготовлены ресурсы загружены сервер готов открыть http соединение
    // TODO: Добавить на сервер проверку поднялась ли цена и отправку сообщения на бота телеграм
  });
}
/*fetchBinancePrices().then(() => {
  console.log(binancePrices.ETHUSDT);
});*/
initBinanceWS();
/*
// ========================
// 1️⃣ Кеш цен Binance
// ========================
const binancePrices = {};
// Получаем все текущие цены с Binance через REST API
async function fetchBinancePrices() {
  try {
    const { data } = await axios.get('https://api.binance.com/api/v3/ticker/price');
    data.forEach(p => {
      binancePrices[p.symbol] = parseFloat(p.price);
    });
    console.log('Binance prices loaded:', Object.keys(binancePrices).length);
  } catch (err) {
    console.error('Ошибка при получении Binance цен:', err.message);
  }
}
// Подписка на WebSocket Binance для обновления цен в реальном времени
function initBinanceWS() {
  const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

  ws.on('open', () => {
    //console.log('Binance WebSocket подключен')
  });

  ws.on('message', msg => {
    const tickers = JSON.parse(msg);
    tickers.forEach(t => {
      binancePrices[t.s] = parseFloat(t.c); // t.s — symbol, t.c — текущая цена
    });
  });
}
*/