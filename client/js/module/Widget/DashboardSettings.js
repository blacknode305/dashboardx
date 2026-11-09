import { t } from '../i18n.js';
import { setOptimaWritePassword, hasOptimaWritePassword, getOptimaWritePassword } from '../OptimaAPI.js';
import { getCredential, hasCredential, setCredential, clearCredential } from '../CredentialStore.js';
import {
  getGatewayUrl, configureGatewayAccess, disconnectGateway, gatewayStatus,
  installOpenAIKey, removeOpenAIKey
} from '../AIGatewayAccess.js';

const OPTIMA_BASE='https://pro-optima-production.up.railway.app';
export default class DashboardSettingsWidget {
  constructor(widget){
    this.widget=widget;
    this.controllers=new Set();
    this.unbind=[];
    for(const service of ['telegram','optima']){
      const form=widget.querySelector('.dx-credential-form[data-service="'+service+'"]');
      const section=form.closest('.dx-credential');
      const input=form.querySelector('[data-role="credential-input"]');
      const label=section.querySelector('label');
      const status=section.querySelector('[data-role="credential-status"]');
      const toggle=form.querySelector('[data-role="credential-toggle"]');
      const clear=form.querySelector('[data-role="credential-clear"]');
      const uniqueId=widget.instanceId+'-'+service+'-token';
      input.id=uniqueId;label.htmlFor=uniqueId;
      const update=message=>{
        status.textContent=t(message||(hasCredential(service)?'settings.saved':'settings.missing'));
      };
      const submit=event=>{
        event.preventDefault();
        if(!input.value.trim()){update('settings.empty');return;}
        if(!setCredential(service,input.value)){update('settings.saveError');return;}
        input.value='';input.type='password';toggle.textContent=t('settings.show');
        update('settings.saved');
      };
      const reveal=()=>{
        input.type=input.type==='password'?'text':'password';
        toggle.textContent=t(input.type==='password'?'settings.show':'settings.hide');
      };
      const wipe=()=>{
        if(!clearCredential(service)){update('settings.saveError');return;}
        input.value='';input.type='password';toggle.textContent=t('settings.show');
        update('settings.cleared');
      };
      form.addEventListener('submit',submit);toggle.addEventListener('click',reveal);
      clear.addEventListener('click',wipe);
      this.unbind.push(()=>{form.removeEventListener('submit',submit);toggle.removeEventListener('click',reveal);clear.removeEventListener('click',wipe);input.value='';});
      if(service==='optima'){
        const button=form.querySelector('[data-role="optima-test"]');
        const test=async()=>{
          const token=getCredential('optima');
          if(!token){update('settings.missing');return;}
          const controller=new AbortController();this.controllers.add(controller);
          button.disabled=true;update('settings.testing');
          try {
            const response=await fetch(OPTIMA_BASE+'/api/admin/db',{
              headers:{Authorization:'Bearer '+token,'X-Optima-Write-Password':getOptimaWritePassword()},
              cache:'no-store',signal:controller.signal
            });
            if(this.destroyed)return;
            if(!response.ok)throw new Error('HTTP '+response.status);
            const body=await response.json();
            update(Array.isArray(body.data?.suppliers)?'settings.connected':'settings.badResponse');
          }catch(error){
            if(!this.destroyed&&!controller.signal.aborted)
              update(error.message==='HTTP 401'?'settings.unauthorized':error.message==='HTTP 403'?'Требуется пароль администратора.':'settings.offline');
          }finally{this.controllers.delete(controller);if(!this.destroyed)button.disabled=false;}
        };
        button.addEventListener('click',test);
        this.unbind.push(()=>button.removeEventListener('click',test));
      }
      update();
    }
    const ownerPasswordForm=widget.querySelector('[data-role="optima-owner-password-form"]');
    if(ownerPasswordForm){
      const password=ownerPasswordForm.querySelector('[data-role="optima-owner-password"]');
      const reveal=ownerPasswordForm.querySelector('[data-role="optima-owner-reveal"]');
      const clear=ownerPasswordForm.querySelector('[data-role="optima-owner-clear"]');
      const status=widget.querySelector('[data-role="optima-owner-status"]');
      const submit=e=>{
        e.preventDefault();
        if(!password.value){status.textContent='Введите пароль администратора.';return;}
        setOptimaWritePassword(password.value);
        password.value='';password.type='password';reveal.textContent='Показать';
        status.textContent='Пароль установлен для этой вкладки. Сервер проверит его при чтении, скачивании архива и сохранении.';
      };
      const toggle=()=>{password.type=password.type==='password'?'text':'password';reveal.textContent=password.type==='password'?'Показать':'Скрыть';};
      const lock=()=>{setOptimaWritePassword('');password.value='';password.type='password';reveal.textContent='Показать';status.textContent='Полное управление заблокировано в этой вкладке.';};
      ownerPasswordForm.addEventListener('submit',submit);
      reveal.addEventListener('click',toggle);
      clear.addEventListener('click',lock);
      if(hasOptimaWritePassword())status.textContent='Пароль уже введён в этой вкладке.';
      this.unbind.push(()=>{ownerPasswordForm.removeEventListener('submit',submit);reveal.removeEventListener('click',toggle);clear.removeEventListener('click',lock);password.value='';});
    }
    // Two-factor protected, read-only full archive from Railway.
    const completeButton=widget.querySelector('[data-role="settings-download-full"]');
    const completeStatus=widget.querySelector('[data-role="settings-full-backup-info"]');
    if(completeButton&&completeStatus){
      const downloadComplete=async()=>{
        const token=getCredential('optima'),password=getOptimaWritePassword();
        if(!token||!password){
          completeStatus.textContent='Сначала укажите Admin Token и пароль администратора в разделе «Подключения».';
          return;
        }
        const controller=new AbortController();this.controllers.add(controller);
        completeButton.disabled=true;
        completeStatus.textContent='Загрузка полного архива с фотографиями. Не закрывайте вкладку.';
        try{
          const response=await fetch(OPTIMA_BASE+'/api/admin/backup/full',{
            method:'GET',cache:'no-store',signal:controller.signal,
            headers:{Authorization:'Bearer '+token,'X-Optima-Write-Password':password}
          });
          if(!response.ok){
            let detail='';
            try{detail=String((await response.json()).error||'')}catch{}
            const hint=response.status===401?'Проверьте Admin Token.':
              response.status===403?'Проверьте пароль администратора.':
              response.status===404?'На Railway ещё не опубликована серверная версия с полным архивом.':'';
            throw new Error('HTTP '+response.status+'. '+(hint||detail));
          }
          const archive=await response.blob();
          if(!archive.size)throw new Error('Сервер вернул пустой архив.');
          if(this.destroyed)return;
          const cd=response.headers.get('Content-Disposition')||'';
          const serverName=cd.match(/filename="?([a-zA-Z0-9._-]+)"?/i)?.[1];
          const filename=serverName||'DashboardX_OPTIMA_complete_'+new Date().toISOString().slice(0,10)+'.tar.gz';
          const objectUrl=URL.createObjectURL(archive);
          const link=document.createElement('a');
          link.href=objectUrl;link.download=filename;document.body.append(link);link.click();link.remove();
          setTimeout(()=>URL.revokeObjectURL(objectUrl),120000);
          completeStatus.textContent='Архив передан браузеру ('+(archive.size/1024/1024).toFixed(1)+' МБ). Проверьте загрузки.';
        }catch(error){
          if(!this.destroyed&&!controller.signal.aborted)
            completeStatus.textContent='Не удалось скачать полный архив: '+String(error.message||error);
        }finally{
          this.controllers.delete(controller);
          if(!this.destroyed)completeButton.disabled=false;
        }
      };
      completeButton.addEventListener('click',downloadComplete);
      this.unbind.push(()=>completeButton.removeEventListener('click',downloadComplete));
    }
    // Read-only snapshot import: never patch Railway or overwrite browser storage.
    const snapshot=(source,loadRole,saveRole,infoRole,loader)=>{
      const loadButton=widget.querySelector('[data-role="'+loadRole+'"]');
      const saveButton=widget.querySelector('[data-role="'+saveRole+'"]');
      const status=widget.querySelector('[data-role="'+infoRole+'"]');
      if(!loadButton||!saveButton||!status)return;
      let captured=null;
      const report=message=>{if(!this.destroyed)status.textContent=message;};
      const read=async()=>{
        loadButton.disabled=true;saveButton.disabled=true;captured=null;
        report('Чтение данных…');
        try{
          const payload=await loader();
          if(this.destroyed)return;
          captured={format:'dashboardx-data-snapshot-v1',source,exportedAt:new Date().toISOString(),...payload};
          const bytes=new Blob([JSON.stringify(captured)]).size;
          const groups=source==='railway'
            ?Object.entries(payload.data||{}).filter(([,value])=>Array.isArray(value)).map(([key,value])=>key+': '+value.length).join(' · ')
            :'Ключей: '+Object.keys(payload.entries||{}).length;
          report('Загружено · '+(bytes/1024/1024).toFixed(2)+' МБ · '+groups+
            (source==='railway'?' · ревизия '+String(payload.revision??'—'):''));
          saveButton.disabled=false;
        }catch(error){
          if(this.destroyed)return;
          const code=error.status===401?' (проверьте Admin Token)':error.status===403?' (проверьте пароль администратора)':'';
          report('Не удалось загрузить'+code+': '+String(error.message||error));
        }finally{if(!this.destroyed)loadButton.disabled=false;}
      };
      const save=()=>{
        if(!captured)return;
        const blob=new Blob([JSON.stringify(captured,null,2)],{type:'application/json;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const link=document.createElement('a');
        const stamp=new Date().toISOString().replace(/[:.]/g,'-');
        link.href=url;link.download='dashboardx-'+source+'-'+stamp+'.json';
        document.body.append(link);link.click();link.remove();
        // Revoke after the browser has had an opportunity to start the download.
        setTimeout(()=>URL.revokeObjectURL(url),60000);
      };
      loadButton.addEventListener('click',read);
      saveButton.addEventListener('click',save);
      this.unbind.push(()=>{
        loadButton.removeEventListener('click',read);
        saveButton.removeEventListener('click',save);
        captured=null;
      });
    };
    snapshot('railway','settings-load-railway','settings-save-railway','settings-railway-info',async()=>{
      const token=getCredential('optima');
      if(!token)throw Object.assign(new Error('Admin Token не сохранён в настройках.'),{status:401});
      const controller=new AbortController();
      this.controllers.add(controller);
      try{
        const response=await fetch(OPTIMA_BASE+'/api/admin/db',{
          method:'GET',headers:{Authorization:'Bearer '+token,'X-Optima-Write-Password':getOptimaWritePassword()},
          cache:'no-store',signal:controller.signal
        });
        if(!response.ok)throw Object.assign(new Error('HTTP '+response.status),{status:response.status});
        const body=await response.json();
        if(!body?.data||!Array.isArray(body.data.suppliers))throw new Error('Неверный формат базы PRO OPTIMA.');
        return {revision:body.revision,updatedAt:body.updatedAt,data:body.data};
      }finally{this.controllers.delete(controller);}
    });
    snapshot('localstorage','settings-load-local','settings-save-local','settings-local-info',()=>{
      const entries={};
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key!==null)entries[key]=localStorage.getItem(key);
      }
      return {origin:location.origin,entries};
    });
    // Per-installation BYOK: never write OpenAI or gateway tokens to localStorage.
    const ownerForm = widget.querySelector('[data-role="ai-owner-form"]');
    if (ownerForm) {
      const gatewayInput = widget.querySelector('[data-role="ai-gateway-url"]');
      const ownerInput = widget.querySelector('[data-role="ai-owner-token"]');
      const apiKeyInput = widget.querySelector('[data-role="ai-api-key"]');
      const keyForm = widget.querySelector('[data-role="ai-key-form"]');
      const status = widget.querySelector('[data-role="ai-status"]');
      const disconnectButton = widget.querySelector('[data-role="ai-disconnect"]');
      const testButton = widget.querySelector('[data-role="ai-test"]');
      const deleteButton = widget.querySelector('[data-role="ai-key-delete"]');
      gatewayInput.value = getGatewayUrl();
      const report = (message) => { if (!this.destroyed) status.textContent = message; };
      const testConnection = async () => {
        try {
          const state = await gatewayStatus();
          report(state.enabled
            ? 'AI готов: ' + state.model + ' · остаток запросов в час: ' + state.requestsRemaining
            : 'Сервер доступен, но ключ OpenAI ещё не установлен.');
        } catch(error) {
          report('Нет подключения: ' + String(error.message || error));
        }
      };
      const onConnect = event => {
        event.preventDefault();
        try {
          configureGatewayAccess({ url: gatewayInput.value.trim(), token: ownerInput.value });
          ownerInput.value = '';
          report('Адрес сохранён, токен шлюза действует только в этой вкладке. Проверка сервера…');
          void testConnection();
        } catch(error) { report('Ошибка: ' + String(error.message || error)); }
      };
      const onKey = async event => {
        event.preventDefault();
        const value = apiKeyInput.value;
        apiKeyInput.value = '';
        if (!value) return report('Вставьте OpenAI API-ключ.');
        try {
          report('Передача ключа на сервер…');
          const result = await installOpenAIKey(value);
          report(result.enabled ? 'Ключ установлен в памяти сервера до перезапуска.' : 'Ключ не установлен.');
        } catch(error) { report('Не удалось установить ключ: ' + String(error.message || error)); }
      };
      const onDelete = async () => {
        if (!confirm('Удалить API-ключ из памяти AI-сервера?')) return;
        try {
          await removeOpenAIKey(); report('Ключ удалён из памяти сервера.');
        } catch(error) { report(String(error.message || error)); }
      };
      const onDisconnect = () => {
        disconnectGateway();
        ownerInput.value = ''; apiKeyInput.value = '';
        report('Сессия AI-шлюза отключена в браузере. Ключ на сервере не изменён.');
      };
      ownerForm.addEventListener('submit', onConnect);
      keyForm.addEventListener('submit', onKey);
      deleteButton.addEventListener('click', onDelete);
      disconnectButton.addEventListener('click', onDisconnect);
      testButton.addEventListener('click', testConnection);
      this.unbind.push(()=>{
        ownerForm.removeEventListener('submit', onConnect);
        keyForm.removeEventListener('submit', onKey);
        deleteButton.removeEventListener('click', onDelete);
        disconnectButton.removeEventListener('click', onDisconnect);
        testButton.removeEventListener('click', testConnection);
        ownerInput.value = ''; apiKeyInput.value = '';
      });
    }
    // Mirror the REAL toolbar actions, rather than maintaining a second
    // implementation of theme, fullscreen, 3D, wallpaper, reset or languages.
    // Works inside the live CSS3D widget as well as on the ordinary Desktop.
    const list=widget.querySelector('[data-role="settings-workspace-list"]');
    const createForm=widget.querySelector('[data-role="settings-workspace-form"]');
    const createName=widget.querySelector('[data-role="settings-workspace-name"]');
    const workspaceStatus=widget.querySelector('[data-role="settings-workspace-status"]');
    const dispatchWorkspace=(action,options={})=>{
      window.dispatchEvent(new CustomEvent('dashboardx:workspace-command',{
        detail:{action,...options}
      }));
    };
    const renderWorkspaces=()=>{
      if(this.destroyed || !list)return;
      const store=window.dashboardxStore;
      if(!store)return;
      list.replaceChildren();
      for(const workspace of store.state.workspaces){
        const row=document.createElement('div');
        row.className='dx-settings-workspace-row'+
          (workspace.id===store.workspace.id?' is-active':'');
        const choose=document.createElement('button');
        choose.type='button';choose.dataset.action='select';
        choose.dataset.workspaceId=workspace.id;
        choose.dataset.role='settings-workspace';
        choose.className='dx-settings-workspace-select';
        choose.textContent=workspace.name;
        choose.title='Перейти: '+workspace.name;
        choose.setAttribute('aria-pressed',String(workspace.id===store.workspace.id));
        const edit=document.createElement('button');
        edit.type='button';edit.dataset.action='rename';
        edit.dataset.workspaceId=workspace.id;
        edit.dataset.role='settings-workspace';
        edit.title='Переименовать '+workspace.name;
        edit.setAttribute('aria-label',edit.title);
        edit.textContent='✎';
        const remove=document.createElement('button');
        remove.type='button';remove.dataset.action='delete';
        remove.dataset.workspaceId=workspace.id;
        remove.dataset.role='settings-workspace';
        remove.className='dx-settings-workspace-delete';
        remove.title='Удалить '+workspace.name;
        remove.setAttribute('aria-label',remove.title);
        remove.textContent='×';
        row.append(choose,edit,remove);list.append(row);
      }
      if(workspaceStatus){
        workspaceStatus.textContent='Текущее: '+store.workspace.name+
          ' · пространств: '+store.state.workspaces.length;
      }
    };
    const syncToolbar=()=>{
      if(this.destroyed)return;
      const uiLanguage=window.dashboardxStore?.state.system.language;
      widget.querySelectorAll('[data-role="settings-language"]').forEach(button=>{
        button.setAttribute('aria-pressed',String(button.dataset.lang===uiLanguage));
      });
      const themeButton=widget.querySelector('[data-role="settings-action"][data-action="theme"]');
      if(themeButton)themeButton.textContent=
        document.documentElement.dataset.theme==='light'?'☾ Тёмная тема':'☼ Светлая тема';
      const fullscreen=widget.querySelector('[data-role="settings-action"][data-action="fullscreen"]');
      if(fullscreen)fullscreen.textContent=document.fullscreenElement?
        '⛶ Выйти из полного экрана':'⛶ Полный экран';
      const spatial=widget.querySelector('[data-role="settings-action"][data-action="spatial"]');
      if(spatial)spatial.textContent=document.body.classList.contains('dx-spatial-active')?
        '◈ Вернуться в Desktop':'◈ Spatial 3D';
    };
    const handleMirrorClick=event=>{
      const button=event.target.closest?.('button[data-role]');
      if(!button || !widget.contains(button))return;
      const role=button.dataset.role;
      if(role==='settings-action'){
        const control={
          theme:'theme-toggle',fullscreen:'fullscreen-toggle',
          spatial:'spatial-toggle',background:'background-button',
          reset:'clear-storage'
        }[button.dataset.action];
        if(control)document.getElementById(control)?.click();
        syncToolbar();
      }else if(role==='settings-language'){
        document.querySelector('.language-pills button[data-lang="'+button.dataset.lang+'"]')?.click();
      }else if(role==='settings-workspace'){
        const id=button.dataset.workspaceId;
        const workspace=window.dashboardxStore?.state.workspaces.find(w=>w.id===id);
        if(!workspace)return;
        if(button.dataset.action==='select')dispatchWorkspace('select',{id});
        if(button.dataset.action==='delete')dispatchWorkspace('delete',{id});
        if(button.dataset.action==='rename'){
          const name=prompt('Новое название пространства',workspace.name);
          if(name!==null)dispatchWorkspace('rename',{id,name});
        }
      }
    };
    const submitWorkspace=event=>{
      event.preventDefault();
      const name=createName.value.trim();
      if(!name){if(workspaceStatus)workspaceStatus.textContent='Введите название';return;}
      createName.value='';
      dispatchWorkspace('create',{name});
    };
    widget.addEventListener('click',handleMirrorClick);
    createForm?.addEventListener('submit',submitWorkspace);
    window.addEventListener('dashboardx:workspaces-changed',renderWorkspaces);
    window.addEventListener('dashboardx:ui-changed',syncToolbar);
    document.addEventListener('fullscreenchange',syncToolbar);
    const themeObserver=new MutationObserver(syncToolbar);
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    renderWorkspaces();syncToolbar();
    this.unbind.push(()=>{
      widget.removeEventListener('click',handleMirrorClick);
      createForm?.removeEventListener('submit',submitWorkspace);
      window.removeEventListener('dashboardx:workspaces-changed',renderWorkspaces);
      window.removeEventListener('dashboardx:ui-changed',syncToolbar);
      document.removeEventListener('fullscreenchange',syncToolbar);
      themeObserver.disconnect();
    });

    this.credentialChanged=event=>{
      if(this.destroyed)return;
      const section=widget.querySelector('.dx-credential[data-service="'+event.detail?.service+'"]');
      if(section)section.querySelector('[data-role="credential-status"]').textContent=
        t(hasCredential(event.detail.service)?'settings.saved':'settings.missing');
    };
    window.addEventListener('dashboardx:credential-changed',this.credentialChanged);
  }
  destroy(){
    this.destroyed=true;
    this.controllers.forEach(c=>c.abort());
    this.controllers.clear();
    this.unbind.forEach(fn=>fn());
    window.removeEventListener('dashboardx:credential-changed',this.credentialChanged);
  }
}
