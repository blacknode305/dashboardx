import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser=await chromium.launch({
  executablePath:process.env.CHROME_BIN || '/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']
});
let failed=false;
let page;
try {
  page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR:',e.message);});
  page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE:',m.text());});
  page.on('requestfailed',r=>console.error('REQUEST FAILED:',r.url(),r.failure()?.errorText));
  page.on('dialog',async d=>{console.error('DIALOG:',d.message());await d.dismiss();});
  await page.goto('http://127.0.0.1:8787/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#workspace-surface > widget-element',{timeout:30000});
  await page.waitForFunction(()=>Array.isArray(window.dashboardxTemplates) &&
    window.dashboardxTemplates.length===28,{timeout:30000});
  const count=await page.locator('template[data-widget]').count();
  assert.equal(count,28,'All 28 templates must be loaded');

  const desktopInfo=await page.evaluate(()=>{
    const widget=document.querySelector('#workspace-surface > widget-element');
    window.__dashboardxSmokeWidget=widget;
    return {id:widget.id,style:widget.getAttribute('style')};
  });

  await page.locator('#spatial-toggle').click();
  await page.waitForSelector('#spatial-preview .spatial-panel widget-element',{timeout:18000});
  const spatialInfo=await page.evaluate(()=>{
    const widget=document.querySelector('#spatial-preview .spatial-panel widget-element');
    return {sameWidget:widget===window.__dashboardxSmokeWidget,
      sceneOpen:document.body.classList.contains('dx-spatial-active'),
      widgetId:widget.id,
      managerPresent:Boolean(document.querySelector('#spatial-preview .widget-manager')),
      saveKey:widget.storageKey,
      cssPanel:widget.parentElement.classList.contains('spatial-panel')};
  });
  assert.equal(spatialInfo.sameWidget,true,'The 3D panel must be the original widget object');
  assert.equal(spatialInfo.sceneOpen,true);
  assert.equal(spatialInfo.managerPresent,true);
  assert.equal(spatialInfo.cssPanel,true);

  await page.locator('#spatial-preview [data-spatial="x"]').fill('1.7');
  await page.locator('#spatial-preview [data-spatial="x"]').dispatchEvent('change');
  const savedPose=await page.evaluate(id=>localStorage.getItem('dashboardx:spatial:v1:'+id),desktopInfo.id);
  assert.equal(JSON.parse(savedPose).position[0],1.7,'Spatial coordinates should be saved');
  await page.locator('#spatial-preview [data-spatial="exit"]').click();
  await page.waitForFunction(()=>!document.getElementById('spatial-preview'));
  const restored=await page.evaluate(()=>{
    const widget=document.querySelector('#workspace-surface > widget-element');
    return {same:widget===window.__dashboardxSmokeWidget,
      style:widget.getAttribute('style'),body:Boolean(widget.querySelector('.widget-manager')),
      spatialMoving:widget._spatialMoving,
      spatialMode:widget._spatialMode};
  });
  assert.equal(restored.same,true,'Exactly the same DOM instance must return');
  assert.equal(restored.style,desktopInfo.style,'Desktop inline style must not change');
  assert.equal(restored.body,true);
  assert.equal(restored.spatialMode,false);
  assert.equal(restored.spatialMoving,false);
  assert.equal(errors.length,0,'No page errors: '+errors.join('; '));
  console.log('Browser Spatial smoke OK: 28 templates, same widget live, saved XYZ, Desktop restored');
} catch(error) {
  failed=true;
  console.error('Browser Spatial smoke failed:',error);
  try {
    console.error('SPATIAL STATE:', await page.evaluate(()=>({
      hasRoot:!!document.getElementById('spatial-preview'),
      panels:document.querySelectorAll('#spatial-preview .spatial-panel').length,
      button:document.querySelector('#spatial-toggle')?.textContent,
      pressed:document.querySelector('#spatial-toggle')?.getAttribute('aria-pressed'),
      canvas:document.querySelector('#workspace-canvas')?.getBoundingClientRect().toJSON(),
      spatialRoot:document.querySelector('#spatial-preview')?.outerHTML.slice(0,750)
    })));
  } catch(e) { console.error('Diagnostics unavailable:',e.message); }
} finally {
  await browser.close();
}
if (failed) process.exitCode=1;
