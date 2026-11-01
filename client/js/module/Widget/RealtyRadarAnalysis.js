// Independent property monitoring algorithm. No scraping or source credentials here.
export const RADAR_TABS = Object.freeze(['monthly','buyout','short','sale']);
const fold = value => String(value ?? '').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const money = value => { const n = typeof value==='number'?value:Number(String(value??'').replace(/[^0-9.,]/g,'').replace(',','.')); return Number.isFinite(n)&&n>0?n:0; };
const date = value => {const stamp=Date.parse(value||'');return Number.isFinite(stamp)?new Date(stamp).toISOString():null;};
const shortUnits = ['hour','day'];
const units = ['month',...shortUnits,'total'];

function safeUrl(raw){
  try {const u=new URL(String(raw));return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
function inferredTab(source){
  const value=fold(source.category||source.tab||'');
  if(['buyout','rent_to_own','rent-to-own'].includes(value)||source.rentToOwn===true)return 'buyout';
  if(['short','daily','hourly','short_term'].includes(value))return 'short';
  if(['sale','buy','purchase','sell'].includes(value))return 'sale';
  return 'monthly';
}
function cleanPriceUnit(src,tab){
  const v=fold(src.priceUnit||src.period||src.unit||'');
  if(['hour','hourly','час','часов','почасово'].includes(v))return 'hour';
  if(['day','daily','сутки','посуточно','ночь'].includes(v))return 'day';
  if(['total','sale','продажа','целиком'].includes(v))return 'total';
  return tab==='sale'?'total':tab==='short'?'day':'month';
}
export function normalizeListing(src){
  if(!src||typeof src!=='object'||Array.isArray(src))return null;
  const url=safeUrl(src.url||src.link);
  const title=String(src.title||src.name||'').trim().slice(0,160);
  const price=money(src.price);
  if(!url||!title||!price||price>1_000_000_000_000)return null;
  const tab=inferredTab(src);
  const address=String(src.address||src.location||'').trim().slice(0,180);
  const description=String(src.description||'').trim().slice(0,480);
  const kind=['apartment','land','house','commercial'].includes(src.kind)?src.kind:'apartment';
  const rawRooms=Number(src.rooms),rawArea=Number(src.area);
  const rooms=Number.isInteger(rawRooms)&&rawRooms>=1&&rawRooms<=20?rawRooms:null;
  const area=Number.isFinite(rawArea)&&rawArea>0&&rawArea<1_000_000?rawArea:null;
  const priceUnit=cleanPriceUnit(src,tab);
  if((tab==='sale'&&priceUnit!=='total')||(tab!=='sale'&&priceUnit==='total'))return null;
  const original=src.id?String(src.id).slice(0,120):url.split('#')[0];
  const sellerType=['owner','agency','unknown'].includes(src.sellerType)?src.sellerType:'unknown';
  return {id:original,source:String(src.source||new URL(url).hostname).slice(0,50),
    url,title,address,description,tab,kind,rooms,area,price,priceUnit,
    sellerType,postedAt:date(src.postedAt),firstSeen:date(src.firstSeen)||new Date().toISOString(),
    lastSeen:date(src.lastSeen)||new Date().toISOString(),
    rentToOwn:tab==='buyout'||src.rentToOwn===true,downPayment:money(src.downPayment)||null,
    purchasePrice:money(src.purchasePrice)||null,contractPayment:money(src.contractPayment)||null};
}
function dedupKey(item){
  // Cross-source duplicates require a precise address and area; otherwise preserve both.
  const addr=fold(item.address).replace(/[.,]/g,'');
  return addr.length>=9&&item.area&&item.rooms?
   [item.tab,item.kind,addr,item.rooms,Math.round(item.area)].join('|'):'url:'+item.url.replace(/\/+$/,'');
}
export function normalizeListings(input){
  const rows=Array.isArray(input)?input:Array.isArray(input?.items)?input.items:[];
  const known=new Map();
  for(const src of rows.slice(0,4000)){
    const value=normalizeListing(src);if(!value)continue;
    const key=dedupKey(value);
    const old=known.get(key);
    if(!old||new Date(value.lastSeen)>new Date(old.lastSeen))known.set(key,value);
  }
  return [...known.values()].slice(0,400);
}
export function median(values){
  const a=values.filter(x=>Number.isFinite(x)&&x>0).sort((x,y)=>x-y);
  if(!a.length)return null;
  const middle=Math.floor(a.length/2);
  return a.length%2?a[middle]:(a[middle-1]+a[middle])/2;
}
const unitPrice=x=>x.area&&x.priceUnit==='total'?x.price/x.area:x.price;
function comparables(row,all){
  const street=fold(row.address).split(',')[0].trim();
  const local=all.filter(x=>x.id!==row.id&&x.tab===row.tab&&x.priceUnit===row.priceUnit&&x.kind===row.kind &&
    (row.kind!=='apartment'||(x.rooms===row.rooms&&((!x.area||!row.area)||Math.abs(x.area-row.area)/row.area<=0.35))));
  // Strict neighborhood benchmark only if sufficient comparable rows on same street.
  const same=street.length>5?local.filter(x=>fold(x.address).includes(street)||street.includes(fold(x.address).split(',')[0])):[];
  return same.length>=3?same:local;
}
export function analyzeListing(row,all){
  const peers=comparables(row,all);
  const unit=unitPrice(row),base=peers.length>=3?median(peers.map(unitPrice)):null;
  const discount=base&&unit?Math.round((1-unit/base)*1000)/10:null;
  const last=Date.parse(row.postedAt||row.firstSeen||'');
  const age=Number.isFinite(last)?Math.max(0,Math.floor((Date.now()-last)/86400000)):null;
  const reasons=[];
  if(discount!==null&&discount>=12)reasons.push('Ниже медианы похожих объявлений на '+discount+'%');
  else if(discount!==null&&discount<=-15)reasons.push('Выше медианы похожих объявлений на '+Math.abs(discount)+'%');
  if(row.tab==='buyout'&&!row.purchasePrice)reasons.push('Полная цена выкупа не указана');
  if(row.tab==='buyout'&&!row.contractPayment)reasons.push('Платёж по договору выкупа не подтверждён');
  if(row.kind==='land'&&!row.area)reasons.push('Площадь участка не указана');
  const score=(discount===null?0:Math.max(-30,Math.min(40,discount)))+
    (age!==null&&age<=3?7:0)+(row.sellerType==='owner'?3:0)-
    (row.tab==='buyout'&&!row.contractPayment?5:0);
  return {...row,unitCost:unit,median:base,discount,comparableCount:peers.length,
    ageDays:age,score,reasons};
}
export function filterListings(rows,filters={}){
  const tab=RADAR_TABS.includes(filters.tab)?filters.tab:'monthly';
  const max=Number(filters.maxPrice)||Infinity;
  const rooms=Array.isArray(filters.rooms)?filters.rooms.map(Number).filter(Number.isInteger):[];
  const streets=Array.isArray(filters.streets)?filters.streets.map(fold).filter(Boolean):[];
  const kind=filters.kind||'';
  const query=fold(filters.query||'');
  return rows.filter(row=>row.tab===tab&&row.price<=max&&
    (!kind||row.kind===kind)&&(!rooms.length||row.kind!=='apartment'||rooms.includes(row.rooms))&&
    (!streets.length||streets.some(x=>fold(row.address+' '+row.title).includes(x)))&&
    (!query||fold([row.title,row.address,row.description,row.source].join(' ')).includes(query)));
}
export function analyzeListings(rows,filters={}){
  const filtered=filterListings(rows,filters);
  return filtered.map(x=>analyzeListing(x,rows)).sort((a,b)=>{
    if(filters.sort==='price')return a.price-b.price;
    if(filters.sort==='recent')return Date.parse(b.firstSeen||0)-Date.parse(a.firstSeen||0);
    if(filters.sort==='discount')return (b.discount??-1000)-(a.discount??-1000);
    return b.score-a.score||a.price-b.price;
  });
}
