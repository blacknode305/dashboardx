const OPERATIONS={'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>b===0?NaN:a/b};
export default class CalculatorWidget {
 constructor(widget){
  this.widget=widget;this.display=widget.querySelector('.calculator-display');
  this.value='0';this.previous=null;this.operator=null;this.fresh=false;this.unbind=[];
  this.output=()=>{this.display.value=this.value;};
  const click=e=>{const button=e.target.closest?.('[data-key]');if(button)this.press(button.dataset.key);};
  const keydown=e=>{
   if(e.target.closest?.('input,textarea,select,[contenteditable="true"]')||e.altKey||e.metaKey||e.ctrlKey)return;
   const mapping={Enter:'=',NumpadEnter:'=',Escape:'C',Backspace:'back',Period:'.',NumpadDecimal:'.'};
   const k=mapping[e.code]||
     (/^[0-9]$/.test(e.key)?e.key:null)||
     (['+','-','*','/','.'].includes(e.key)?e.key:null);
   if(k){e.preventDefault();this.press(k);}
  };
  widget.addEventListener('click',click);
  widget.addEventListener('keydown',keydown);
  this.unbind.push(()=>widget.removeEventListener('click',click),()=>widget.removeEventListener('keydown',keydown));
  this.output();
 }
 press(key){
  if(key==='C'){this.value='0';this.previous=null;this.operator=null;this.fresh=false;return this.output();}
  if(key==='back'){this.value=this.value.length>1?this.value.slice(0,-1):'0';return this.output();}
  if(/^\d$/.test(key)){this.value=(this.fresh||this.value==='0'||this.value==='Ошибка')?key:(this.value+key).slice(0,18);this.fresh=false;return this.output();}
  if(key==='.'&&!this.value.includes('.')){this.value=(this.fresh?'0':this.value)+'.';this.fresh=false;return this.output();}
  if(OPERATIONS[key]){
   if(this.operator!==null&&!this.fresh)this.compute();
   this.previous=Number(this.value);this.operator=key;this.fresh=true;return this.output();
  }
  if(key==='=')this.compute();
 }
 compute(){
  if(this.operator===null||this.previous===null)return this.output();
  const result=OPERATIONS[this.operator](this.previous,Number(this.value));
  this.value=Number.isFinite(result)?String(Number(result.toPrecision(12))):'Ошибка';
  this.previous=null;this.operator=null;this.fresh=true;this.output();
 }
 destroy(){this.unbind.forEach(f=>f());}
}