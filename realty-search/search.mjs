// Searches an independent search-engine index, never crawls the listing websites.
const SITES={
  krisha:{host:'krisha.kz',listing:/^\/a\/show\/\d+/},
  olx:{host:'olx.kz',listing:/^\/d\/obyavlenie\/[^/]+/},
  kn:{host:'kn.kz',listing:/^\/card\/\d+/}
};
const STREETS=['Гоголя','Лободы','Ерубаева','Нуркена Абдирова'];
const clean=s=>String(s||'').replace(/<[^>]{0,200}>/g,' ').replace(/&(?:nbsp|amp|quot);/g,' ').replace(/\s+/g,' ').trim();
export function makePlan(rotation=0,limit=16){
  const items=[];
  const add=(category,site,query)=>items.push({category,site,query});
  // Round-robin between street pairs on successive daily scans.
  const pair=rotation%2===0?STREETS.slice(0,2):STREETS.slice(2);
  for(const street of pair)for(const [name,source] of Object.entries(SITES))
    add('monthly',name,'site:'+source.host+' Караганда аренда квартира помесячно '+street);
  for(const [name,source] of Object.entries(SITES))
    add('buyout',name,'site:'+source.host+' Караганда квартира аренда с последующим выкупом');
  for(const [name,source] of Object.entries(SITES))
    add('short',name,'site:'+source.host+' Караганда квартира посуточно почасово');
  for(const [name,source] of Object.entries(SITES))
    add('sale',name,'site:'+source.host+' Караганда продажа квартиры недорого');
  // Rotate land source so low-budget runs still cover all portals over time.
  const entries=Object.entries(SITES);
  for(let j=0;j<entries.length;j++){
    const [name,source]=entries[(j+rotation)%entries.length];
    add('sale',name,'site:'+source.host+' Караганда продажа земельный участок');
  }
  return items.slice(0,Math.max(1,Math.min(20,Number(limit)||16)));
}
export function parsePrice(value){
  const text=clean(value).replace(/\u00a0/g,' ');
  const match=[...text.matchAll(/(\d{1,3}(?:[\s.,]\d{3})+|\d{4,10}|\d{1,3}(?:[,.]\d{1,2})?)\s*(млн\.?|миллион(?:ов|а)?|тыс\.?|тысяч|₸|тг\.?|тенге|kzt)/giu)];
  const matches=match.map(m=>{
    const unit=m[2].toLowerCase();
    let amount=Number(m[1].replace(/\s/g,'').replace(',', '.'));
    if((unit.startsWith('млн')||unit.startsWith('миллион')))amount*=1_000_000;
    else if(unit.startsWith('тыс')||unit.startsWith('тысяч'))amount*=1_000;
    else amount=Number(m[1].replace(/[ \u00a0.,]/g,''));
    return Math.round(amount);
  }).filter(n=>Number.isFinite(n)&&n>=1000&&n<=1_000_000_000);
  return matches[0]||null;
}
export function parseArea(text){
  const m=clean(text).match(/(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:м²|м2|кв\.?\s*м\b|квадратных\s+метров\b)/iu);
  if(!m)return null;
  const n=Number(m[1].replace(',','.'));
  return n>10&&n<200000?n:null;
}
export function parseRooms(text){
  const m=clean(text).match(/(?:^|[^\d])([1-9])\s*[-–]?\s*(?:комн\.?|комнатн\w*|к\.\s*квартир)/iu);
  return m?Number(m[1]):null;
}
function deriveAddress(text){
  const match=clean(text).match(/(?:ул(?:ица|\.)?\s*)?(Нуркена\s+Абдирова|Н\.?\s*Абдирова|Гоголя|Лободы|Ерубаева|Алиханова|Бухар[-\s]Жырау|Сатыбалдина|Крылова|Осев\w*)\s*(?:[,№д. ]{0,4}\s*\d+[а-я\/\d-]*)?/iu);
  return match?'Караганда, '+match[0].trim():'Караганда';
}
export function parseSearchHit(hit,task){
  if(!hit||typeof hit!=='object')return null;
  let u;try{u=new URL(hit.url);}catch{return null;}
  if(u.protocol!=='https:'&&u.protocol!=='http:')return null;
  const site=SITES[task.site];
  if(!site||(u.hostname!==site.host&&!u.hostname.endsWith('.'+site.host))||!site.listing.test(u.pathname))return null;
  const title=clean(hit.title).slice(0,180),snippet=clean(hit.description).slice(0,380);
  const searchable=(title+' '+snippet).toLowerCase();
  if(!/квартир|комнат|аренд|сда[её]т|недвижим|земел|участок|прода[её]т|жилой\s+дом/.test(searchable))return null;
  if(task.category==='buyout'&&!/(?:выкуп|рассрочк|аренд.{0,40}куп)/iu.test(searchable))return null;
  if(task.category==='short'&&!/(?:сутки|посуточ|почас|часов|ночь|дней)/iu.test(searchable))return null;
  const kind=/(?:^|[^\p{L}])(участок|земля|земельн)/iu.test(searchable)?'land':
    /(?:^|[^\p{L}])(?:дом|коттедж)(?:$|[^\p{L}])/iu.test(searchable)?'house':'apartment';
  const price=parsePrice(title)||parsePrice(snippet);
  const rooms=kind==='apartment'?parseRooms(title+' '+snippet):null;
  const area=parseArea(title+' '+snippet);
  const period=task.category==='short'?(/почасов|\/\s*час|за час/.test(searchable)?'hour':'day'):
    task.category==='sale'?'total':'month';
  // Do not claim a source page was re-checked: it is a search-engine hit.
  return {id:u.href.replace(/[?#].*$/,''),source:task.site.toUpperCase(),url:u.href,
    title:title||'Объявление',description:snippet,category:task.category,
    kind,rooms,area,address:deriveAddress(title+' '+snippet),price:price||null,
    priceUnit:period,firstSeen:null,lastSeen:null,sourceConfidence:'search_index',
    priceConfirmed:false,availabilityConfirmed:false,postedAt:null};
}
export function extractSearchItems(response,task){
  if(response?.status_code!==20000)throw Error('DataForSEO API: '+String(response?.status_message||response?.status_code||'нет ответа'));
  const root=response.tasks?.[0];
  if(!root||root.status_code!==20000)throw Error('DataForSEO task: '+String(root?.status_message||'ошибка'));
  const data=root.result?.[0]?.items||[];
  return data.filter(i=>i?.type==='organic').map(i=>parseSearchHit(i,task)).filter(Boolean);
}
export async function runSearch(task,{login,password,fetchImpl=fetch,timeoutMs=20000}={}){
  if(!login||!password)throw Error('DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD не заданы');
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{
    const response=await fetchImpl('https://api.dataforseo.com/v3/serp/google/organic/live/advanced',{
      method:'POST',signal:abort.signal,headers:{Authorization:'Basic '+Buffer.from(login+':'+password).toString('base64'),'Content-Type':'application/json'},
      body:JSON.stringify([{keyword:task.query,location_code:2398,language_code:'ru',depth:10,device:'desktop'}])
    });
    if(!response.ok)throw Error('Search provider HTTP '+response.status);
    return extractSearchItems(await response.json(),task);
  }finally{clearTimeout(timer);}
}
