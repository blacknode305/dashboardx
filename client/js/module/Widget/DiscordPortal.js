// DashboardX Discord portal. Public widget and channel deep links only.
// No user tokens, bot passwords, unofficial client or direct voice capture.
const ID=/^\d{15,20}$/;
const el=(tag,cls='',content='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content)n.textContent=content;return n;};
export const validDiscordId=value=>ID.test(String(value||'').trim());
export function discordChannelLink(guild,channel){
  if(!validDiscordId(guild)||!validDiscordId(channel))throw Error('Некорректный ID канала или сервера.');
  return 'https://discord.com/channels/'+guild+'/'+channel;
}
export function discordInviteLink(value){
  const text=String(value||'').trim();
  if(!text)return '';
  const url=new URL(text);
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash)
    throw Error('Ожидается ссылка discord.gg или discord.com/invite.');
  const parts=url.pathname.split('/').filter(Boolean);
  let code='';
  if(url.hostname==='discord.gg'&&parts.length===1)code=parts[0];
  if(['discord.com','www.discord.com'].includes(url.hostname)&&parts[0]==='invite'&&parts.length===2)code=parts[1];
  if(!/^[a-zA-Z0-9-]{2,60}$/.test(code))throw Error('Некорректная ссылка-приглашение Discord.');
  return 'https://discord.com/invite/'+code;
}
export function discordWidgetURL(id,theme='dark'){
  if(!validDiscordId(id))throw Error('Некорректный Server ID.');
  return 'https://discord.com/widget?id='+id+'&theme='+(theme==='light'?'light':'dark');
}
export function normalizeDiscordServers(source){
  const data=Array.isArray(source)?source:[];
  const result=[];
  for(const item of data.slice(0,15)){
    if(!validDiscordId(item?.id)||result.some(x=>x.id===item.id))continue;
    let invite='';try{invite=discordInviteLink(item.invite||'')}catch{}
    result.push({id:String(item.id),name:String(item.name||'Discord-сервер').slice(0,70),invite,
      channels:(Array.isArray(item.channels)?item.channels:[]).filter(x=>validDiscordId(x?.id))
        .slice(0,60).map(x=>({id:String(x.id),name:String(x.name||'Комната').slice(0,70),
          kind:x.kind==='text'?'text':'voice'}))});
  }
  return result;
}
export default class DiscordPortalWidget{
  constructor(widget){
    this.widget=widget;this.store=window.dashboardxStore;
    if(!this.store)throw Error('DashboardX storage missing');
    const state=this.store.getWidgetState(widget.instanceId)||{};
    this.servers=normalizeDiscordServers(state.discordServers);
    this.current=this.servers.some(s=>s.id===state.discordCurrent)?state.discordCurrent:(this.servers[0]?.id||'');
    this.publicRooms=[];this.online=null;this.version=0;this.abort=null;this.clean=[];
    const q=s=>widget.querySelector(s);
    this.status=q('[data-role="dc-status"]');this.settings=q('[data-role="dc-settings"]');
    this.toggle=q('[data-action="dc-config-toggle"]');
    this.serverForm=q('[data-role="dc-server-form"]');
    this.channelForm=q('[data-role="dc-channel-form"]');
    this.select=q('[data-role="dc-guild-select"]');
    this.list=q('[data-role="dc-rooms"]');this.count=q('[data-role="dc-count"]');
    this.embed=q('[data-role="dc-embed"]');this.onlineLabel=q('[data-role="dc-online"]');
    const on=(node,type,fn)=>{node?.addEventListener(type,fn);this.clean.push(()=>node?.removeEventListener(type,fn));};
    on(this.toggle,'click',()=>{this.settings.hidden=!this.settings.hidden;
      this.toggle.setAttribute('aria-expanded',String(!this.settings.hidden));
      if(!this.settings.hidden)this.fillForm();});
    on(this.select,'change',()=>{
      this.current=this.select.value;this.resetPublic();
      this.save();this.render();this.refresh();
    });
    on(this.serverForm,'submit',event=>{
      event.preventDefault();
      try{
        const data=new FormData(this.serverForm),id=String(data.get('guildId')||'').trim();
        if(!validDiscordId(id))throw Error('Server ID должен содержать 15–20 цифр.');
        const name=String(data.get('guildName')||'').trim().slice(0,70)||'Discord-сервер';
        const invite=discordInviteLink(data.get('invite'));
        const exists=this.servers.find(x=>x.id===id);
        if(!exists&&this.servers.length>=15)throw Error('Лимит — 15 серверов.');
        if(exists)Object.assign(exists,{name,invite});
        else this.servers.push({id,name,invite,channels:[]});
        this.current=id;this.resetPublic();this.save();this.render();this.fillForm();this.refresh();
      }catch(error){this.say(error.message);}
    });
    on(q('[data-action="dc-remove-server"]'),'click',()=>{
      const current=this.active();if(!current)return;
      if(!confirm('Убрать '+current.name+' и его закладки из этого виджета?'))return;
      this.servers=this.servers.filter(x=>x.id!==current.id);
      this.current=this.servers[0]?.id||'';this.resetPublic();
      this.save();this.render();this.fillForm();this.refresh();
    });
    on(this.channelForm,'submit',event=>{
      event.preventDefault();
      try{
        const server=this.active();if(!server)throw Error('Сначала добавьте сервер.');
        const data=new FormData(this.channelForm),id=String(data.get('channelId')||'').trim(),
          name=String(data.get('channelName')||'').trim().slice(0,70),
          kind=data.get('channelType')==='text'?'text':'voice';
        if(!validDiscordId(id))throw Error('ID комнаты должен содержать 15–20 цифр.');
        if(!name)throw Error('Введите название комнаты.');
        if(server.channels.some(x=>x.id===id))throw Error('Комната уже сохранена.');
        if(server.channels.length>=60)throw Error('Лимит — 60 каналов.');
        server.channels.push({id,name,kind});
        this.channelForm.reset();this.save();this.renderRooms();this.say('Комната добавлена.');
      }catch(error){this.say(error.message);}
    });
    on(this.list,'click',event=>{
      const remove=event.target.closest('[data-dc-remove]');
      if(remove&&this.list.contains(remove)){
        const server=this.active();
        if(server){server.channels=server.channels.filter(x=>x.id!==remove.dataset.dcRemove);
          this.save();this.renderRooms();}
        return;
      }
      const open=event.target.closest('[data-dc-channel]');
      if(open&&this.list.contains(open)&&this.active())
        this.open(discordChannelLink(this.current,open.dataset.dcChannel));
    });
    on(q('[data-action="dc-refresh"]'),'click',()=>this.refresh());
    on(q('[data-action="dc-open-server"]'),'click',()=>{
      const server=this.active();
      if(!server){this.settings.hidden=false;this.fillForm();return;}
      this.open(server.invite||'https://discord.com/channels/'+server.id);
    });
    this.render();this.fillForm();if(this.current)this.refresh();
  }
  active(){return this.servers.find(x=>x.id===this.current)||null;}
  say(message){this.status.textContent=message;}
  save(){this.store.updateWidgetState(this.widget.instanceId,{
    discordServers:this.servers,discordCurrent:this.current
  });}
  open(url){window.open(url,'_blank','noopener,noreferrer');
    this.say('Открыт Discord. Подключение к голосу подтверждается там.');}
  resetPublic(){this.version++;this.abort?.abort();this.publicRooms=[];this.online=null;}
  fillForm(){
    const server=this.active();
    this.serverForm.elements.guildId.value=server?.id||'';
    this.serverForm.elements.guildName.value=server?.name||'';
    this.serverForm.elements.invite.value=server?.invite||'';
  }
  render(){
    const server=this.active();
    this.select.replaceChildren();
    if(!this.servers.length)this.select.add(new Option('Добавьте сервер',''));
    for(const item of this.servers)this.select.add(new Option(item.name,item.id));
    this.select.value=server?.id||'';
    this.channelForm.querySelectorAll('input,select,button').forEach(e=>e.disabled=!server);
    this.widget.querySelector('[data-action="dc-refresh"]').disabled=!server;
    this.widget.querySelector('[data-action="dc-open-server"]').disabled=!server;
    this.renderRooms();this.renderEmbed();
    this.say(server?'Каналы '+server.name+'. Нажмите для перехода в Discord.':
      'Нажмите «Настроить» и добавьте Discord Server ID.');
  }
  renderRooms(){
    this.list.replaceChildren();
    const manual=this.active()?.channels||[];
    const saved=new Set(manual.map(x=>x.id));
    const automatic=this.publicRooms.filter(x=>!saved.has(x.id));
    this.count.textContent=String(manual.length+automatic.length);
    if(!manual.length&&!automatic.length)
      this.list.append(el('p','dx-discord-empty','Нет комнат. Добавьте ID канала в форме ниже.'));
    for(const [index,item] of [...manual,...automatic].entries()){
      const line=el('div','dx-discord-room');
      const launch=el('button','dx-discord-room-open');
      launch.type='button';launch.dataset.dcChannel=item.id;
      launch.append(el('span','dx-discord-icon',item.kind==='text'?'#':'🎙'),
        el('span','dx-discord-room-name',item.name),
        el('small','',item.kind==='text'?'Текст':'Голос'),
        el('span','dx-discord-arrow','↗'));
      line.append(launch);
      if(index<manual.length){
        const remove=el('button','dx-discord-room-remove','×');
        remove.type='button';remove.dataset.dcRemove=item.id;
        remove.title='Убрать закладку';remove.setAttribute('aria-label','Убрать '+item.name);
        line.append(remove);
      }
      this.list.append(line);
    }
  }
  renderEmbed(){
    this.embed.replaceChildren();
    const server=this.active();
    if(!server){this.embed.append(el('p','dx-discord-empty','Добавьте сервер, чтобы показать официальный виджет.'));return;}
    const frame=el('iframe','dx-discord-frame');
    frame.src=discordWidgetURL(server.id,document.documentElement.dataset.theme);
    frame.title='Discord: '+server.name;frame.loading='lazy';
    frame.referrerPolicy='no-referrer';
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    this.embed.append(frame);
    this.onlineLabel.textContent=this.online===null?'Публичный сервер':'Онлайн: '+this.online;
  }
  async refresh(){
    const server=this.active();if(!server)return;
    this.abort?.abort();
    const controller=new AbortController();this.abort=controller;
    const version=++this.version;this.say('Загружаем публичные сведения Discord…');
    try{
      const response=await fetch('https://discord.com/api/guilds/'+server.id+'/widget.json',{
        credentials:'omit',cache:'no-store',signal:controller.signal
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const payload=await response.json();
      if(version!==this.version||this.current!==server.id)return;
      this.online=Number.isInteger(payload.presence_count)?payload.presence_count:null;
      this.publicRooms=(Array.isArray(payload.channels)?payload.channels:[])
        .filter(item=>validDiscordId(item?.id)).slice(0,100)
        .map(item=>({id:String(item.id),name:String(item.name||'Голосовая комната').slice(0,70),kind:'voice'}));
      this.onlineLabel.textContent=this.online===null?'Публичный сервер':'Онлайн: '+this.online;
      this.renderRooms();this.say('Публичные голосовые каналы обновлены.');
    }catch(error){
      if(controller.signal.aborted||version!==this.version)return;
      this.publicRooms=[];this.online=null;this.renderRooms();
      this.say('Публичный список недоступен (виджет выключен или ограничения браузера). Закладки работают.');
    }finally{if(this.abort===controller)this.abort=null}
  }
  destroy(){this.version++;this.abort?.abort();this.clean.forEach(fn=>fn());this.clean=[];}
}
