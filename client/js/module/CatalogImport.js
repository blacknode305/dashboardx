// Price-list import preview for the Optima catalogue. No writes before explicit confirmation.
import { patchOptima, rows } from './OptimaAPI.js';
const MAX_BYTES=12*1024*1024;
const MAX_ROWS=12000;
const clean=v=>String(v??'').trim().replace(/\s+/g,' ');
const norm=v=>clean(v).toLocaleLowerCase('ru');
const cellText=v=>{
  if(v===null||v===undefined)return '';
  if(typeof v==='object'){
    if(Array.isArray(v.richText))return v.richText.map(x=>x.text||'').join('');
    if(Object.prototype.hasOwnProperty.call(v,'result'))return cellText(v.result);
    if(Object.prototype.hasOwnProperty.call(v,'text'))return String(v.text||'');
    if(v instanceof Date)return v.toLocaleDateString('ru-RU');
    return '';
  }
  return clean(v);
};
const priceOf=value=>{
  const source=clean(value).replace(/[\u00a0\u202f]/g,'');
  if(!source)return null;
  let digits=source.replace(/(?:₸|тг|тенге|kzt|руб\.?|₽|\$|usd)/gi,'').replace(/\s/g,'');
  if(/^\d+[.,]\d{3}(?:[.,]\d{3})*$/.test(digits))digits=digits.replace(/[.,]/g,'');
  else if(digits.includes(',')&&digits.includes('.')){
    digits=digits.lastIndexOf(',')>digits.lastIndexOf('.')?digits.replace(/\./g,'').replace(',','.'):digits.replace(/,/g,'');
  }else if(digits.includes(','))digits=digits.replace(',','.');
  if(!/^\d+(?:\.\d{1,3})?$/.test(digits))return NaN;
  const number=Number(digits);
  return Number.isFinite(number)&&number>=0?number:NaN;
};
const normalizeHeader=v=>norm(v).replace(/[^а-яa-z0-9]+/gi,'');
const inferColumn=(headers,type)=>{
  const patterns={
    name:[/наименование/,/названи/,/товар/,/номенклатур/,/продукт/,/product/,/^name$/],
    unit:[/единиц/,/^едизм/,/^ед/,/^unit$/, /^uom$/, /упаковк/],
    price:[/цена/,/прайс/,/стоимост/,/price/,/^розниц/,/заединицу/]
  }[type];
  return headers.findIndex(v=>patterns.some(re=>re.test(normalizeHeader(v))));
};
const parseDelimited=(text,delimiter)=>{
  const data=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(ch===delimiter&&!quoted){row.push(field);field='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&text[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.some(v=>String(v).trim()))data.push(row.map(cellText));
      row=[];
      if(data.length>MAX_ROWS+35)throw Error('Слишком много строк. Разделите прайс-лист на части.');
    }else field+=ch;
  }
  if(quoted)throw Error('Незакрытые кавычки в CSV-файле.');
  row.push(field);
  if(row.some(v=>String(v).trim()))data.push(row.map(cellText));
  return data;
};
const detectDelimiter=text=>{
  const lines=text.split(/\r?\n/).slice(0,12).join('\n');
  const counts={';':0,'\t':0,',':0};
  let quoted=false;
  for(let i=0;i<lines.length;i++){
    const ch=lines[i];
    if(ch==='"')quoted=!quoted;
    else if(!quoted&&ch in counts)counts[ch]++;
  }
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
};
let libraryPromise=null;
const loadExcelLibrary=()=>{
  if(window.ExcelJS)return Promise.resolve(window.ExcelJS);
  if(libraryPromise)return libraryPromise;
  libraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    script.async=true;
    script.onload=()=>window.ExcelJS?resolve(window.ExcelJS):reject(Error('Библиотека Excel не загрузилась.'));
    script.onerror=()=>reject(Error('Не удалось загрузить обработчик XLSX. Проверьте интернет или используйте CSV.'));
    document.head.append(script);
  }).catch(error=>{libraryPromise=null;throw error});
  return libraryPromise;
};
const readPriceFile=async file=>{
  if(!file||file.size>MAX_BYTES)throw Error('Максимальный размер файла — 12 МБ.');
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='xlsx'){
    const ExcelJS=await loadExcelLibrary();
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheets=[];
    for(const sheet of workbook.worksheets){
      const result=[];
      sheet.eachRow({includeEmpty:false},row=>{
        if(result.length>MAX_ROWS+35)return;
        const values=Array.from({length:Math.min(row.cellCount,60)},(_,i)=>cellText(row.getCell(i+1).value));
        result.push(values);
      });
      if(result.length>MAX_ROWS+35)throw Error('Слишком много строк на листе «'+sheet.name+'».');
      if(result.length)sheets.push({name:sheet.name,rows:result});
    }
    if(!sheets.length)throw Error('В файле не найдены строки с данными.');
    return sheets;
  }
  if(!['csv','tsv','txt'].includes(ext))throw Error('Поддерживаются XLSX, CSV, TSV и TXT. Для XLS/PDF сначала подготовьте XLSX или отправьте файл на анализ в ChatGPT.');
  const buffer=await file.arrayBuffer();
  let text;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
  catch{text=new TextDecoder('windows-1251').decode(buffer);}
  text=text.replace(/^\uFEFF/,'');
  const delim=ext==='tsv'?'\t':detectDelimiter(text);
  return [{name:'Таблица',rows:parseDelimited(text,delim)}];
};
const make=(tag,text,className)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=String(text);
  return el;
};

