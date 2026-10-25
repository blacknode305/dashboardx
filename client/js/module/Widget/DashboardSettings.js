import { t } from '../i18n.js';
import { getCredential, hasCredential, setCredential, clearCredential } from '../CredentialStore.js';

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
