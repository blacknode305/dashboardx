import { t } from '../i18n.js';
import { setOptimaWritePassword, hasOptimaWritePassword } from '../OptimaAPI.js';
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
              headers:{Authorization:'Bearer '+token},
              cache:'no-store',signal:controller.signal
            });
            if(this.destroyed)return;
            if(!response.ok)throw new Error('HTTP '+response.status);
            const body=await response.json();
            update(Array.isArray(body.data?.suppliers)?'settings.connected':'settings.badResponse');
          }catch(error){
            if(!this.destroyed&&!controller.signal.aborted)
              update(error.message==='HTTP 401'?'settings.unauthorized':'settings.offline');
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
        status.textContent='Пароль установлен для этой вкладки. Сервер проверит его при сохранении.';
      };
      const toggle=()=>{password.type=password.type==='password'?'text':'password';reveal.textContent=password.type==='password'?'Показать':'Скрыть';};
      const lock=()=>{setOptimaWritePassword('');password.value='';password.type='password';reveal.textContent='Показать';status.textContent='Полное управление заблокировано в этой вкладке.';};
      ownerPasswordForm.addEventListener('submit',submit);
      reveal.addEventListener('click',toggle);
      clear.addEventListener('click',lock);
      if(hasOptimaWritePassword())status.textContent='Пароль уже введён в этой вкладке.';
      this.unbind.push(()=>{ownerPasswordForm.removeEventListener('submit',submit);reveal.removeEventListener('click',toggle);clear.removeEventListener('click',lock);password.value='';});
    }
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
