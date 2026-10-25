// User opted in to persistent credentials for DashboardX GitHub Pages.
// WARNING: browser localStorage is NOT encrypted and is readable by any script
// running on the same origin (including other GitHub Pages project paths).
// Never print tokens, put them in URLs, widgetState or repository files.
const KEY='dashboardx.credentials.v1';
const SERVICES=new Set(['telegram','optima']);
function storage(){return window.localStorage;}
function read(){
  try {
    const data=JSON.parse(storage().getItem(KEY)||'null');
    return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
  } catch {return {};}
}
export function getCredential(service){
  if(!SERVICES.has(service))return '';
  const value=read()[service];
  return typeof value==='string'?value:'';
}
export function hasCredential(service){return Boolean(getCredential(service));}
export function setCredential(service,value){
  if(!SERVICES.has(service)||typeof value!=='string'||!value.trim())return false;
  const next={...read(),[service]:value.trim()};
  try {storage().setItem(KEY,JSON.stringify(next));}
  catch{return false;}
  window.dispatchEvent(new CustomEvent('dashboardx:credential-changed',{detail:{service}}));
  return true;
}
export function clearCredential(service){
  if(!SERVICES.has(service))return false;
  const next={...read()};delete next[service];
  try{
    if(!Object.keys(next).length)storage().removeItem(KEY);
    else storage().setItem(KEY,JSON.stringify(next));
  }catch{return false;}
  window.dispatchEvent(new CustomEvent('dashboardx:credential-changed',{detail:{service}}));
  return true;
}
