import fs from 'fs';
import path from 'path';

import db from './Database.js';

import { fileURLToPath } from 'url';
import dotenv from 'dotenv/config'; // node --env-file=.env app.js
import child_process from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioPlayer = {
  initPlaylist: function() {
    db.playlist[0].track = fs.readdirSync(__dirname + db.playlist[0].dir);
    db.update('playlist');
  },
  getTrack: function(track) {
    const trackPath = path.resolve(__dirname + db.playlist[0].dir + track);
    if (!fs.existsSync(trackPath)) {
      throw new Error('Файл не найден: ' + trackPath);
    }
    const trackBuffer = fs.readFileSync(trackPath);
    console.log('Размер MP3 файла в байтах:', trackBuffer.length);
  }
};
audioPlayer.initPlaylist();
console.log(db);
export default audioPlayer;