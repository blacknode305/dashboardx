import { getCredential } from './CredentialStore.js';
import { OPTIMA_BASE } from './OptimaAPI.js';

const KEY='dashboardx.english.learning.v1';
const PATH='/api/dashboardx/learning/english';
const KEYS=['done','bookmarks','weak','readingDone','readingDrafts','readingChecks',
  'savedWords','readingTheme','selected','view','level'];
const validData=data=>data&&typeof data==='object'&&!Array.isArray(data)?data:{};
const clone=value=>JSON.parse(JSON.stringify(value));
const store={
  data:{},revision:0,remoteReady:false,loading:false,status:'Локально',
  listeners:new Set(),timer:null,pending:{},busy:false,initialized:false,
  credentialsHandler:null,
  emit(){
    for(const listener of [...this.listeners])try{listener(this.data,this.status)}catch(e){console.warn(e)}
    window.dispatchEvent(new CustomEvent('dashboardx:english-learning-changed'));
  },
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)},
  readLocal(){
    try{return validData(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return {}}
  },
  saveLocal(){
    try{localStorage.setItem(KEY,JSON.stringify(this.data))}catch(e){console.warn('Learning cache full',e)}
  },
  init(legacy={}){
    if(this.initialized)return;
    this.initialized=true;
    this.data={...validData(legacy),...this.readLocal()};
    if(!Array.isArray(this.data.savedWords))this.data.savedWords=[];
    this.saveLocal();
    this.emit();
    this.credentialsHandler=event=>{
      if(event.detail?.service==='optima')this.load();
    };
    window.addEventListener('dashboardx:credential-changed',this.credentialsHandler);
    this.load();
  },
  update(changes){
    const patch=Object.fromEntries(Object.entries(validData(changes)).filter(([k])=>KEYS.includes(k)));
    if(!Object.keys(patch).length)return;
    this.data={...this.data,...clone(patch)};
    this.pending={...this.pending,...clone(patch)};
    this.saveLocal();
    this.emit();
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.flush(),700);
  },
  async request(method,body){
    const token=getCredential('optima');
    if(!token)throw Object.assign(Error('В настройках нужен Admin Token PRO OPTIMA'),{status:401});
    const response=await fetch(OPTIMA_BASE+PATH,{
      method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(Error(payload.error||'HTTP '+response.status),
      {status:response.status,server:payload});
    return payload;
  },
  async load(){
    if(this.loading)return;
    this.loading=true;
    try{
      const remote=await this.request('GET');
      this.revision=remote.revision||0;
      const server=validData(remote.data);
      const pending=this.pending;
      // On initial sync, preserve already recorded local vocabulary/progress.
      // Server text drafts take precedence for the same story; local-only drafts survive.
      const combine=(a,b)=>[...new Set([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])])];
      const merged={...this.data,...server};
      for(const field of ['done','bookmarks','readingDone'])
        merged[field]=combine(server[field],this.data[field]);
      merged.readingDrafts={...validData(this.data.readingDrafts),...validData(server.readingDrafts)};
      merged.weak={...validData(this.data.weak),...validData(server.weak)};
      merged.readingChecks={...validData(this.data.readingChecks),...validData(server.readingChecks)};
      const wordMap=new Map();
      for(const word of [...(Array.isArray(server.savedWords)?server.savedWords:[]),
        ...(Array.isArray(this.data.savedWords)?this.data.savedWords:[])]){
        if(word&&typeof word.term==='string')wordMap.set(word.term.trim().toLowerCase(),word);
      }
      merged.savedWords=[...wordMap.values()];
      this.data={...merged,...pending};
      this.remoteReady=true;this.status='PRO OPTIMA · синхронизировано';
      const needsSync=Object.fromEntries(KEYS.filter(key=>
        JSON.stringify(server[key])!==JSON.stringify(this.data[key])).map(key=>[key,this.data[key]]).filter(([,v])=>v!==undefined));
      this.pending={...needsSync,...pending};
      this.saveLocal();this.emit();
      if(Object.keys(this.pending).length)this.flush();
    }catch(e){
      this.remoteReady=false;
      this.status='Локально · '+(e.status===401?'укажите Admin Token':'сервер недоступен');
      this.emit();
    }finally{this.loading=false}
  },
  async flush(){
    clearTimeout(this.timer);
    if(this.busy||!Object.keys(this.pending).length)return;
    if(!this.remoteReady){await this.load();return}
    this.busy=true;
    const changes=this.pending;this.pending={};
    try{
      const result=await this.request('PATCH',{baseRevision:this.revision,changes});
      this.revision=result.revision;
      this.status='PRO OPTIMA · сохранено';this.emit();
    }catch(e){
      this.pending={...changes,...this.pending};
      if(e.status===409){
        this.remoteReady=false;
        this.status='Обновление на другом устройстве · объединяем';
        this.emit();
        // On version conflicts, reload the latest values before retrying.
        await this.load();
      }else{
        this.remoteReady=false;
        this.status='Локально · ошибка синхронизации';
        this.emit();
      }
    }finally{this.busy=false}
    if(Object.keys(this.pending).length&&this.remoteReady)
      this.timer=setTimeout(()=>this.flush(),800);
  },
  normalizeTerm(term){return String(term||'').trim().replace(/\s+/g,' ').slice(0,120)},
  saveWord(term,details={}){
    const word=this.normalizeTerm(term);
    if(!word||word.length>120)return false;
    const saved=Array.isArray(this.data.savedWords)?[...this.data.savedWords]:[];
    const at=saved.findIndex(item=>item.term?.toLowerCase()===word.toLowerCase());
    const previous=at>=0?saved[at]:{};
    const next={term:word,translation:String(details.translation||previous.translation||'').slice(0,400),
      kind:String(details.kind||previous.kind||'').slice(0,60),
      grammarId:String(details.grammarId||previous.grammarId||'').slice(0,80),
      attempts:previous.attempts||0,correct:previous.correct||0,
      addedAt:previous.addedAt||new Date().toISOString()};
    if(at>=0)saved[at]=next;else saved.unshift(next);
    this.update({savedWords:saved.slice(0,1200)});return true;
  },
  removeWord(term){
    const saved=(this.data.savedWords||[]).filter(item=>
      item.term.toLowerCase()!==String(term||'').toLowerCase());
    this.update({savedWords:saved});
  },
  checkWord(term,correct){
    const saved=(this.data.savedWords||[]).map(item=>
      item.term.toLowerCase()===String(term||'').toLowerCase()?{
        ...item,attempts:(item.attempts||0)+1,correct:(item.correct||0)+(correct?1:0)}:item);
    this.update({savedWords:saved});
  }
};
export default store;
