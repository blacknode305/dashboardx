import db from './Database.js';  

import axios from 'axios';
import WebSocket from 'ws';

export default mConvertApi;
// ========================
// 2️⃣ Кеш курсов MoneyConvert (фиат)
// ========================
/*
let db.finance.fiat = null;
// Получаем фиатные курсы
async function fetchMoneyConvert() {
  try {
    setInterval(() => {
      const { data } = axios.get('https://cdn.moneyconvert.net/api/latest.json');
      db.finance.fiat = data.rates; // объект вида { 'USD':1, 'EUR':0.92, ... }
      db.finance.fiat.arr = []; 
      for (e in db.finance.fiat) { db.finance.fiat.arr.push(e) }
      //console.log('MoneyConvert rates loaded:', Object.keys(db.finance.fiat).length);
      console.log(db.finance.fiat.KZT);
    }, 1000);
  } 
  catch (err) {
    console.error('Ошибка при получении MoneyConvert:', err.message);
  }
}
*/
async function fetchMoneyConvert() {
  /*
  setInterval(async () => {
    try {
      const response = await fetch('https://cdn.moneyconvert.net/api/latest.json');
      const data = await response.json();
      
      db.finance.fiat = data.rates; // объект вида { 'USD':1, 'EUR':0.92, ... }
      db.finance.fiat.arr = [];
      for (let e in db.finance.fiat) {
        db.finance.fiat.arr.push(e);
      }
      
      // Получаем сегодняшнюю дату в формате dd.mm.yyyy
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const todayStr = `${dd}.${mm}.${yyyy}`;
      
      sendMessageTelegram(db.telegram, `📅 ${todayStr}:\n💰 <b>1$ = ${db.finance.fiat.KZT.toFixed(2)}₸</b>`);
    } 
    catch (err) {
      console.error('Ошибка при получении MoneyConvert:', err.message);
    }
  }, 1000*60*60); // интервал 1 час
  */
  const one = setInterval(async () => {
    try {
      const response = await fetch('https://cdn.moneyconvert.net/api/latest.json');
      const data = await response.json();
      data.rates.list = db.finance.rate.fiat.list;
      db.finance.rate.fiat = data.rates;
      db.update('finance');
      //db.update('fiat');
    } 
    catch (err) {
      console.error('Ошибка при получении MoneyConvert:', err.message);
    }
    //clearInterval(one);
  }, 1000); // интервал 1 секунда
}
// Запуск
fetchMoneyConvert();