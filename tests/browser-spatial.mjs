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
  // Horizon AR design must load LAST and expose accessible dark + light
  // palettes across the whole Desktop without mutating window geometry.
  const horizonDark=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement);
    const body=getComputedStyle(document.body);
    const top=getComputedStyle(document.querySelector('#app-toolbar'));
    const panel=getComputedStyle(document.querySelector('#workspace-surface > widget-element'));
    const hasHorizon=[...document.styleSheets].some(sheet=>
      sheet.href?.includes('ar-horizon.css'));
    return {
      hasHorizon,theme:document.documentElement.dataset.theme,
      accent:root.getPropertyValue('--dx-horizon-cyan').trim(),
      bgImage:body.backgroundImage,
      panelBg:panel.backgroundColor,
      panelBlur:panel.backdropFilter,
      topBg:top.backgroundColor,
      topBlur:top.backdropFilter
    };
  });
  assert.ok(horizonDark.hasHorizon,'AR stylesheet must be loaded');
  assert.equal(horizonDark.theme,'dark');
  assert.equal(horizonDark.accent,'#80e6f1');
  assert.match(horizonDark.bgImage,/repeating-linear-gradient/);
  assert.match(horizonDark.panelBg,/rgba\(/,'Desktop widgets should use translucent glass backgrounds');
  assert.notEqual(horizonDark.panelBlur,'none','Desktop should blur through glass');
  assert.notEqual(horizonDark.topBlur,'none','Header should blur through glass');


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

  // Ensure this is an actual furnished 3D environment, not a flat empty
  // colored background with widgets. Validate WebGL geometry or CSS3D fallback.
  const room=await page.evaluate(()=>{
    const stage=document.querySelector('#spatial-preview [data-spatial="stage"]');
    return {
      mode:stage.dataset.roomRenderer,
      parts:Number(stage.dataset.roomParts),
      triangles:Number(stage.dataset.roomTriangles||0),
      status:document.querySelector('[data-spatial="room-status"]')?.textContent,
      roomToggle:document.querySelector('[data-spatial="room"]')?.getAttribute('aria-pressed'),
      fallbackWalls:document.querySelectorAll('.spatial-css-room').length
    };
  });
  assert.ok(['webgl','css3d'].includes(room.mode),'Room renderer must be chosen');
  assert.ok(room.parts>=5,'The virtual room must contain floor, ceiling and walls');
  assert.equal(room.roomToggle,'true','Virtual room is enabled by default');
  assert.match(room.status,/комнат/i,'Room status should be visible');
  if(room.mode==='webgl') {
    assert.ok(room.triangles>=12,'Room must render real 3D mesh triangles');
  } else {
    assert.ok(room.fallbackWalls>=5,'CSS3D room must have wall/floor/ceiling planes');
  }
  await page.locator('[data-spatial="room"]').click();
  assert.equal(await page.locator('[data-spatial="room"]').getAttribute('aria-pressed'),'false');
  await page.locator('[data-spatial="room"]').click();
  assert.equal(await page.locator('[data-spatial="room"]').getAttribute('aria-pressed'),'true');

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
  assert.match(defaultGlass.color,/rgba\(18, 43, 83, 0\.45\)/);
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
  assert.match(newGlass.background,/rgba\(18, 43, 83, 0\.2\)/);
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
  // Verify that the existing theme toggle produces a legible light
  // atmosphere and never discards the actual widget instances/data.
  await page.locator('#theme-toggle').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  const horizonLight=await page.evaluate(()=>({
    theme:document.documentElement.dataset.theme,
    main:getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim(),
    body:getComputedStyle(document.body).backgroundImage,
    panel:getComputedStyle(document.querySelector('#workspace-surface widget-element[data-widget-type="datetime"]')).backgroundColor,
    sameWidgets:window.__spatialSmokeWidgets.every(widget=>widget.isConnected)
  }));
  assert.equal(horizonLight.theme,'light');
  assert.equal(horizonLight.main,'#142a47');
  assert.match(horizonLight.body,/repeating-linear-gradient/);
  assert.match(horizonLight.panel,/rgba\(/);
  assert.equal(horizonLight.sameWidgets,true);
  await page.locator('#theme-toggle').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
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
