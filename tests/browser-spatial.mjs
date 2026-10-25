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

  // Create a classic widget and a newly added Developer widget through
  // the real built-in manager. This also verifies the Developer category.
  for (const type of ['datetime','githubControl']) {
    const created=await page.evaluate(type=>{
      const manager=document.querySelector('#workspace-surface > widget-element[data-widget-type="add"]');
      const options=[...manager.querySelectorAll('[data-role="type-options"] .dx-picker-option')];
      const option=options.find(el=>el.querySelector('.dx-option-note')?.textContent===type);
      if (!option) return false;
      option.click();
      manager.querySelector('[data-action="create-instance"]').click();
      return true;
    },type);
    assert.equal(created,true,'Widget manager must offer '+type);
    await page.waitForSelector('#workspace-surface > widget-element[data-widget-type="'+type+'"]');
  }
  assert.equal(await page.locator('#workspace-surface > widget-element').count(),3);
  // Configure two deliberately different Desktop sizes: Spatial must inherit both.
  await page.evaluate(()=>{
    const datetime=document.querySelector('#workspace-surface widget-element[data-widget-type="datetime"]');
    const github=document.querySelector('#workspace-surface widget-element[data-widget-type="githubControl"]');
    datetime.style.width='520px'; datetime.style.height='280px'; datetime.saveWidget();
    github.style.width='400px'; github.style.height='320px'; github.saveWidget();
    // Simulate an obsolete oversized 3D pose; its SIZE must not override Desktop.
    localStorage.setItem('dashboardx:spatial:v1:'+datetime.id,JSON.stringify({
      position:[0.5,1.7,-2],rotation:[0,0,0],
      widthMeters:2.9,heightMeters:2.2,anchorId:null
    }));
  });
  const desktopReferences=await page.evaluate(()=>{
    window.__spatialSmokeWidgets=[...document.querySelectorAll('#workspace-surface > widget-element')];
    return window.__spatialSmokeWidgets.map(w=>{
      const rect=w.getBoundingClientRect();
      return {id:w.id,style:w.getAttribute('style'),
        width:Math.round(rect.width),height:Math.round(rect.height)};
    });
  });

  const desktopInfo=await page.evaluate(()=>{
    const widget=document.querySelector('#workspace-surface > widget-element');
    window.__dashboardxSmokeWidget=widget;
    return {id:widget.id,style:widget.getAttribute('style')};
  });

  const desktopAppearance=await page.evaluate(()=>getComputedStyle(
    document.querySelector('#workspace-surface widget-element[data-widget-type="datetime"]')
  ).backgroundColor);
  await page.locator('#spatial-toggle').click();
  await page.waitForSelector('#spatial-preview .spatial-panel widget-element',{timeout:18000});
  assert.equal(await page.locator('#spatial-preview .spatial-panel widget-element').count(),3);
  const spatialInfo=await page.evaluate(()=>{
    const widget=document.querySelector('#spatial-preview .spatial-panel widget-element');
    return {sameWidget:widget===window.__dashboardxSmokeWidget,
      sceneOpen:document.body.classList.contains('dx-spatial-active'),
      widgetId:widget.id,
      managerPresent:Boolean(document.querySelector('#spatial-preview .widget-manager')),
      allLive:window.__spatialSmokeWidgets.every(w=>w.closest('.spatial-panel')),
      hasGitHub:Boolean(document.querySelector('#spatial-preview widget-element[data-widget-type="githubControl"]')),
      hasDateTime:Boolean(document.querySelector('#spatial-preview widget-element[data-widget-type="datetime"]')),
      saveKey:widget.storageKey,
      cssPanel:widget.parentElement.classList.contains('spatial-panel')};
  });
  assert.equal(spatialInfo.sameWidget,true,'The 3D panel must be the original widget object');
  assert.equal(spatialInfo.sceneOpen,true);
  assert.equal(spatialInfo.managerPresent,true);
  assert.equal(spatialInfo.cssPanel,true);
  assert.equal(spatialInfo.allLive,true);
  assert.equal(spatialInfo.hasGitHub,true);
  assert.equal(spatialInfo.hasDateTime,true);
  const defaultGlass=await page.evaluate(()=>{
    const widget=document.querySelector('#spatial-preview widget-element[data-widget-type="datetime"]');
    return {
      color:getComputedStyle(widget).backgroundColor,
      slider:document.querySelector('#spatial-preview [data-spatial="glass"]').value,
      panelAlpha:document.querySelector('#spatial-preview').style.getPropertyValue('--dx-spatial-panel-alpha')
    };
  });
  assert.equal(defaultGlass.slider,'55','Spatial transparency defaults to 55%');
  assert.equal(defaultGlass.panelAlpha,'0.45','Default panel background must be translucent');
  assert.match(defaultGlass.color,/rgba\(30, 41, 51, 0\.45\)/);
  await page.locator('#spatial-preview [data-spatial="glass"]').evaluate(input=>{
    input.value='80';input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const newGlass=await page.evaluate(()=>{
    const widget=document.querySelector('#spatial-preview widget-element[data-widget-type="datetime"]');
    return {
      alpha:document.querySelector('#spatial-preview').style.getPropertyValue('--dx-spatial-panel-alpha'),
      background:getComputedStyle(widget).backgroundColor,
      contentOpacity:getComputedStyle(widget.querySelector('.widget--element--body')).opacity,
      widgetOpacity:getComputedStyle(widget).opacity,
      label:document.querySelector('#spatial-preview [data-spatial="glass-value"]').textContent,
      saved:localStorage.getItem('dashboardx:spatial:glass-transparency:v1')
    };
  });
  assert.equal(newGlass.alpha,'0.2');
  assert.match(newGlass.background,/rgba\(30, 41, 51, 0\.2\)/);
  assert.equal(newGlass.contentOpacity,'1');
  assert.equal(newGlass.widgetOpacity,'1');
  assert.equal(newGlass.label,'80%');
  assert.equal(newGlass.saved,'80');
  const spatialSizes=await page.evaluate(()=>window.__spatialSmokeWidgets.map(w=>({
    id:w.id,width:parseInt(w.parentElement.style.width,10),
    height:parseInt(w.parentElement.style.height,10),
    poseWidth:window.localStorage.getItem('dashboardx:spatial:v1:'+w.id)
  })));
  assert.ok(spatialSizes.every((record,i)=>record.width===desktopReferences[i].width &&
    record.height===desktopReferences[i].height),
    'Every Three.js widget must keep Desktop width AND height');
  assert.equal(
    await page.locator('#spatial-preview input[data-spatial="scale"]').count(),0,
    '3D must not have a second resize control');
  assert.ok((await page.locator('#spatial-preview [data-spatial="desktop-size"]').innerText())
    .includes(desktopReferences[0].width+' × '+desktopReferences[0].height+' px'));
  const datetimePose=await page.evaluate(()=>{
    const id=document.querySelector('#spatial-preview widget-element[data-widget-type="datetime"]').id;
    const object=[...window.document.querySelectorAll('#spatial-preview .spatial-panel')]
      .find(panel=>panel.dataset.spatialId===id);
    return {pose:id,actualWidth:parseInt(object.style.width,10),
      actualHeight:parseInt(object.style.height,10)};
  });
  assert.equal(datetimePose.actualWidth,520);
  assert.equal(datetimePose.actualHeight,280);

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
  const allRestored=await page.evaluate(()=>window.__spatialSmokeWidgets.map(
    w=>({same:w.parentElement?.id==='workspace-surface',style:w.getAttribute('style')})
  ));
  assert.ok(allRestored.every((record,i)=>record.same &&
    record.style===desktopReferences[i].style),'All live original and new widget styles must restore');
  assert.equal(restored.style,desktopInfo.style,'Desktop inline style must not change');
  assert.equal(restored.body,true);
  assert.equal(restored.spatialMode,false);
  assert.equal(restored.spatialMoving,false);
  const restoredAppearance=await page.evaluate(()=>getComputedStyle(
    document.querySelector('#workspace-surface widget-element[data-widget-type="datetime"]')
  ).backgroundColor);
  assert.equal(restoredAppearance,desktopAppearance,'Desktop window background must be unchanged');

  // Resizing Desktop after a first 3D visit must change next 3D visit size,
  // keeping separately saved position/rotation but ignoring old size.
  const secondDesktop=await page.evaluate(()=>{
    const widget=document.querySelector('#workspace-surface widget-element[data-widget-type="datetime"]');
    widget.style.width='590px'; widget.style.height='330px';
    widget.saveWidget();
    const rect=widget.getBoundingClientRect();
    return {width:Math.round(rect.width),height:Math.round(rect.height)};
  });
  await page.locator('#spatial-toggle').click();
  await page.waitForSelector('#spatial-preview .spatial-panel widget-element',{timeout:18000});
  const persistedGlass=await page.evaluate(()=>({
    value:document.querySelector('#spatial-preview [data-spatial="glass"]').value,
    alpha:document.querySelector('#spatial-preview').style.getPropertyValue('--dx-spatial-panel-alpha')
  }));
  assert.deepEqual(persistedGlass,{value:'80',alpha:'0.2'},'Glass setting should persist across 3D sessions');
  const secondSpatial=await page.evaluate(()=>{
    const widget=document.querySelector('#spatial-preview widget-element[data-widget-type="datetime"]');
    return {width:parseInt(widget.parentElement.style.width,10),
      height:parseInt(widget.parentElement.style.height,10)};
  });
  assert.deepEqual(secondSpatial,secondDesktop,'3D size must refresh on every entry');
  await page.locator('#spatial-preview [data-spatial="exit"]').click();
  await page.waitForFunction(()=>!document.getElementById('spatial-preview'));
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
