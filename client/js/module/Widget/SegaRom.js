// Local Sega cartridge inspection/normalization. ROM bytes stay in the browser.
export const SEGA_EXTENSIONS=Object.freeze(['md','bin','gen','smd','zip','sms','gg','32x','sg']);
export const SEGA_ROM_LIMIT=32*1024*1024;
export const SEGA_ZIP_LIMIT=64*1024*1024;
const ext=name=>String(name||'').split('.').pop().toLowerCase();
const text=(bytes,start,length)=>String.fromCharCode(...bytes.subarray(start,start+length));
export const hasSegaHeader=(bytes,offset=0)=>bytes.length>=offset+0x104&&
  text(bytes,offset+0x100,4).startsWith('SEGA');
const swappedHeader=(bytes,offset=0)=>bytes.length>=offset+0x104&&
  bytes[offset+0x100]===69&&bytes[offset+0x101]===83&&
  bytes[offset+0x102]===65&&bytes[offset+0x103]===71; // ESAG
export function segaFileSystem(name){
  const extension=ext(name);
  if(extension==='sms')return 'segaMS';
  if(extension==='gg')return 'segaGG';
  if(extension==='32x')return 'sega32x';
  return 'segaMD';
}
export function validateSegaFile(file){
  if(!file||typeof file.name!=='string'||typeof file.size!=='number')
    throw Error('Выберите файл игры Sega.');
  const extension=ext(file.name);
  if(!SEGA_EXTENSIONS.includes(extension)){
    if(['cue','iso','chd','cso'].includes(extension))throw Error(
      'Это Sega CD: для запуска нужен полноценный образ диска и BIOS. Сейчас виджет поддерживает картриджные ROM.');
    throw Error('Поддерживаются .md, .bin, .gen, .smd, .sms, .gg, .32x, .sg и .zip с одной игрой.');
  }
  const limit=extension==='zip'?SEGA_ZIP_LIMIT:SEGA_ROM_LIMIT;
  if(file.size<128||file.size>limit)
    throw Error('Размер ROM должен быть от 128 байт до '+Math.round(limit/1048576)+' МБ.');
  return extension;
}
function asFile(bytes,name,oldFile){
  if(typeof File!=='function')throw Error('Браузер не поддерживает загрузку ROM через File API.');
  return new File([bytes],name,{type:'application/octet-stream',
    lastModified:oldFile.lastModified||Date.now()});
}
function swapPairs(bytes){
  if(bytes.length%2)throw Error('Повреждённая парная перестановка байтов в ROM.');
  const out=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i+=2){out[i]=bytes[i+1];out[i+1]=bytes[i]}
  return out;
}
function decodeSmd(bytes,sourceName){
  let start=0;
  if(bytes.length%16384===512)start=512;
  if((bytes.length-start)%16384!==0)
    throw Error('Формат SMD не распознан: неверный размер блоков по 16 КБ. Попробуйте исходный .bin/.md.');
  const out=new Uint8Array(bytes.length-start);
  for(let block=0;block<out.length;block+=16384){
    for(let i=0;i<8192;i++){
      out[block+2*i]=bytes[start+block+8192+i];
      out[block+2*i+1]=bytes[start+block+i];
    }
  }
  return out;
}
function readZipEntries(bytes){
  const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u16=o=>data.getUint16(o,true),u32=o=>data.getUint32(o,true);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(u32(i)===0x06054b50){end=i;break}
  }
  if(end<0)throw Error('ZIP повреждён или архив имеет неподдерживаемую структуру.');
  const count=u16(end+10),offset=u32(end+16),length=u32(end+12);
  if(count===0||count>2000||offset+length>bytes.length)
    throw Error('Некорректное оглавление ZIP или пустой архив.');
  const decoder=new TextDecoder('utf-8');
  const results=[];
  let cursor=offset;
  for(let n=0;n<count;n++){
    if(cursor+46>bytes.length||u32(cursor)!==0x02014b50)
      throw Error('Повреждено оглавление ZIP.');
    const method=u16(cursor+10),compressed=u32(cursor+20),uncompressed=u32(cursor+24);
    const nameLen=u16(cursor+28),extra=u16(cursor+30),comment=u16(cursor+32);
    const local=u32(cursor+42);
    if(cursor+46+nameLen>bytes.length)throw Error('Повреждено имя файла внутри ZIP.');
    const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLen));
    const entry={name,method,compressed,uncompressed,local};
    results.push(entry);
    cursor+=46+nameLen+extra+comment;
  }
  return results;
}
async function extractZip(bytes){
  const files=readZipEntries(bytes);
  const supported=files.filter(entry=>!entry.name.endsWith('/')&&
    !entry.name.startsWith('__MACOSX/')&&!entry.name.split('/').pop().startsWith('.')&&
    SEGA_EXTENSIONS.includes(ext(entry.name))&&ext(entry.name)!=='zip');
  if(supported.length===0)throw Error(
    'В ZIP не найден картриджный ROM Sega. Возможен архив Sega CD, патч или файл другой приставки.');
  if(supported.length>1)throw Error(
    'В ZIP несколько ROM ('+supported.length+'). Распакуйте архив и выберите одну игру.');
  const file=supported[0];
  if(file.uncompressed<128||file.uncompressed>SEGA_ROM_LIMIT)
    throw Error('Размер распакованного ROM превышает 32 МБ или файл пуст.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const start=file.local;
  if(start+30>bytes.length||view.getUint32(start,true)!==0x04034b50)
    throw Error('Повреждена запись ROM внутри ZIP.');
  const nameLength=view.getUint16(start+26,true),extraLength=view.getUint16(start+28,true);
  const offset=start+30+nameLength+extraLength;
  if(offset+file.compressed>bytes.length)throw Error('Содержимое ROM внутри ZIP повреждено.');
  const compressed=bytes.subarray(offset,offset+file.compressed);
  let raw;
  if(file.method===0)raw=compressed.slice();
  else if(file.method===8){
    if(typeof DecompressionStream!=='function')throw Error(
      'Браузер не поддерживает распаковку ZIP. Распакуйте архив вручную и загрузите ROM.');
    try{
      const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      raw=new Uint8Array(await new Response(stream).arrayBuffer());
    }catch{
      throw Error('ZIP не удалось распаковать. Попробуйте извлечь ROM вручную.');
    }
  }else throw Error('Метод сжатия ZIP '+file.method+' не поддерживается. Распакуйте архив вручную.');
  if(raw.length!==file.uncompressed)throw Error('После распаковки ZIP размер ROM не совпал с оглавлением.');
  return {bytes:raw,name:file.name.split('/').pop(),note:'ROM извлечён из ZIP в браузере'};
}
export async function prepareSegaRom(file){
  let extension=validateSegaFile(file);
  let bytes=new Uint8Array(await file.arrayBuffer());
  let name=file.name,notes=[];
  if(extension==='zip'){
    const zipped=await extractZip(bytes);
    bytes=zipped.bytes;name=zipped.name;extension=validateSegaFile({name,size:bytes.length});
    notes.push(zipped.note);
  }
  const system=segaFileSystem(name);
  if(system==='segaMD'||system==='sega32x'){
    const originalHeader=hasSegaHeader(bytes);
    if(extension==='smd'&&!originalHeader){
      bytes=decodeSmd(bytes,name);
      if(!hasSegaHeader(bytes))notes.push('SMD преобразован, но заголовок SEGA не обнаружен');
      else notes.push('SMD преобразован в обычный Mega Drive ROM');
    }else if(!originalHeader&&hasSegaHeader(bytes,512)&&bytes.length%16384===512){
      bytes=bytes.slice(512);
      notes.push('Удалён старый 512-байтный заголовок копировщика');
    }else if(!originalHeader&&swappedHeader(bytes)){
      bytes=swapPairs(bytes);
      notes.push('Исправлен порядок байтов старого дампа');
    }else if(!originalHeader&&swappedHeader(bytes,512)&&bytes.length%16384===512){
      bytes=swapPairs(bytes.slice(512));
      notes.push('Удалён заголовок и исправлен порядок байтов');
    }else if(!originalHeader&&extension!=='smd'){
      notes.push('В ROM нет стандартного заголовка SEGA; если игра не запустится, проверьте дамп');
    }
  }
  if(bytes.length<128||bytes.length>SEGA_ROM_LIMIT)throw Error('Некорректный размер готового ROM.');
  const cleanedName=name.replace(/\.[^.]+$/,'.bin');
  const outName=notes.some(n=>/преобразован|Исправлен|Удалён|из ZIP/.test(n))
    ?(extension==='sms'||extension==='gg'||extension==='32x'?name:cleanedName):name;
  const prepared=notes.length?asFile(bytes,outName,file):file;
  return {file:prepared,name,system,notes,extension,
    size:bytes.length,recognized:system==='segaMD'||system==='sega32x'?hasSegaHeader(bytes):true};
}
