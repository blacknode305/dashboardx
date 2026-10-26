import { locale } from '../i18n.js';
const ALLOWED=new Set(['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT']);
const INTERVALS=new Set(['1m','5m','15m','1h','4h','1d','1w']);
const money=v=>Number(v).toLocaleString(locale(),{maximumFractionDigits:5});
export default class BinanceApiWidget {
 constructor(widget){
  this.widget=widget;this.store=window.dashboardxStore;this.id=widget.instanceId;
  const state=this.store.getWidgetState(this.id)||{};
  this.symbol=ALLOWED.has(state.symbol)?state.symbol:'ETHUSDT';
  this.interval=INTERVALS.has(state.interval)?state.interval:'1m';
  this.symbolInput=widget.querySelector('[data-role="pair"]');
  this.intervalInput=widget.querySelector('[data-role="interval"]');
  this.symbolInput.value=this.symbol;this.intervalInput.value=this.interval;
  this.price=widget.querySelector('[data-role="price"]');
  this.change=widget.querySelector('[data-role="change"]');
  this.stats=widget.querySelector('[data-role="stats"]');
  this.status=widget.querySelector('[data-role="status"]');
  this.canvas=widget.querySelector('canvas');this.chart=null;
  this.listeners=[];this.pending=null;this.destroyed=false;
  const bind=(el,type,fn)=>{el.addEventListener(type,fn);this.listeners.push(()=>el.removeEventListener(type,fn));};
  const reload=()=>{
   this.symbol=this.symbolInput.value;this.interval=this.intervalInput.value;
   this.store.updateWidgetState(this.id,{symbol:this.symbol,interval:this.interval});this.refresh();
  };
  bind(this.symbolInput,'change',reload);
  bind(this.intervalInput,'change',reload);
  bind(widget.querySelector('[data-action="refresh"]'),'click',()=>this.refresh());
  this.refresh();
  this.timer=setInterval(()=>{if(!document.hidden)this.refresh();},60000);
 }
 async request(path,signal){
  const response=await fetch('https://api.binance.com/api/v3/'+path,{signal,cache:'no-store'});
  if(!response.ok)throw Error('Binance HTTP '+response.status);
  return response.json();
 }
 async refresh(){
  this.pending?.abort();const ctrl=new AbortController();this.pending=ctrl;
  this.status.textContent='Загрузка…';
  try{
   const [ticker,klines]=await Promise.all([
    this.request('ticker/24hr?symbol='+encodeURIComponent(this.symbol),ctrl.signal),
    this.request('klines?symbol='+encodeURIComponent(this.symbol)+'&interval='+encodeURIComponent(this.interval)+'&limit=60',ctrl.signal)
   ]);
   if(this.destroyed||ctrl.signal.aborted)return;
   const price=Number(ticker.lastPrice),change=Number(ticker.priceChangePercent);
   if(!Number.isFinite(price)||!Array.isArray(klines))throw Error('Некорректный ответ Binance');
   this.price.textContent=money(price)+' USDT';
   this.change.textContent=(change>=0?'+':'')+change.toFixed(2)+'%';
   this.change.dataset.trend=change<0?'down':'up';
   this.stats.replaceChildren();
   const fields=[['Максимум 24ч',ticker.highPrice],['Минимум 24ч',ticker.lowPrice],['Объём 24ч',ticker.volume]];
   for(const [label,val] of fields){
    const row=document.createElement('div'),k=document.createElement('span'),v=document.createElement('strong');
    k.textContent=label;v.textContent=money(val);row.append(k,v);this.stats.append(row);
   }
   this.plot(klines.map(x=>Number(x[4])));
   this.status.textContent='Обновлено '+new Date().toLocaleTimeString(locale());
   window.dispatchEvent(new CustomEvent('dashboardx:crypto-price',{detail:{symbol:this.symbol,price,change}}));
  }catch(e){
   if(this.destroyed||ctrl.signal.aborted)return;
   this.status.textContent='Котировки недоступны — повторите позже';
  }finally{if(this.pending===ctrl)this.pending=null;}
 }
 plot(data){
  const values=data.filter(Number.isFinite);if(values.length<2)return;
  const context=this.canvas.getContext('2d');if(!context)return;
  if(window.Chart){
   this.chart?.destroy();this.chart=new window.Chart(context,{type:'line',
    data:{labels:values.map((_,i)=>i),datasets:[{data:values,borderWidth:2,pointRadius:0,tension:.22,fill:false}]},
    options:{animation:false,responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:true}}}});
  }else{
   this.chart?.destroy();this.chart=null;
   const width=this.canvas.width||400,height=this.canvas.height||180;
   context.clearRect(0,0,width,height);
   const min=Math.min(...values),max=Math.max(...values),scale=max-min||1;
   context.strokeStyle=getComputedStyle(this.canvas).color||'#8ccaf0';context.lineWidth=2;
   context.beginPath();values.forEach((v,i)=>{
    const x=i/(values.length-1)*width,y=height-10-(v-min)/scale*(height-20);
    if(i===0)context.moveTo(x,y);else context.lineTo(x,y);
   });context.stroke();
  }
 }
 destroy(){
  this.destroyed=true;clearInterval(this.timer);this.pending?.abort();
  this.chart?.destroy();this.listeners.forEach(fn=>fn());
 }
}
