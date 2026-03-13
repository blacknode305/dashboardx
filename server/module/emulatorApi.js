import fs from 'fs';
import path from 'path';

import db from './Database.js';

const emulatorApi = {
  initRom: function() {
    db.emulator[0].country = fs.readdirSync(__dirname + db.emulator[0].dir +  db.emulator[0].name);
    db.emulator[0].rom = { };
    for (const i of db.emulator[0].country) {
      db.emulator[0].rom[i] = fs.readdirSync(__dirname + db.emulator[0].dir + db.emulator[0].name + '/' + i);
      //console.log('now: i', i);
      //console.log('now: i=db.emulator[0][i]', db.emulator[0][i]);
    }
    db.update('emulator');
  },
  getRom: function(rom) {
    console.log(db.emulator[0].dir + rom);
    const romPath = path.resolve(__dirname + db.emulator[0].dir + rom);
    if (!fs.existsSync(romPath)) {
      throw new Error('Файл не найден: ' + romPath);
    }
    const romBuffer = fs.readFileSync(romPath);
    console.log('Размер ROM файла в байтах:', romBuffer.length);
  }
};
emulatorApi.initRom();
console.log(db.emulator);

export default emulatorApi;