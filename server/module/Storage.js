import fs from 'fs';
import path from 'path';

import db from './Database.js';
/*
class Storage {
  constructor(currentPath) {
    this.path = currentPath;
    this.name = path.basename(currentPath);
    this.type = 'directory';
    this.init();
  }
  init() {
    const entries = fs.readdirSync(this.path, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(this.path, entry.name);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // 🔁 РЕКУРСИЯ
        this[entry.name] = new Storage(fullPath);
      } 
      else {
        this[entry.name] = {
          path: fullPath,
          name: entry.name,
          type: 'file',
          extname: path.extname(entry.name),
          size: this.formatSize(stat.size),
          time: {
            created: stat.birthtimeMs,
            modified: stat.mtimeMs,
            changed: stat.ctimeMs,
            accessed: stat.atimeMs,
          },
          stat
        };
      }
    }
  }
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(2) + ' MB';
    return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
  }
}
*/
class Storage {
  constructor() {
    this.ROOT_PATH = path.join(
      process.env.HOME,
      process.env.PROJECT_DIR,
      process.env.DASHBOARDX_DIR,
      process.env.STORAGE_DIR
    );
    this.CATALOG = fs.readdirSync(this.ROOT_PATH);
    
    const homeStorage = fs.existsSync(path.join(process.env.HOME, process.env.STORAGE_DIR));
    if (!homeStorage) {
      this.HOME_STORAGE_PATH = path.join(
        process.env.HOME,
        process.env.STORAGE_DIR
      );
      this.HOME_STORAGE_DIR = fs.readdirSync(this.HOME_STORAGE_PATH);
      
      this.HOME_STORAGE_SHARED_PATH = path.join(
        process.env.HOME,
        process.env.STORAGE_DIR + '/shared'
      );
      this.HOME_STORAGE_SHARED_DIR = fs.readdirSync(this.HOME_STORAGE_SHARED_PATH);
      
      this.HOME_STORAGE_SHARED_DOWNLOAD_PATH = path.join(
        process.env.HOME,
        process.env.STORAGE_DIR + '/shared' + '/download'
      );
      this.HOME_STORAGE_SHARED_DOWNLOAD_DIR = fs.readdirSync(this.HOME_STORAGE_SHARED_DOWNLOAD_PATH);
      
      this.HOME_STORAGE_SHARED_DOWNLOAD_DATA_PATH = path.join(
        process.env.HOME,
        process.env.STORAGE_DIR + '/shared' + '/download' + '/_data'
      );
      this.HOME_STORAGE_SHARED_DOWNLOAD_DATA_DIR = fs.readdirSync(this.HOME_STORAGE_SHARED_DOWNLOAD_DATA_PATH);
    } // TODO: Убрать !
    
    this.init();
  }
  init() {
    for (const obj of this.CATALOG) {
      const stat = fs.statSync(path.join(this.ROOT_PATH, obj));
      this[obj] = {
        path: path.join(this.ROOT_PATH, obj), // Путь
        name: stat.isDirectory() ? obj : obj.split('.')[0], // Имя
        extname: stat.isDirectory() ? '' : obj.split('.')[1], // Расширение файла
        type: stat.isDirectory() ? 'directory' : 'file', // Проверка файл/директория
        size: stat.isDirectory() ? this.formatSize(this.getFolderSize(path.join(this.ROOT_PATH, obj))) : this.formatSize(stat.size), // Размер файла/директории
        time: {
          created: [
            new Date(stat.birthtimeMs).toLocaleDateString('ru-RU'),
            new Date(stat.birthtimeMs).toLocaleTimeString('ru-RU'),
          ], // Время изменения метаданных
          modified: [
            new Date(stat.mtimeMs).toLocaleDateString('ru-RU'),
            new Date(stat.mtimeMs).toLocaleTimeString('ru-RU'),
          ], // Время изменения контента
          changed: [
            new Date(stat.ctimeMs).toLocaleDateString('ru-RU'),
            new Date(stat.ctimeMs).toLocaleTimeString('ru-RU'),
          ], // Время изменения метаданных
          accessed: [
            new Date(stat.atimeMs).toLocaleDateString('ru-RU'),
            new Date(stat.atimeMs).toLocaleTimeString('ru-RU'),
          ], // Время последнего доступа
        },
        stat: {
          isFile: stat.isFile(), // True, если файл
          isDirectory: stat.isDirectory(), // True, если директория
          isBlockDevice: stat.isBlockDevice(),
          isCharacterDevice: stat.isCharacterDevice(),
          isSymbolicLink: stat.isSymbolicLink(),
          isFIFO: stat.isFIFO(),
          isSocket: stat.isSocket(),
          dev: stat.dev, // ID устройства, на котором находится файл
          mode: stat.mode, // Режим/права доступа + тип файла (например, папка или файл)
          nlink: stat.nlink, // Количество жёстких ссылок на файл/папку
          uid: stat.uid, // ID владельца файла (user id)
          gid: stat.gid, // ID группы владельца файла (group id)
          rdev: stat.rdev, // Device ID для специальных файлов (обычно 0 для обычных)
          blksize: stat.blksize, // Размер блока файловой системы для ввода/вывода
          ino: stat.ino, // Номер inode (уникальный идентификатор файла в файловой системе)
          size: stat.size, // Размер файла в байтах
          blocks: stat.blocks, // Количество блоков, выделенных для файла на диске
          atimeMs: stat.atimeMs, // Время последнего доступа в миллисекундах с эпохи UNIX
          mtimeMs: stat.mtimeMs, // Время последнего изменения содержимого файла
          ctimeMs: stat.ctimeMs, // Время последнего изменения метаданных (прав, владельца, etc.)
          birthtimeMs: stat.birthtimeMs // Время создания файла
        },
      };
    }
    /*
      mimeType: string,          // MIME типа (например audio/mpeg)
      contentType?: string,      // для отправки в HTTP заголовке
      readFormat?: 'utf8' | 'buffer' | 'base64', // для fs.readFile
      
      fileType?: 'audio' | 'image' | 'video' | 'document' | 'other',
      
      audio?: {
        duration?: number;        // секунды
        bitrate?: number;         // kbps
        sampleRate?: number;      // Hz
        channels?: number;        // 1,2
        artist?: string;
        album?: string;
        title?: string;
        trackNumber?: number;
        genre?: string;
        year?: number;
        cover?: string;           // путь к обложке
        lyrics?: string;
        codec?: string;
      };
      image?: {
        width?: number;
        height?: number;
        format?: string;          // JPEG, PNG
        colorDepth?: number;
        orientation?: 'portrait' | 'landscape';
        exif?: Record<string, any>;
        thumbnail?: string;
        dominantColor?: string;
      };
      video?: {
        duration?: number;
        width?: number;
        height?: number;
        frameRate?: number;
        bitrate?: number;
        codec?: string;
        audioChannels?: number;
        thumbnail?: string;
        aspectRatio?: string;
      };
      document?: {
        pages?: number;
        author?: string;
        title?: string;
        language?: string;
        textPreview?: string;
      };
    */
    console.log('TODO 1: STORAGE', this); // console.log(db);
    //console.log('TODO 2: STORAGE', this); // console.log(db);
  }
  getFolderSize(filePath) {
    const stats = fs.statSync(filePath); // обращаемся к целевому объекту, а не к ссылке
    if (stats.isFile()) {
      return stats.size; // размер файла в байтах
    }
    if (stats.isDirectory()) {
      let total = 0;
      const entries = fs.readdirSync(filePath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(filePath, entry.name);
        total += this.getFolderSize(fullPath); // рекурсивно суммируем
      }
      return total;
    }
    return 0;
  }
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(2) + ' MB';
    return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
  }

  fromBytes(bytes) {
    //if (bytes < 1024) => bytes;
    //if (bytes < 1024) => bytes / 1024;
    //if (bytes < 1024 ** 2) => bytes / 1024 ** 2;
    //const bytesToGB = (bytes) => bytes / 1024 ** 3;
    //const bytesToTB = (bytes) => bytes / 1024 ** 4;
  }
  toBytes(size, name) {
    // if (name === 'kb') => kb * 1024;
    // if (name === 'mb') => mb * 1024 ** 2;
    // if (name === 'gb') => gb * 1024 ** 3;
    // if (name === 'tb') => tb * 1024 ** 4;
  }
  
  addSymbolicLink(name, path) {
    
  }
  deleteSymbolicLink(name, path) {
    
  }
  
  makeFolder(name, path) {
    
  }
  moveFolder(oldPath, name, newPath) {
    
  }
  copyFolder(oldPath, name, newPath) {
    
  }
  renameFolder(oldName, newName, path) {
    
  }
  
  makeFile(name, path) {
    
  }
  moveFile(oldPath, name, newPath) {
    
  }
  copyFile(oldPath, name, newPath) {
    
  }
  renameFile(oldName, newName, path) {
    
  }
}

export default new Storage();