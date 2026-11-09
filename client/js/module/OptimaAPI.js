import { getCredential } from './CredentialStore.js';

// Write password lives only in JS memory for this tab; never persist it.
let ownerWritePassword='';
export const setOptimaWritePassword=value=>{ownerWritePassword=String(value||'');};
export const hasOptimaWritePassword=()=>Boolean(ownerWritePassword);
export const getOptimaWritePassword=()=>ownerWritePassword;
export const OPTIMA_BASE='https://pro-optima-production.up.railway.app';
export const OPTIMA_POLL_MS=90000;
export const PRODUCTION_BRANCHES=['Горняк','Лободы','Нуркена','Сарань','Пришахтинск','Ермекова','Анжерская'];
export const textValue=value=>String(value??'');
export const norm=value=>textValue(value).trim().toLocaleLowerCase();
export const branchKey=value=>{
  const key=norm(value).replace(/\s+/g,' ');
  if(key==='нуркен'||key==='нуркена')return 'нуркена';
  if(key==='анжерского')return 'анжерская';
  return key;
};
export const sameBranch=(a,b)=>branchKey(a)===branchKey(b);
export const canonicalBranch=value=>{
  const key=branchKey(value);
  const names={горняк:'Горняк',лободы:'Лободы',нуркена:'Нуркена',сарань:'Сарань',пришахтинск:'Пришахтинск',ермекова:'Ермекова',анжерская:'Анжерская'};
  return names[key]||textValue(value).trim().replace(/\s+/g,' ');
};
export const rows=value=>Array.isArray(value)?value:[];
export const money=value=>{
  const n=Number(value);
  return value!==null && value!=='' && Number.isFinite(n) && n>0
    ?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n)+' ₸':'—';
};
export const branchNames=db=>{
  // The server-managed registry is authoritative after the first branch edit.
  if(Array.isArray(db?.branches))return [...new Map(db.branches.filter(Boolean).map(v=>[branchKey(v),textValue(v).trim()])).values()];
  const dynamic=rows(db?.suppliers).flatMap(s=>rows(s.schedules).map(r=>textValue(r.branch).trim()))
    .concat(rows(db?.history).map(r=>textValue(r.branch).trim()))
    .concat(rows(db?.stocks).map(r=>textValue(r.branch).trim()));
  return [...new Map([...PRODUCTION_BRANCHES,...dynamic.filter(Boolean)]
    .map(v=>[branchKey(v),canonicalBranch(v)])).values()];
};
export async function optimaRequest(path,options={}){
  const token=getCredential('optima');
  if(!token)throw Object.assign(new Error('Missing Admin Token'),{status:401,noToken:true});
  // Administrative Optima reads and mutations require both factors.
  const writePassword=ownerWritePassword;
  if(!writePassword)throw new Error('Введите пароль администратора в «Настройки Оптима» для чтения и изменений.');
  const headers={
    'Authorization':'Bearer '+token,
    'X-Optima-Write-Password':writePassword,
    ...(options.body!==undefined?{'Content-Type':'application/json'}:{}),
    ...(options.headers||{})
  };
  const response=await fetch(OPTIMA_BASE+path,{...options,headers,cache:'no-store'});
  let body=null;try{body=await response.json();}catch{}
  if(!response.ok){
    const error=new Error(body?.error||'HTTP '+response.status);
    error.status=response.status;
    throw error;
  }
  return body;
}
export async function loadOptima(signal){
  const data=await optimaRequest('/api/dashboardx/optima/v1/state',{method:'GET',signal});
  if(!data||!data.data||!Array.isArray(data.data.suppliers)||!Array.isArray(data.data.products)){
    throw new Error('Invalid dashboardx.optima response');
  }
  return data;
}
// Revision guarded: never silently overwrite newer Railway changes.
export async function patchOptima(changes,baseRevision,signal){
  if(!Number.isFinite(Number(baseRevision)))throw new Error('Missing base revision');
  const result=await optimaRequest('/api/dashboardx/optima/v1/state',{
    method:'PATCH',signal,
    body:JSON.stringify({baseRevision:Number(baseRevision),changes})
  });
  window.dispatchEvent(new CustomEvent('dashboardx:optima-updated',{
    detail:{revision:result.revision}
  }));
  return result;
}

export function dateISO(){
  const bits=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const lookup=key=>bits.find(x=>x.type===key)?.value||'';
  return lookup('year')+'-'+lookup('month')+'-'+lookup('day');
}
export function stockAt(stockHistory,productId,branch,date){
  const target=branchKey(branch);
  return rows(stockHistory).filter(s=>
    Number(s.productId)===Number(productId)&&branchKey(s.branch)===target&&
    textValue(s.date)<=date
  ).sort((a,b)=>textValue(b.date).localeCompare(textValue(a.date))||
    textValue(b.createdAt).localeCompare(textValue(a.createdAt)))[0]||null;
}
export function stockCell(db,product,branch,date){
  if(rows(product.excludedBranches).some(x=>sameBranch(x,branch)))return {text:'—',kind:'na'};
  const stock=stockAt(db.stocks,product.id,branch,date);
  if(!stock)return {text:'?',kind:'unknown'};
  if(stock.value==='-')return {text:'—',kind:'na'};
  const value=Number(stock.value);
  if(!Number.isFinite(value))return {text:'?',kind:'unknown'};
  return {text:String(value).replace('.',',')+(value&&stock.unit?' '+stock.unit:''),kind:value===0?'zero':'known',date:stock.date};
}
export function orderStatus(rec,date=dateISO()){
  const stage=textValue(rec?.stage||'received');
  if(stage==='confirmed'){
    if(rec.deliveryDate===date)return 'today';
    if(rec.deliveryDate && rec.deliveryDate<date)return 'overdue';
    return 'expected';
  }
  return stage;
}
export function offerForBranch(o,branch){
  return !branch || branch==='*' || sameBranch(o.branch,branch) || o.branch==='*';
}
export function effectiveOffers(offers,branch){
  if(!branch||branch==='*')return rows(offers);
  const map=new Map();
  for(const offer of rows(offers)){
    if(!offerForBranch(offer,branch))continue;
    const key=textValue(offer.supplierId)+'|'+textValue(offer.productId);
    const previous=map.get(key);
    if(!previous || (sameBranch(offer.branch,branch)&&!sameBranch(previous.branch,branch)))map.set(key,offer);
  }
  return [...map.values()];
}
