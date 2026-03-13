import { Bot } from 'grammy';

import db from './Database.js';  

const bot = new Bot(process.env.API_TELEGRAM_TOKEN);

bot.command('start', (context) => {
  const user = context.update.message.chat;
  if (findUserTelegram(user.id)) {
    context.reply('Снова приветствуем!');
  }
  else {
    db.telegram.push(user);
    db.update('telegram');
    context.reply('Приветствуем!');
  }
});

bot.command('binance', (context) => {
  try {
    const pair = context.message.text.split(' ')[1];
    const price = db.finance.rate.crypto[pair];
    context.reply(`<b>${pair} = ${price} USDT</b>`, { parse_mode: 'HTML' });
  }
  catch (error) {
    context.reply(error.toString());
  }
});
bot.command('fiat', (context) => {
  try {
    const pair = context.message.text.split(' ')[1];
    console.log(pair.split('USD')[1]);
    const price = db.finance.rate.fiat[pair.split('USD')[1]];
    context.reply(`<b>${pair} = ${price.toFixed(2)} ${pair.split('USD')[1]}</b>`, { parse_mode: 'HTML' });
  }
  catch (error) {
    context.reply(error.toString());
  }
});


function sendMessageAll(context) {
  for (const user of db.telegram) {
    bot.api.sendMessage(user.id, context, { parse_mode: 'HTML' });
  }
}
function sendMessageOne(one, context) {
  for (const user of db.telegram) {
    if (one.type === 'username') {
      if (user.username === one.data) { 
        //bot.api.sendMessage(user.id, context, { parse_mode: 'HTML' });
      }
    }
    else if (one.type === 'id') {
      if (user.id === one.data) { 
        //bot.api.sendMessage(user.id, context, { parse_mode: 'HTML' });
      }
    }
  }
};

function findUserTelegram(id) {
  for (i in db.telegram) {
    if (id == db.telegram[i].id) {
      return true;
    }
  }
  return false;
}

bot.start();
export default { 
  sendMessageAll, 
  sendMessageOne 
};

/*
telegramBot.sendMessageOne({ type: 'username', data: 'tg_blacknode301' }, { message: 'hello' });
telegramBot.sendMessageOne({ type: 'id', data: db.telegram[0].id }, { message: 'hello' });

telegramBot.sendMessageAll({ type: 'eth', price: 2450 });
*/