export function attachCatalogImporter({widget,getDatabase,getRevision,getSupplierFilter,onSaved}){
  const root=widget.querySelector('[data-role="catalog-import-panel"]');
  if(!root)return {destroy:()=>{}};
  const trigger=widget.querySelector('[data-role="catalog-upload"]');
  const fileInput=root.querySelector('[data-role="catalog-import-file"]');
  const supplierSelect=root.querySelector('[data-role="catalog-import-supplier"]');
  const sheetSelect=root.querySelector('[data-role="catalog-import-sheet"]');
  const headerInput=root.querySelector('[data-role="catalog-import-header"]');
  const fields={
    name:root.querySelector('[data-role="catalog-map-name"]'),
    unit:root.querySelector('[data-role="catalog-map-unit"]'),
    price:root.querySelector('[data-role="catalog-map-price"]')
  };
  const overwrite=root.querySelector('[data-role="catalog-import-update"]');
  const summary=root.querySelector('[data-role="catalog-import-summary"]');
  const preview=root.querySelector('[data-role="catalog-import-preview"]');
  const status=root.querySelector('[data-role="catalog-import-status"]');
  const commitButton=root.querySelector('[data-role="catalog-import-save"]');
  const closeButton=root.querySelector('[data-role="catalog-import-close"]');
  let sheets=[],fileName='',planned=null,analyzedRevision=null,busy=false;
  const listeners=[];
  const on=(node,event,fn)=>{node.addEventListener(event,fn);listeners.push(()=>node.removeEventListener(event,fn))};
  const message=(msg,isError=false)=>{status.textContent=msg;status.dataset.error=String(isError)};
  const resetPlan=()=>{planned=null;commitButton.disabled=true;preview.replaceChildren();summary.textContent=''};
  const fillSuppliers=()=>{
    const current=supplierSelect.value||String(getSupplierFilter()||'');
    supplierSelect.replaceChildren();
    const blank=new Option('Выберите поставщика','');supplierSelect.add(blank);
    for(const s of rows(getDatabase()?.suppliers).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ru'))){
      supplierSelect.add(new Option(s.name,String(s.id)));
    }
    supplierSelect.value=[...supplierSelect.options].some(x=>x.value===current)?current:'';
  };
  const chooseHeader=()=>{
    const raw=sheets[Number(sheetSelect.value)]?.rows||[];
    const first=raw.slice(0,25).findIndex(line=>{
      const values=line.map(normalizeHeader);
      return values.some(v=>/наименован|назван|товар|номенклатур|product|^name$/.test(v))&&
        values.some(v=>/цен|price|стоимост|едизм|единиц|unit/.test(v));
    });
    headerInput.value=String(first>=0?first+1:0);
    fillMappings();
  };
  const fillMappings=()=>{
    resetPlan();
    const raw=sheets[Number(sheetSelect.value)]?.rows||[];
    const headerRow=Number(headerInput.value);
    const header=headerRow>0?raw[headerRow-1]||[]:[];
    const count=Math.min(60,Math.max(...raw.slice(0,25).map(x=>x.length),0));
    const headers=Array.from({length:count},(_,i)=>header[i]||'Колонка '+(i+1));
    for(const [key,el] of Object.entries(fields)){
      el.replaceChildren(new Option('Не выбрано',''));
      headers.forEach((h,i)=>el.add(new Option(String.fromCharCode(65+i%26)+(i>=26?String(Math.floor(i/26)+1):'')+' · '+h,String(i))));
      const guessed=inferColumn(headers,key);
      el.value=guessed>=0?String(guessed):'';
    }
    analyze();
  };
  const analyze=()=>{
    resetPlan();
    const db=getDatabase();
    if(!sheets.length)return;
    if(!db){message('Сначала подключитесь к базе PRO OPTIMA.',true);return;}
    const supplierId=supplierSelect.value;
    if(!supplierId){message('Выберите поставщика для загружаемых позиций.');return;}
    const cols={};
    for(const [name,select] of Object.entries(fields))cols[name]=select.value===''?null:Number(select.value);
    if(cols.name===null){message('Укажите колонку с наименованием.',true);return;}
    if(cols.price===null){message('Укажите колонку с ценой, чтобы импортировать прайс-лист.',true);return;}
    if(cols.name===cols.price||cols.unit!==null&&(cols.unit===cols.name||cols.unit===cols.price)){
      message('Наименование, цена и единица измерения должны быть из разных колонок.',true);return;
    }
    const raw=sheets[Number(sheetSelect.value)]?.rows||[];
    const headerRow=Number(headerInput.value);
    const start=headerRow>0?headerRow:0;
    const entries=raw.slice(start);
    if(entries.length>MAX_ROWS){message('В файле больше '+MAX_ROWS+' строк. Разделите прайс.',true);return;}
    const originals=rows(db.supplierCatalog);
    const existing=new Map();
    for(const item of originals.filter(x=>String(x.supplierId)===supplierId)){
      const key=norm(item.name)+'|'+norm(item.unit);
      existing.set(key,[...(existing.get(key)||[]),item]);
    }
    const seen=new Set(),actions=[];
    let add=0,update=0,unchanged=0,duplicates=0,invalid=0;
    for(let i=0;i<entries.length;i++){
      const row=entries[i];
      const name=clean(row[cols.name]),unit=cols.unit===null?'':clean(row[cols.unit]);
      const p=priceOf(row[cols.price]);
      let state,previous=null;
      if(!name){state='Пропуск';invalid++;}
      else if(!Number.isFinite(p)){state='Некорректная цена';invalid++;}
      else{
        const key=norm(name)+'|'+norm(unit);
        const matches=existing.get(key)||[];
        previous=matches.length===1?matches[0]:null;
        if(seen.has(key)){state='Дубликат в файле';duplicates++;}
        else if(matches.length>1){state='Неоднозначное совпадение';invalid++;}
        else if(!previous){state='Добавить';add++;}
        else if(!overwrite.checked){state='Уже существует';unchanged++;}
        else if(Number(previous.price)===p){state='Без изменений';unchanged++;}
        else {state='Обновить цену';update++;}
        seen.add(key);
      }
      actions.push({line:i+start+1,name,unit,price:p,previous,state});
    }
    const writable=actions.filter(x=>x.state==='Добавить'||x.state==='Обновить цену');
    planned={supplierId,actions,writable,added:add,updated:update,duplicates,invalid,unchanged,fileName};
    analyzedRevision=Number(getRevision());
    summary.textContent='Строк: '+actions.length+' · Добавить: '+add+' · Обновить цены: '+update+
      ' · Уже есть: '+unchanged+' · Дубли: '+duplicates+' · Ошибки/пропуски: '+invalid;
    const table=make('table');const thead=make('thead'),head=make('tr');
    for(const v of ['Строка','Наименование','Ед.','Цена, ₸','Результат'])head.append(make('th',v));
    thead.append(head);table.append(thead);
    const tbody=make('tbody');
    for(const item of actions.slice(0,16)){
      const tr=make('tr');
      for(const value of [item.line,item.name||'—',item.unit||'—',Number.isFinite(item.price)?item.price:'—',item.state]){
        tr.append(make('td',value));
      }
      tbody.append(tr);
    }
    table.append(tbody);preview.append(table);
    commitButton.disabled=!writable.length||!Number.isFinite(analyzedRevision);
    message(writable.length?'Проверьте результат. Данные ещё не сохранены.':'Нет новых строк для сохранения.');
  };
  const selectFile=async()=>{
    resetPlan();
    const file=fileInput.files?.[0];
    if(!file)return;
    fileName=file.name;
    message('Анализ файла «'+fileName+'»…');
    try{
      sheets=await readPriceFile(file);
      if(!root.isConnected)return;
      sheetSelect.replaceChildren();
      sheets.forEach((s,i)=>sheetSelect.add(new Option(s.name,String(i))));
      sheetSelect.value='0';
      sheetSelect.disabled=sheets.length<2;
      chooseHeader();
    }catch(error){
      sheets=[];message(error.message||String(error),true);
    }
  };
  const save=async()=>{
    if(busy||!planned?.writable.length)return;
    const db=getDatabase(),revision=Number(getRevision());
    if(!db||revision!==analyzedRevision){
      message('База обновилась после анализа. Нажмите повторно «Проверить», затем сохраните.',true);
      resetPlan();return;
    }
    const changed=planned.writable;
    if(!window.confirm('Загрузить прайс «'+planned.fileName+'»?\nПоставщик: '+
       (rows(db.suppliers).find(s=>String(s.id)===planned.supplierId)?.name||planned.supplierId)+
       '\nНовых: '+planned.added+' · Обновлений цен: '+planned.updated+
       '\nСуществующие товары, заявки и остальные поставщики не изменятся.'))return;
    const ids=new Set(rows(db.supplierCatalog).map(x=>String(x.id)));
    let counter=0;
    const createId=()=>{
      let id;
      do{id='dxprice-'+Date.now().toString(36)+'-'+(++counter).toString(36)+'-'+Math.random().toString(36).slice(2,7);}
      while(ids.has(id));
      ids.add(id);return id;
    };
    const next=rows(db.supplierCatalog).slice();
    const updated=new Map(changed.filter(x=>x.previous).map(x=>[String(x.previous.id),x]));
    for(let i=0;i<next.length;i++){
      const row=next[i],target=updated.get(String(row.id));
      if(target)next[i]={...row,price:target.price};
    }
    for(const target of changed.filter(x=>!x.previous)){
      next.push({
        id:createId(),supplierId:planned.supplierId,
        name:target.name,unit:target.unit,price:target.price,branch:'*',
        availability:'unknown',source:'DashboardX: '+planned.fileName,usedProductId:null
      });
    }
    busy=true;commitButton.disabled=true;
    message('Сохранение данных в PRO OPTIMA…');
    try{
      await patchOptima({supplierCatalog:next},revision);
      message('Импорт выполнен. Добавлено: '+planned.added+', обновлено цен: '+planned.updated+'.');
      resetPlan();
      sheets=[];fileInput.value='';fileName='';
      await onSaved();
    }catch(error){
      message(error.status===409?'Конфликт версии. Обновите базу и повторите анализ.':
        error.message||'Не удалось сохранить каталог.',true);
    }finally{
      busy=false;
    }
  };
  on(trigger,'click',()=>{
    root.hidden=!root.hidden;
    trigger.setAttribute('aria-expanded',String(!root.hidden));
    if(!root.hidden){fillSuppliers();if(sheets.length)analyze();}
  });
  on(closeButton,'click',()=>{root.hidden=true;trigger.setAttribute('aria-expanded','false')});
  on(fileInput,'change',selectFile);
  on(sheetSelect,'change',chooseHeader);
  on(headerInput,'change',fillMappings);
  on(supplierSelect,'change',analyze);
  on(overwrite,'change',analyze);
  Object.values(fields).forEach(select=>on(select,'change',analyze));
  return {destroy:()=>listeners.forEach(fn=>fn())};
}
