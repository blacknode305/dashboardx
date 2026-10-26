import eventBus from '../EventBus.js';
const isoDate=raw=>{
 const s=String(raw||'');if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const m=s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:'';
};
export default class FinanceTableWidget {
 constructor(widget){
  this.widget=widget;this.from=widget.querySelector('[data-filter="from"]');
  this.to=widget.querySelector('[data-filter="to"]');this.tbody=widget.querySelector('[data-role="rows"]');
  const s=window.dashboardxStore.getWidgetState(widget.instanceId)||{};
  this.from.value=s.from||'';this.to.value=s.to||'';
  this.onChange=()=>this.render();eventBus.on('finance:dayBalanceWidget:updated',this.onChange);
  this.refresh=()=>{window.dashboardxStore.updateWidgetState(widget.instanceId,{from:this.from.value,to:this.to.value});this.render();};
  this.button=widget.querySelector('[data-action="view-period"]');
  this.button?.addEventListener('click',this.refresh);
  this.exportButton=document.createElement('button');this.exportButton.type='button';
  this.exportButton.textContent='CSV ↓';this.exportButton.title='Скачать отфильтрованные финансы';
  this.exportButton.addEventListener('click',()=>this.exportCsv());
  this.button?.after(this.exportButton);
  this.render();
 }
 filtered(){
  const from=this.from.value,to=this.to.value;
  return (window.db.finance?.table||[]).filter(r=>{const d=isoDate(r.date);return d&&(!from||d>=from)&&(!to||d<=to);})
   .sort((a,b)=>isoDate(b.date).localeCompare(isoDate(a.date)));
 }
 render(){
  if(!this.tbody)return;this.tbody.replaceChildren();
  for(const row of this.filtered()){
   const tr=document.createElement('tr');
   const values=[String(row.date||''),Number(row.income||0).toFixed(2),Number(row.expense||0).toFixed(2),Number(row.result||0).toFixed(2)];
   values.forEach(v=>{const cell=document.createElement('td');cell.textContent=v;tr.append(cell);});
   this.tbody.append(tr);
  }
 }
 exportCsv(){
  const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const lines=['Дата,Доход,Расход,Баланс',...this.filtered().map(r=>[r.date,r.income,r.expense,r.result].map(escape).join(','))];
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dashboardx-finances.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 destroy(){
  eventBus.off('finance:dayBalanceWidget:updated',this.onChange);
  this.button?.removeEventListener('click',this.refresh);
  this.exportButton?.remove();
 }
}
