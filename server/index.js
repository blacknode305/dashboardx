
console.log('server/index.js/', 'START');
import dotenv from 'dotenv/config';
import { 
  db,
  // storage,
  // audioPlayer,
  // emulatorApi,
  // binanceApi,
  // moneyConvertApi,
  server,
  wsServer,
  // telegramBot,
} from './module/_module.js';
console.log('MODULE:', {
  // db,
  // storage,
  // audioPlayer,
  // emulatorApi,
  // binanceApi,
  // moneyConvertApi,
  // server,
  // wsServer,
  // telegramBot,
});
//console.log(storage.music);
// TODO: НАСТРОИТЬ HTTPS
// COMMUNITY MODULE
//require('dotenv').config();
//const axios = require('axios');
//const grammy = require('grammy');
//import module from './module/_module.js';


// NATIVE MODULE
//const http = require('http');
//const fs = require('fs');
//const path = require('path');

// MINE MODULE
// const dbServer = require('./module/dbServer.js');

//import Storage from './module/Storage.js';
//console.log(Storage);
//const storage = new Storage();

// const audioPlayer = require('./module/audioPlayer.js');
// const emulatorApi = require('./module/emulatorApi.js');

// const httpServer = require('./module/httpServer.js');
// const wsServer = require('./module/wsServer.js');
// const telegramBot = require('./module/telegramBot.js');
// const binanceApi = require('./module/binanceApi.js');
// const mconvertApi = require('./module/mconvertApi.js');
//import wsServer from './module/wsServer.js';
//import telegramBot from './module/telegramBot.js';
//import binanceApi from './module/binanceApi.js';
//import mconvertApi from './module/mconvertApi.js';
/*
//console.log('module:wsServer', wsServer.sendAll, wsServer.sendOne);
//console.log('module:telegramBot', telegramBot.sendMessageAll, telegramBot.sendMessageOne);

//console.log('package:axios', axios);
//console.log('package:ws', WebSocket);

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const HOST = process.env.HOST;
const PORT = process.env.PORT;


// // путь к mp3
// const mp3Path = path.resolve(__dirname, '../storage/music/Adam Jamar - Time.mp3');
// // проверяем существование
// if (!fs.existsSync(mp3Path)) {
//   throw new Error('Файл не найден: ' + mp3Path);
// }
// // читаем как буфер
// const mp3Buffer = fs.readFileSync(mp3Path);
// console.log('Размер MP3 файла в байтах:', mp3Buffer.length);


// const log = function(message) {
//   const date = new Date();
//   const result = {
//     type: 'server',
//     datetime: {
//       d: date.toLocaleDateString('ru-Ru')('ru-RU'),
//       t: date.toLocaleTimeString('ru-Ru')('ru-RU'),
//     },
//     message: message, 
//   };
//   console.log(result);
// };
// log(db);

//console.log(db);

const telegramNotifyTest = setInterval(() => {
  const result = {
    'ETHUSDT': db.finance.rate.crypto['ETHUSDT'],
    'USDKZT': db.finance.rate.fiat['KZT'],
  };
  telegramBot.sendMessageOne({ type: 'id', data: db.telegram[0].id }, `<b>ETHUSDT = ${result['ETHUSDT'].toFixed(2)} USDT</b>\n<b>USDKZT = ${result['USDKZT'].toFixed(2)} KZT</b>`);
  clearInterval(telegramNotifyTest);
}, 10000);
const telegramNotify = setInterval(() => {
  const result = {
    'ETHUSDT': db.finance.rate.crypto['ETHUSDT'],
    'USDKZT': db.finance.rate.fiat['KZT'],
  };
  console.log('now');
  wsServer.sendLog('app.js:telegramNotify()', result);
  telegramBot.sendMessageOne({ type: 'id', data: db.telegram[0].id }, `<b>ETHUSDT = ${result['ETHUSDT'].toFixed(2)} USDT</b>\n<b>USDKZT = ${result['USDKZT'].toFixed(2)} KZT</b>`);
}, 1000*60);

  //console.log('binancePrices', binancePrices);
  
  //console.log('binancePrices.ETHUSDT', binancePrices.ETHUSDT);
  //console.log('binancePrices.USDUSDT', binancePrices.USDTUSD);
  
  //console.log('usdPrices', usdPrices);
  //console.log('usdPrices.arr', usdPrices.arr);
  
  
  //console.log('usdPrices.KZT', usdPrices.KZT);
  //console.log('usdPrices.RUB', usdPrices.RUB);
  //console.log('usdPrices.EUR', usdPrices.EUR);
  
  
  // ФОРМУЛА ФИАТ "1 [ЗАПРАЩИВАЕМАЯ ВАЛЮТА] = [В КАКОЙ ВАЛЮТЕ ВЫВОД] / [ЗАПРАЩИВАЕМАЯ ВАЛЮТА]"
  // ИСКЛЮЧЕНИЕ 1 ДОЛЛАР ОН ВЫВОДИТСЯ КАК "1 [ЗАПРАЩИВАЕМАЯ ВАЛЮТА] = [В КАКОЙ ВАЛЮТЕ ВЫВОД]"
  //console.log('1 USD =', usdPrices.KZT.toFixed(2) + ' KZT');
  //console.log('1 EUR =', (usdPrices.KZT/usdPrices.EUR).toFixed(2) + ' KZT');
  //console.log('1 RUB =', (usdPrices.KZT/usdPrices.RUB).toFixed(2) + ' KZT');
  //console.log('1 CNY =', (usdPrices.KZT/usdPrices.CNY).toFixed(2) + ' KZT');
  //console.log('1 UZS =', (usdPrices.KZT/usdPrices.UZS).toFixed(2) + ' KZT');
  //console.log('1 KZT =', (usdPrices.UZS/usdPrices.KZT).toFixed(2) + ' UZS');
  /*
  const fiatConvert = function(fiatPair) {
    if (fiatPair.length) {
      
    }
    else {
      
    }
    console.log('fiatPair', fiatPair);
  };
  //fiatConvert({
    //first: usdPrices.EUR, 
    //second: usdPrices.KZT
  //});
  const checkThis = function(startPrice, pair) {
    var currentPrice = 0;
    
    if (pair == '') {
      
    }
    else if (pair == '') {
      
    }
    else {
      
    }
    
    const resultPrice = currentPrice - startPrice;
    return resultPrice.toFixed(2);
  }
  
  const startPrice = {
    //'ETH/USDT': binancePrices.ETHUSDT,
    //'ETH/KZT': (binancePrices.ETHUSDT * binancePrices.USDTUSD) * usdPrices.KZT,
  };
  const currentPrice = {
    'ETH/USDT': function () {
      // 1 КОИН КРИПТЫ В ЗАПРАЩИВАЕМОЙ ВАЛЮТЕ = (ЦЕНА ЗАПРАШИВАЕМОЙ КРИПТЫ К USDT * 1 USD К USDT) * ЗАПРАШИВАЕМУЮ ВАЛЮТУ
      //return binancePrices.ETHUSDT;
    },
    'ETH/KZT': function () {
      // 1 КОИН КРИПТЫ В ЗАПРАЩИВАЕМОЙ ВАЛЮТЕ = (ЦЕНА ЗАПРАШИВАЕМОЙ КРИПТЫ К USDT * 1 USD К USDT) * ЗАПРАШИВАЕМУЮ ВАЛЮТУ
      //return (binancePrices.ETHUSDT * binancePrices.USDTUSD) * usdPrices.KZT;
    },
  };
  const resultPrice = function() {
    const result = (currentPrice['ETH/USDT']() - startPrice['ETH/USDT']);
    if (result > 0) { 
      //console.log('\x1b[32m%s\x1b[0m', '+' + result.toFixed(2));
    }
    else if (result < 0) { 
      //console.log('\x1b[31m%s\x1b[0m', result.toFixed(2)); 
    }
    else { 
      //console.log('\x1b[37m%s\x1b[0m', result.toFixed(2));
    }
    return result;
  };
  
  // Красный
  //console.log('\x1b[31m%s\x1b[0m', 'Это красный текст');
  // Зелёный
  //console.log('\x1b[32m%s\x1b[0m', 'Это зелёный текст');
  // Белый (обычно стандартный)
  //console.log('\x1b[37m%s\x1b[0m', 'Это белый текст');
  // Альтернатива: можно просто reset для стандартного цвета
  //console.log('\x1b[0m%s', 'Это обычный текст');
  
  //console.log('ETH/KZT:', startPrice['ETH/KZT'].toFixed(2));
  //console.log('ETH/USDT:', startPrice['ETH/USDT'].toFixed(2));
  
  const date = new Date();
  let startDate = date.toLocaleTimeString('ru-Ru')('ru-RU');
  setInterval(() => {
    //process.stdout.write('\rETH/USDT: ');
    //resultPrice();
    //console.log(startDate);
  }, 2000);
  
  //let v = startPrice['ETH/USDT'].toFixed(2);
  //let p;
  setInterval(() => {
    //v = resultPrice();
    //p = currentPrice['ETH/USDT']();
    //drawCenterBar(p, v, 30, 30);
  }, 300);
  //console.log('ETH/KZT:', ((binancePrices.ETHUSDT * binancePrices.USDTUSD) * usdPrices.KZT), 'KZT');
  //console.log('10 ETH/KZT:', (((10 * binancePrices.ETHUSDT) * binancePrices.USDTUSD) * usdPrices.KZT), 'KZT');




// TODO: ws использовать для запросов сервера к апи
// апи webviev/native android фон
// ютуб

*/

