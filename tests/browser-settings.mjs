import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const browser=await chromium.launch({
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']
});
let page;
try {
  page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async dialog=>{
    if(dialog.type()==='prompt'&&dialog.message().includes('нового пространства'))
      await dialog.accept('Кафе');
    else if(dialog.type()==='prompt'&&dialog.message().includes('Новое название'))
      await dialog.accept('Улица');
    else await dialog.dismiss();
  });
  await page.goto('http://127.0.0.1:8787/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#workspace-surface > widget-element[data-widget-type="add"]');
  await page.waitForFunction(()=>window.dashboardxTemplates?.length===28);

  const created=await page.evaluate(()=>{
    const manager=document.querySelector('#workspace-surface widget-element[data-widget-type="add"]');
    const option=[...manager.querySelectorAll('[data-role="type-options"] .dx-picker-option')]
      .find(node=>node.querySelector('.dx-option-note')?.textContent==='dashboardSettings');
    if(!option)return false;
    option.click();
    manager.querySelector('[data-action="create-instance"]').click();
    return true;
  });
  assert.ok(created,'Settings widget is available from the real manager');
  const settings='#workspace-surface widget-element[data-widget-type="dashboardSettings"]';
  await page.waitForSelector(settings);
  const sections=await page.locator(settings+' .dx-settings-fold').count();
  assert.equal(sections,5,'Five folding Settings sections');
  assert.equal(await page.locator(settings+' [data-section="workspaces"]').getAttribute('open'),'');
  assert.equal(await page.locator(settings+' [data-section="connections"]').getAttribute('open'),null);
  assert.equal(await page.locator(settings+' [data-section="ai"]').getAttribute('open'),null);
  assert.equal(await page.locator(settings+' [data-section="danger"]').getAttribute('open'),null);
  await page.locator(settings+' [data-section="interface"] > summary').click();
  assert.equal(await page.locator(settings+' [data-role="settings-action"]').count(),5);
  assert.equal(await page.locator(settings+' [data-role="settings-language"]').count(),3);

  // Same theme behaviour as the permanent toolbar, no duplicate state.
  await page.locator(settings+' [data-action="theme"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.locator(settings+' [data-action="theme"]').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');

  // Workspace creation from Settings, not the header.
  await page.locator(settings+' [data-role="settings-workspace-name"]').fill('Дом');
  await page.locator(settings+' [data-role="settings-workspace-form"] button[type="submit"]').click();
  await page.waitForFunction(()=>window.dashboardxStore.workspace.name==='Дом');
  const homeId='home', streetId=await page.evaluate(()=>window.dashboardxStore.workspace.id);
  assert.notEqual(streetId,homeId);
  assert.equal(await page.locator('#workspace-tabs .workspace-tile').count(),2);

  // New workspaces don't automatically contain Settings, so their always-on
  // 3D HUD selector is essential to avoid trapping users in a blank room.
  assert.equal(await page.locator(settings).count(),0);
  await page.locator('#spatial-toggle').click();
  await page.waitForSelector('#spatial-preview [data-spatial="workspace"]');
  assert.equal(await page.locator('#spatial-preview [data-spatial="workspace"] option').count(),2);
  const initialSpatial=await page.locator('#spatial-preview [data-spatial="workspace"]').inputValue();
  assert.equal(initialSpatial,streetId);
  await page.locator('#spatial-preview [data-spatial="workspace-new"]').click();
  await page.waitForFunction(()=>window.dashboardxStore.workspace.name==='Кафе');
  await page.waitForFunction(()=>document.querySelector('#spatial-preview [data-spatial="workspace"]')?.value===window.dashboardxStore.workspace.id,{timeout:20000});
  assert.equal(await page.locator('#spatial-preview [data-spatial="workspace"] option').count(),3);

  // Switching in 3D keeps the user in 3D and restores the Settings widget.
  await page.locator('#spatial-preview [data-spatial="workspace"]').selectOption(homeId);
  await page.waitForFunction(()=>window.dashboardxStore.workspace.id==='home');
  await page.waitForFunction(()=>
    document.querySelector('#spatial-preview [data-spatial="workspace"]')?.value==='home' &&
    !!document.querySelector('#spatial-preview widget-element[data-widget-type="dashboardSettings"]')
  ,{timeout:20000});
  assert.equal(await page.locator('#spatial-preview [data-spatial="workspace"] option').count(),3);

  // The real Settings window remains interactive as a CSS3D panel.
  const glassSettings='#spatial-preview widget-element[data-widget-type="dashboardSettings"]';
  assert.equal(await page.locator(glassSettings+' [data-role="settings-workspace"]').count(),9);
  await page.locator(glassSettings+' [data-role="settings-workspace"][data-action="rename"]').nth(1).click();
  await page.waitForFunction(()=>window.dashboardxStore.state.workspaces.some(w=>w.name==='Улица'));
  await page.waitForFunction(()=>document.querySelector('#spatial-preview [data-spatial="workspace"] option')?.textContent!==undefined);
  assert.equal(await page.locator('#spatial-preview [data-spatial="workspace"] option').count(),3);

  // The same widget ID can have a different pose in each work context.
  const settingsId=await page.evaluate(()=>
    document.querySelector('#spatial-preview widget-element[data-widget-type="dashboardSettings"]').id
  );
  // Change rotation X for home without affecting its Desktop position.
  await page.locator('#spatial-preview [data-spatial="select"]').selectOption(settingsId);
  await page.locator('#spatial-preview [data-spatial="rotate-x"]').fill('25');
  await page.locator('#spatial-preview [data-spatial="rotate-x"]').dispatchEvent('change');
  const poseHome=await page.evaluate(id=>JSON.parse(
    localStorage.getItem('dashboardx:spatial:v1:'+id)),settingsId);
  assert.ok(Math.abs(poseHome.rotation[0]-25*Math.PI/180)<.001);
  const namedStreet=await page.evaluate(()=>window.dashboardxStore.state.workspaces.find(w=>w.name==='Улица').id);
  await page.evaluate(({id,space})=>
    window.dashboardxStore.showInstance(id,space),{id:settingsId,space:namedStreet});
  await page.locator('#spatial-preview [data-spatial="workspace"]').selectOption(namedStreet);
  await page.waitForFunction(space=>
    document.querySelector('#spatial-preview [data-spatial="workspace"]')?.value===space &&
    !!document.querySelector('#spatial-preview widget-element[data-widget-type="dashboardSettings"]')
  ,namedStreet,{timeout:20000});
  await page.locator('#spatial-preview [data-spatial="select"]').selectOption(settingsId);
  const pitch=Number(await page.locator('#spatial-preview [data-spatial="rotate-x"]').inputValue());
  assert.equal(pitch,0,'Shared widget starts with separate pose in another workspace');
  await page.locator('#spatial-preview [data-spatial="rotate-x"]').fill('-15');
  await page.locator('#spatial-preview [data-spatial="rotate-x"]').dispatchEvent('change');
  const newPose=await page.evaluate(({id,space})=>JSON.parse(localStorage.getItem(
    'dashboardx:spatial:v1:'+space+'__'+id
  )),{id:settingsId,space:namedStreet});
  assert.ok(Math.abs(newPose.rotation[0]+15*Math.PI/180)<.001);
  const homeUnchanged=await page.evaluate(id=>JSON.parse(
    localStorage.getItem('dashboardx:spatial:v1:'+id)),settingsId);
  assert.equal(homeUnchanged.rotation[0],poseHome.rotation[0]);

  // A mirrored 'Spatial 3D' button in Settings can close the room.
  await page.locator(glassSettings+' [data-section="interface"] > summary').click();
  await page.locator(glassSettings+' [data-role="settings-action"][data-action="spatial"]').click();
  await page.waitForFunction(()=>!document.querySelector('#spatial-preview'));
  assert.equal(await page.locator(settings).count(),1);
  assert.deepEqual(errors,[],'No client errors from mode/workspace changes');
  console.log('Settings Hub browser OK: folds, real toolbar, Home/Street/Cafe, 3D switch, independent poses');
} catch(err) {
  console.error('Settings Hub browser failed:',err);
  try {console.error(await page?.evaluate(()=>({
    active:window.dashboardxStore?.workspace?.name,
    spatial:!!document.getElementById('spatial-preview'),
    settings:document.querySelectorAll('widget-element[data-widget-type="dashboardSettings"]').length
  })));}catch{}
  process.exitCode=1;
} finally {await browser.close();}
