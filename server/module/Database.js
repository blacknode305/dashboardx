import fs from 'fs';
import path from 'path';

class Database {
  constructor() {
    this.ROOT_PATH = path.join(
      process.env.HOME,
      '_data/code',
      //process.env.PROJECT_DIR,
      process.env.DASHBOARDX_DIR,
      process.env.SERVER_DIR,
      process.env.DATABASE_DIR
    );
    console.log('server ->' + 
      'module ->' + 
      'Database.js ->' + 
      'constructor() ->' + 
      'this.ROOT_PATH', 
      this.ROOT_PATH
    );
    this.init();
  }
  init() {
    if (!fs.existsSync(this.ROOT_PATH)) {
      console.error('Database directory not found');
      return;
    }
    const files = fs.readdirSync(this.ROOT_PATH);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(this.ROOT_PATH, file);
      const name = path.parse(file).name;
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        this[name] = JSON.parse(content);
      } 
      catch (err) {
        console.error(`Error loading ${file}:`, err.message);
      }
      console.log('server ->' + 
        'module ->' + 
        'Database.js ->' + 
        'init() ->' + 
        'this', 
        this
      );
    }
  }
  update(name) {
    if (!this[name]) {
      console.error(`No data found for ${name}`);
      return;
    }
    const filePath = path.join(this.ROOT_PATH, `${name}.json`);
    const json = JSON.stringify(this[name], null, 2);
    fs.writeFileSync(filePath, json, 'utf-8');
  }
  get(name) {
    if (!this[name]) {
      console.error(`No data found for ${name}`);
      return;
    }
    const filePath = path.join(this.ROOT_PATH, `${name}.json`);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }
}

export default new Database();