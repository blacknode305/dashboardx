// Mirrors PRO-OPTIMA server's buildPlanForDate rules for presentation.
// The server remains authoritative and validates every submitted order.
import { norm, rows, dateISO } from './OptimaAPI.js';
const DAY=['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const canon=s=>{
 const n=norm(s);return n==='нуркен'||n==='нуркена'?'нуркена':n;
};
const same=(a,b)=>canon(a)===canon(b);
const num=(value)=>Number.isFinite(Number(value))&&Number(value)>0;
export const dayIndex=iso=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso)))return -1;
 const [y,m,d]=iso.split('-').map(Number);
 const date=new Date(Date.UTC(y,m-1,d,12));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date.getUTCDay():-1;
};
export const parseScheduleDays=value=>String(value||'').split(/[,;/]+/).map(x=>x.trim())
 .map(x=>DAY.findIndex(day=>norm(day)===norm(x))).filter(x=>x>=0);
const addDays=(iso,delta)=>{
 const [y,m,d]=iso.split('-').map(Number);
 const date=new Date(Date.UTC(y,m-1,d+delta,12));
 return date.toISOString().slice(0,10);
};
export function nextDayDate(date,weekday){
 const current=dayIndex(date);
 return current<0?date:addDays(date,(Number(weekday)-current+7)%7);
}
function due(schedule,date){
 const current=dayIndex(date),choices=parseScheduleDays(schedule?.delivery);
 if(!choices.length||current<0)return date;
 return addDays(date,Math.min(...choices.map(day=>(day-current+7)%7)));
}
const manual=(offer,branch)=>{
 const map=offer.manualActiveByBranch;
 if(map&&typeof map==='object'){
  const key=Object.keys(map).find(x=>same(x,branch));
  if(key!==undefined)return map[key]===true?true:map[key]===false?false:null;
 }
 return offer.manualActive===true?true:offer.manualActive===false?false:null;
};
const priced=o=>num(o?.price);
function offerFor(db,supplierId,productId,branch,unit){
 const matches=rows(db.offers).filter(o=>String(o.supplierId)===String(supplierId)&&
   Number(o.productId)===Number(productId)&&(o.branch==='*'||!o.branch||same(o.branch,branch)));
 const exact=matches.filter(o=>o.branch&&o.branch!=='*'&&same(o.branch,branch));
 const effective=exact.length?exact:matches.filter(o=>!o.branch||o.branch==='*');
 const unitMatches=effective.filter(o=>!unit||norm(o.unit)===norm(unit));
 return (unitMatches.length?unitMatches:effective).filter(o=>manual(o,branch)!==false)
   .sort((a,b)=>(priced(a)?0:1)-(priced(b)?0:1)||Number(a.price||Infinity)-Number(b.price||Infinity))[0]||null;
}
function choose(db,product,branch,scheduled){
 const byId=new Map(scheduled.map(x=>[String(x.s.id),x.s]));
 const byName=new Map(scheduled.map(x=>[norm(x.s.name),x.s]));
 let candidates=rows(product.orderSuppliers).map((link,index)=>{
  const supplier=byId.get(String(link.supplierId||''))||byName.get(norm(link.supplier));
  if(!supplier)return null;
  const unit=String(link.unit||product.unit||'');
  const offer=offerFor(db,supplier.id,product.id,branch,unit);
  if(!offer)return null;
  return {supplier,offer,unit,priority:Number.isFinite(Number(link.priority))?Number(link.priority):index};
 }).filter(Boolean);
 if(!candidates.length)return null;
 const forced=candidates.filter(x=>manual(x.offer,branch)===true);
 if(forced.length)candidates=forced;
 const withPrice=candidates.filter(x=>priced(x.offer));
 if(withPrice.length===1)return withPrice[0];
 if(withPrice.length>1){
  const groups=new Map();
  for(const item of withPrice){
   const key=norm(item.offer.unit);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(item);
  }
  const comparable=[...groups.values()].filter(x=>x.length>=2);
  if(comparable.length){
   comparable.sort((a,b)=>Math.min(...a.map(x=>x.priority))-Math.min(...b.map(x=>x.priority)));
   return comparable[0].sort((a,b)=>Number(a.offer.price)-Number(b.offer.price)||a.priority-b.priority)[0];
  }
 }
 return candidates.sort((a,b)=>a.priority-b.priority||
   String(a.supplier.name).localeCompare(String(b.supplier.name),'ru'))[0];
}
function supplierItems(db,s,branch){
 return rows(db.products).filter(p=>p.catalogStatus!=='proposal'&&
   !rows(p.excludedBranches).some(x=>same(x,branch)))
   .map(p=>{
    const link=rows(p.orderSuppliers).find(x=>String(x.supplierId)===String(s.id)||same(x.supplier,s.name));
    if(!link)return null;
    const unit=String(link.unit||p.unit||''),offer=offerFor(db,s.id,p.id,branch,unit);
    if(!offer)return null;
    return {productId:p.id,name:p.name,unit,price:priced(offer)?Number(offer.price):null};
   }).filter(Boolean).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ru'));
}
export function planForDate(db,branch,date){
 const weekday=dayIndex(date);
 if(!branch||weekday<0)return [];
 const scheduled=rows(db.suppliers).map(s=>({
  s,schedule:rows(s.schedules).find(row=>same(row.branch,branch))
 })).filter(x=>x.schedule&&parseScheduleDays(x.schedule.order).includes(weekday)&&x.s.active!==false);
 const assignments=new Map(scheduled.map(x=>[String(x.s.id),[]]));
 for(const p of rows(db.products).filter(p=>p.catalogStatus!=='proposal'&&
   !rows(p.excludedBranches).some(x=>same(x,branch)))){
  const chosen=choose(db,p,branch,scheduled);
  if(chosen){
   assignments.get(String(chosen.supplier.id)).push({
    productId:p.id,name:p.name,unit:chosen.unit,
    price:priced(chosen.offer)?Number(chosen.offer.price):null
   });
  }
 }
 const result=scheduled.map(({s,schedule})=>({
  supplierId:s.id,supplier:s.name,branch,requestDate:date,deliveryDate:due(schedule,date),
  note:schedule.note||'',items:assignments.get(String(s.id)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ru'))
 })).filter(x=>x.items.length);
 for(const req of rows(db.dateRequests).filter(r=>same(r.branch,branch)&&
   r.status==='approved'&&r.requestedDate===date)){
  if(result.some(x=>String(x.supplierId)===String(req.supplierId)))continue;
  const s=rows(db.suppliers).find(x=>String(x.id)===String(req.supplierId));
  if(!s)continue;
  const items=supplierItems(db,s,branch);if(!items.length)continue;
  const schedule=rows(s.schedules).find(x=>same(x.branch,branch));
  result.push({supplierId:s.id,supplier:s.name,branch,requestDate:date,
   deliveryDate:req.requestedDeliveryDate||due(schedule,date),note:req.reason||'',items});
 }
 return result.sort((a,b)=>String(a.supplier).localeCompare(String(b.supplier),'ru'));
}
const orderKey=(branch,supplierId,requestDate)=>canon(branch)+'|'+String(supplierId)+'|'+requestDate;
export function orderCards(db,branch,date){
 const branches=branch?[branch]:[...new Set(rows(db.suppliers).flatMap(s=>rows(s.schedules)
   .map(x=>x.branch).filter(Boolean)))];
 const plans=branches.flatMap(b=>planForDate(db,b,date));
 const all=rows(db.history).filter(o=>o.requestDate===date&&
   (!branch||same(o.branch,branch)));
 const map=new Map();
 for(const plan of plans){
  const existing=all.filter(o=>same(o.branch,plan.branch)&&(
    o.supplierId?String(o.supplierId)===String(plan.supplierId):norm(o.supplier)===norm(plan.supplier)
  )).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0]||null;
  map.set(orderKey(plan.branch,plan.supplierId,date),{plan,order:existing,branch:plan.branch,supplier:plan.supplier});
 }
 for(const order of all){
  const key=orderKey(order.branch,order.supplierId||'legacy:'+norm(order.supplier),date);
  if([...map.values()].some(x=>x.order&&String(x.order.id)===String(order.id)))continue;
  map.set(key,{plan:null,order,branch:order.branch,supplier:order.supplier||'—'});
 }
 return [...map.values()].sort((a,b)=>String(a.branch).localeCompare(String(b.branch),'ru')||
  String(a.supplier).localeCompare(String(b.supplier),'ru'));
}
export const orderDisplayStatus=order=>{
 if(!order)return 'new';
 const stage=String(order.stage||'received');
 return stage==='expected'?'confirmed':stage;
};
export const orderAction=(order,plan)=>{
 if(!plan)return 'view';
 const status=orderDisplayStatus(order);
 if(status==='new'||status==='received'||status==='draft')return 'fill';
 if(status==='sent')return 'correct';
 return 'view';
};
export const todayAlmaty=dateISO;