// TODO: ОБЬЕКТЫ РЕСУРСОВ ЭТО ССЫЛКИ НА ФАЙЛЫ В src/
//const src = { 'hashRANDOMGEN': 'LINK'};


// TODO: переписать с использованием безопасности
// не читать env.
// и пути типа ../../../
/*
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  if (req.url === '/eth-price') {
    const price = db.finance.rate.crypto['ETHUSDT'];
    console.log(price);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ price }));
  } 
  else {
    // Определяем путь к файлу
    let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  
    // Определяем расширение файла
    const extname = path.extname(filePath);
  
    // Проверяем, существует ли файл
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        const contentType = mimeTypes[extname] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  }
});
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('Client WebSocket подключен');
  
  // Отправка сообщений клиенту
  ws.send(JSON.stringify({ 
    type: 'ws:server:message', 
    message: 'Добро пожаловать!' 
  }));

  // Обработка сообщений от клиента
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log({ type: 'ws:client:message', message: data });
      //console.log('clients', wss.clients[0]);
      
      // Ответ клиенту
      ws.send(JSON.stringify({ type: 'ws:server:message', message: 'Сообщение получено!' }));
      
      // Пример broadcast всем клиентам
      wss.clients.forEach((client) => {
        db.wss = [ ];
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'ws:server:message', message: 'Наслаждайся процессом!' }));
        }
        if (client === ws && client.readyState === WebSocket.OPEN) {
          db.wss.push({
            id: 'id',
            info: {
              username: 'blacknode301',
              telegramId: db.telegram[0].id,
              telegram: db.telegram[0],
              other: undefined,
            },
            client: client,
          });
          console.log(db.wss);
          client.send(JSON.stringify({ type: 'ws:server:message', message: 'Наслаждайся процессом!' }));
        }
      });
      
      ws.send(JSON.stringify({ type: 'ws:server:message', message: 'Наслаждайся уверенно!' }));
    } 
    catch (err) {
      console.error('Ошибка парсинга JSON:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Неверный JSON' }));
    }
  });

  ws.on('close', () => {
    console.log('Клиент отключился');
  });
});
server.listen(3000, HOST, () => {
  console.log(`Server running at http://${HOST}:${3000}/`);
});
*/