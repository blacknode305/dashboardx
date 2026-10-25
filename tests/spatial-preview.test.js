import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultSpatialPose, resizeSpatialPose, spatialSizeFromDesktop, SPATIAL_PIXELS_PER_METER } from '../client/js/module/Spatial/SpatialMath.js';
import { saveSpatialLayout, getSpatialLayout } from '../client/js/module/Spatial/SpatialLayout.js';
import { GLASS_STORAGE_KEY, DEFAULT_GLASS_TRANSPARENCY, normalizeGlassTransparency,
  glassBackgroundAlpha, readGlassTransparency, saveGlassTransparency } from '../client/js/module/Spatial/SpatialGlass.js';

const source = path => readFileSync(new URL(path,import.meta.url),'utf8');

test('all default positions are distinct and spatial poses are finite',()=>{
  const poses=Array.from({length:28},(_,i)=>defaultSpatialPose(i));
  assert.equal(new Set(poses.map(p=>p.position.join(','))).size,28);
  for(const p of poses) {
    assert.equal(p.position.length,3);
    assert.ok(p.position.every(Number.isFinite));
    assert.ok(p.widthMeters>0);
  }
  assert.throws(()=>defaultSpatialPose(-1));
});

test('resizing spatial widget keeps proportions without mutating old pose',()=>{
  const pose=defaultSpatialPose(1);
  const resized=resizeSpatialPose(pose,2.16);
  assert.equal(resized.widthMeters,2.16);
  assert.equal(resized.heightMeters,1.68);
  assert.equal(pose.widthMeters,1.08);
  assert.throws(()=>resizeSpatialPose(pose,0));
});

test('live 3D pose saves into separate storage, not desktop layout',()=>{
  const map=new Map();
  const storage={
    getItem:key=>map.get(key)||null,
    setItem:(key,value)=>map.set(key,value),
    removeItem:key=>map.delete(key)
  };
  storage.setItem('dashboardx.layout.ws-1.datetime-000','{"top":"12px","left":"24px"}');
  saveSpatialLayout('datetime-000',defaultSpatialPose(2),storage);
  assert.equal(storage.getItem('dashboardx.layout.ws-1.datetime-000'),'{"top":"12px","left":"24px"}');
  assert.deepEqual(getSpatialLayout('datetime-000',storage).position,defaultSpatialPose(2).position);
});

test('3D mode is lazily loaded so Desktop starts even without Three.js CDN',()=>{
  const index=source('../client/js/index.js');
  assert.match(index,/await import\('\.\/module\/Spatial\/SpatialPreview\.js'\)/);
  const html=source('../index.html');
  assert.match(html,/id="spatial-toggle"/);
  assert.match(html,/type="importmap"/);
  assert.match(html,/three@0\.186\.1/);
});

test('original widget lifecycle and desktop saves guard live spatial move',()=>{
  const widgetBase=source('../client/js/module/WidgetBase.js');
  const widgetElement=source('../client/js/module/WidgetElement.js');
  const spatial=source('../client/js/module/Spatial/SpatialPreview.js');
  assert.match(widgetBase,/if \(this\._spatialMode\) return/);
  assert.match(widgetElement,/if \(this\._spatialMoving\) return/);
  assert.match(spatial,/this\.surface\.append\(widget\)/);
  assert.match(spatial,/this\.cssScene\.add\(object\)/);
  assert.match(spatial,/new CSS3DObject\(panel\)/);
});

test('every original and new widget type shares the live 3D manager',()=>{
  const app=source('../client/js/index.js');
  const classes=source('../client/js/module/WidgetLogic.js');
  assert.match(app,/store\.workspace\.widgets\.forEach/);
  assert.match(app,/makeWidget\(instance\.type/);
  assert.match(classes,/GithubControlWidget: GithubControlWidgetView/);
  assert.match(classes,/DashboardAiWidget: DashboardAiWidgetView/);
  assert.match(app,/if \(spatialPreview\?\.isOpen\) spatialPreview\.close\(\)/);
});

test('Spatial size always derives from actual Desktop pixels, proportion preserved',()=>{
  assert.equal(SPATIAL_PIXELS_PER_METER,400);
  assert.deepEqual(spatialSizeFromDesktop(520,280),{
    widthPx:520,heightPx:280,widthMeters:1.3,heightMeters:0.7
  });
  assert.deepEqual(spatialSizeFromDesktop(600,300),{
    widthPx:600,heightPx:300,widthMeters:1.5,heightMeters:0.75
  });
  assert.throws(()=>spatialSizeFromDesktop(0,300));
  assert.throws(()=>spatialSizeFromDesktop(400,NaN));
});
test('Spatial inspector inherits Desktop dimensions and cannot resize independently',()=>{
  const spatial=source('../client/js/module/Spatial/SpatialPreview.js');
  assert.match(spatial,/widget\.getBoundingClientRect\(\)/);
  assert.match(spatial,/pose\.widthMeters = desktopSize\.widthMeters/);
  assert.match(spatial,/pose\.heightMeters = desktopSize\.heightMeters/);
  assert.match(spatial,/panel\.style\.width = desktopSize\.widthPx/);
  assert.match(spatial,/panel\.style\.height = desktopSize\.heightPx/);
  assert.match(spatial,/\[data-spatial="desktop-size"\]/);
  assert.doesNotMatch(spatial,/data-spatial="scale"/);
});

test('spatial glass background transparency normalizes safely and remembers value',()=>{
  const data=new Map();
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(DEFAULT_GLASS_TRANSPARENCY,55);
  assert.equal(readGlassTransparency(storage),55);
  assert.equal(glassBackgroundAlpha(55),.45);
  assert.equal(glassBackgroundAlpha(90),.1);
  assert.equal(glassBackgroundAlpha(0),1);
  assert.equal(normalizeGlassTransparency(66),65);
  assert.equal(normalizeGlassTransparency(-20),0);
  assert.equal(normalizeGlassTransparency(200),90);
  saveGlassTransparency(75,storage);
  assert.equal(data.get(GLASS_STORAGE_KEY),'75');
  assert.equal(readGlassTransparency(storage),75);
  data.set(GLASS_STORAGE_KEY,'invalid');
  assert.equal(readGlassTransparency(storage),55);
});

test('only Spatial widget backgrounds use glass alpha, not whole-widget opacity',()=>{
  const spatial=source('../client/js/module/Spatial/SpatialPreview.js');
  const css=source('../client/css/spatial-preview.css');
  assert.match(spatial,/data-spatial="glass"/);
  assert.match(spatial,/readGlassTransparency\(\)/);
  assert.match(spatial,/saveGlassTransparency\(percent\)/);
  assert.match(css,/background:rgba\(30,41,51,var\(--dx-spatial-panel-alpha/);
  assert.match(css,/\.widget--element--body[\s\S]*?background:transparent!important/);
  assert.doesNotMatch(css,/\.spatial-panel\s*\{[^}]*\bopacity\s*:/);
});
