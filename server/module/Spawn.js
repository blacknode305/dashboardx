import fs from 'fs';
import path from 'path';

import child_process from 'child_process';

class Spawn {
    //console.log('proccess', child_process);
    //console.log('proccess.spawn()', child_process.spawn('ls', ['-la']));
    
    // TODO: МОЖНО ЗАПУСКАТЬ СКРИПТЫ ИЗ Браузера
    // например ln
    const ls = child_process.spawn('ls', ['-la']);
    ls.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    ls.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    ls.on('close', (code) => {
      console.log(`Процесс завершился с кодом ${code}`);
    });
}

export default new Spawn();