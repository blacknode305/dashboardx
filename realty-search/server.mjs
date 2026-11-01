import http from 'node:http';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makePlan,runSearch} from './search.mjs';

const PORT=Number(process.env.PORT)||8080;
const DATA_DIR=process.env.DATA_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'runtime');
const STORAGE=path.join(DATA_DIR,'search-state.json');
const SEARCH_INTERVAL_HOURS=Math.max(6,Math.min(72,Number(process.env.SEARCH_INTERVAL_HOURS)||12));
const SEARCH_MAX_QUERIES=Math.max(1,Math.min(20,Number(process.env.SEARCH_MAX_QUERIES)||16));
const DAILY_QUERY_LIMIT=Math.max(1,Math.min(100,Number(process.env.DAILY_QUERY_LIMIT)||32));
const MAX_ITEMS=1200;
const hasSearchCredentials=()=>Boolean(process.env.DATAFORSEO_LOGIN&&process.env.DATAFORSEO_PASSWORD);
const state={items:[],generatedAt:null,lastAttemptAt:null,rotation:0,usage:{},errors:[],status:'configuration_required'};
let busy=false;
let writing=Promise.resolve();
const origins=new Set(['https://blacknode305.github.io','http://127.0.0.1:8787','http://localhost:8787',...(process.env.CORS_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)]);
function cors(origin){
  return origin&&origins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
}
function json(req,res,code,body){
  const data=JSON.stringify(body);
  res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...cors(req.headers.origin)});
  res.end(data);
}
function configuredStatus(){
  if(!hasSearchCredentials())return 'configuration_required';
  return busy?'updating':state.status==='configuration_required'?'ready':state.status;
}
async function save(){
  const record={...state,items:state.items.slice(0,MAX_ITEMS)};
  writing=writing.catch(()=>{}).then(async()=>{
    await mkdir(DATA_DIR,{recursive:true});
    const temp=STORAGE+'.tmp';
    await writeFile(temp,JSON.stringify(record),'utf8');
    await rename(temp,STORAGE);
  });
  await writing;
}
async function load(){
  try{
    const value=JSON.parse(await readFile(STORAGE,'utf8'));
    if(Array.isArray(value.items))state.items=value.items.slice(0,MAX_ITEMS);
    if(Number.isInteger(value.rotation))state.rotation=value.rotation;
    for(const k of ['generatedAt','lastAttemptAt','status'])if(typeof value[k]==='string')state[k]=value[k];
    if(value.usage&&typeof value.usage==='object')state.usage=value.usage;
    if(Array.isArray(value.errors))state.errors=value.errors.slice(-8);
  }catch(error){if(error.code!=='ENOENT')console.warn('Realty state could not be restored:',error.message);}
}
function todayUTC(){return new Date().toISOString().slice(0,10);}
function usageRemain(){
  const today=todayUTC();
  return Math.max(0,DAILY_QUERY_LIMIT-(Number(state.usage[today])||0));
}
function mergeItems(incoming,now){
  const prev=new Map(state.items.map(x=>[x.url,x]));
  for(const item of incoming){
    const old=prev.get(item.url);
    const history=Array.isArray(old?.priceHistory)?old.priceHistory.slice(-10):[];
    if(old?.price&&item.price&&old.price!==item.price)history.push({at:now,from:old.price,to:item.price});
    prev.set(item.url,{
      ...old,...item,price:item.price||old?.price||null,
      firstSeen:old?.firstSeen||now,lastSeen:now,
      previousPrice:old?.price&&item.price&&old.price!==item.price?old.price:old?.previousPrice||null,
      priceHistory:history,missing:false
    });
  }
  state.items=[...prev.values()].sort((a,b)=>Date.parse(b.lastSeen||0)-Date.parse(a.lastSeen||0)).slice(0,MAX_ITEMS);
}
async function refresh(){
  if(busy)return {status:'already_running'};
  if(!hasSearchCredentials()){state.status='configuration_required';return {status:state.status};}
  if(!usageRemain()){state.status='quota_reached';return {status:state.status};}
  busy=true;
  state.status='updating';
  state.lastAttemptAt=new Date().toISOString();
  const tasks=makePlan(state.rotation,Math.min(SEARCH_MAX_QUERIES,usageRemain()));
  const found=[];
  const errors=[];
  let completed=0;
  try{
    // Sequential calls keep query volume/CPU predictable and avoid overload.
    for(const task of tasks){
      const day=todayUTC();
      if(Number(state.usage[day]||0)>=DAILY_QUERY_LIMIT)break;
      state.usage[day]=(Number(state.usage[day])||0)+1;
      try{
        const rows=await runSearch(task,{login:process.env.DATAFORSEO_LOGIN,password:process.env.DATAFORSEO_PASSWORD});
        found.push(...rows);
        completed++;
      }catch(e){errors.push(task.site+' / '+task.category+': '+String(e?.message||e).slice(0,130));}
    }
    if(completed){
      const now=new Date().toISOString();
      mergeItems(found,now);
      state.generatedAt=now;
      state.rotation++;
      state.status=errors.length?'partial':'ok';
    }else state.status='search_error';
    state.errors=errors.slice(-8);
    for(const key of Object.keys(state.usage))if(key<new Date(Date.now()-7*86400000).toISOString().slice(0,10))delete state.usage[key];
    await save();
    return {status:state.status,queries:tasks.length,successful:completed,found:found.length,items:state.items.length,errors:state.errors};
  }catch(e){
    state.status='internal_error';
    state.errors=[String(e?.message||e).slice(0,200)];
    return {status:state.status,error:state.errors[0]};
  }finally{busy=false;}
}
function refreshIfDue(){
  if(!hasSearchCredentials()||busy||!usageRemain())return;
  const last=Date.parse(state.lastAttemptAt||'');
  if(!Number.isFinite(last)||Date.now()-last>=SEARCH_INTERVAL_HOURS*3600000)void refresh();
}
await load();
if(!hasSearchCredentials())state.status='configuration_required';
const server=http.createServer(async(req,res)=>{
  let url;
  try{url=new URL(req.url,'http://localhost');}catch{return json(req,res,400,{error:'bad URL'});}
  if(req.method==='OPTIONS'){
    res.writeHead(204,{...cors(req.headers.origin),'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type'});
    return res.end();
  }
  if(req.method==='GET'&&url.pathname==='/health')
    return json(req,res,200,{ok:true,service:'dashboardx-realty-search',status:configuredStatus()});
  if(req.method==='GET'&&url.pathname==='/api/realty/status')
    return json(req,res,200,{status:configuredStatus(),lastAttemptAt:state.lastAttemptAt,generatedAt:state.generatedAt,
      indexedCount:state.items.length,errors:state.errors,queriesRemainingToday:usageRemain(),
      intervalHours:SEARCH_INTERVAL_HOURS,storage:process.env.DATA_DIR?'persistent-if-volume-attached':'ephemeral'});
  if(req.method==='GET'&&url.pathname==='/api/realty/feed.json'){
    refreshIfDue();
    return json(req,res,200,{generatedAt:state.generatedAt,status:configuredStatus(),lastAttemptAt:state.lastAttemptAt,
      items:state.items.map(x=>({...x,sourceConfidence:'search_index',availabilityConfirmed:false})),errors:state.errors});
  }
  if(req.method==='POST'&&url.pathname==='/api/realty/refresh'){
    const token=process.env.REFRESH_TOKEN;
    if(!token||req.headers.authorization!=='Bearer '+token)return json(req,res,401,{error:'not authorized'});
    if(busy)return json(req,res,409,{status:'already_running'});
    if(!usageRemain())return json(req,res,429,{status:'quota_reached'});
    void refresh();
    return json(req,res,202,{status:'updating'});
  }
  return json(req,res,404,{error:'not found'});
});
server.listen(PORT,'0.0.0.0',()=>{
  console.log('Realty Search running on :'+PORT+' | '+(hasSearchCredentials()?'search enabled':'provider credentials missing'));
  refreshIfDue();
});
const tick=setInterval(refreshIfDue,10*60*1000);
tick.unref?.();
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
