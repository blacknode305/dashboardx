import {createServer} from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {dirname} from 'node:path';
const PORT=Number(process.env.PORT||3000);
const FILE=process.env.RADIO_DATA_FILE||'/data/radio-stations.json';
const TOKEN=process.env.RADIO_API_TOKEN;
if(!TOKEN||TOKEN.length<20)throw new Error('Set RADIO_API_TOKEN to a secret of 20+ characters');
const origins=(process.env.RADIO_ALLOWED_ORIGINS||'https://blacknode305.github.io').split(',').map(s=>s.trim());
const load=async()=>{try{const data=JSON.parse(await readFile(FILE,'utf8'));return Array.isArray(data)?data:[]}catch(e){if(e.code==='ENOENT')return [];throw e}};
const save=async stations=>{await mkdir(dirname(FILE),{recursive:true});const temp=FILE+'.'+randomUUID();await writeFile(temp,JSON.stringify(stations,null,2),{mode:0o600});await rename(temp,FILE)};
let queue=Promise.resolve();const mutate=fn=>{const next=queue.then(fn);queue=next.catch(()=>{});return next};
const reply=(res,code,payload)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload))};
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin&&origins.includes(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS')}
 if(req.method==='OPTIONS'){res.writeHead(origin&&origins.includes(origin)?204:403);res.end();return}
 if(origin&&!origins.includes(origin))return reply(res,403,{error:'Origin not allowed'});
 if(req.url==='/health'&&req.method==='GET')return reply(res,200,{ok:true});
 if(!equal((req.headers.authorization||'').replace(/^Bearer /i,''),TOKEN))return reply(res,401,{error:'Unauthorized'});
 try{
  if(req.url==='/api/radio/stations'&&req.method==='GET')return reply(res,200,{stations:await load()});
  if(req.url==='/api/radio/stations'&&req.method==='POST'){
   let data='';for await(const chunk of req){data+=chunk;if(data.length>8192)return reply(res,413,{error:'Payload too large'})}
   let body;try{body=JSON.parse(data)}catch{return reply(res,400,{error:'Invalid JSON'})}
   const name=String(body.name||'').trim(),url=String(body.url||'').trim();
   let parsed;try{parsed=new URL(url)}catch{return reply(res,400,{error:'Invalid URL'})}
   if(!name||name.length>120||!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||url.length>2048)return reply(res,400,{error:'Invalid station'});
   return mutate(async()=>{const stations=await load();if(stations.length>=300)return reply(res,409,{error:'Station limit reached'});const station={id:randomUUID(),name,url};stations.push(station);await save(stations);reply(res,201,{station})});
  }
  const match=req.url?.match(/^\/api\/radio\/stations\/([a-f0-9-]{36})$/);
  if(match&&req.method==='DELETE')return mutate(async()=>{const stations=await load(),updated=stations.filter(s=>s.id!==match[1]);if(updated.length===stations.length)return reply(res,404,{error:'Not found'});await save(updated);reply(res,200,{ok:true})});
  reply(res,404,{error:'Not found'});
 }catch(e){console.error(e);reply(res,500,{error:'Storage unavailable'})}
}).listen(PORT,'0.0.0.0',()=>console.log('Radio API running on port '+PORT));
