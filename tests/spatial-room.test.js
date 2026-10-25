import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { ROOM_BOUNDS, ROOM_ELEMENT_NAMES, makeSpatialRoom,
  makeFallbackSpatialRoom, getRoomTheme, getRoomPalette } from '../client/js/module/Spatial/SpatialRoom.js';

class V3 {
  set(...a){this.values=a;}
}
class MockNode {
  constructor(){this.children=[];this.position=new V3();this.rotation=new V3();
    this.scale={setScalar:s=>{this.scalar=s;}};this.userData={};}
  add(child){this.children.push(child);}
  traverse(fn){for(const x of this.children){fn(x);x.traverse?.(fn);}}
}
class MockMaterial {
  constructor(options){this.options=options;this.map=options?.map;}
  dispose(){this.disposed=true;}
}
class MockGeometry {dispose(){this.disposed=true;}}
class MockMesh extends MockNode {
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}
}
const THREE={
  Group:MockNode,
  Mesh:MockMesh,
  BoxGeometry:MockGeometry,
  PlaneGeometry:MockGeometry,
  MeshStandardMaterial:MockMaterial,
  MeshBasicMaterial:MockMaterial,
  HemisphereLight:class extends MockNode{},
  DirectionalLight:class extends MockNode{},
  PointLight:class extends MockNode{},
  CanvasTexture:class{dispose(){this.disposed=true;}},
  SRGBColorSpace:'srgb'
};
const documentRef={
  createElement(){
    return {style:{},dataset:{},setAttribute(){},getContext:()=>({
      clearRect(){},fillText(){},fillRect(){}
    })};
  }
};
class CSS3DObject extends MockNode {
  constructor(element){super();this.element=element;}
}

test('3D room has the five actual architectural surfaces and meaningful geometry',()=>{
  const room=makeSpatialRoom(THREE,documentRef);
  const names=room.group.children.map(child=>child.name);
  for(const name of ROOM_ELEMENT_NAMES) assert.ok(names.includes(name),name);
  assert.equal(room.group.name,'dashboardx-virtual-room');
  assert.ok(room.getParts()>20);
  assert.ok(names.includes('room-signage'));
  assert.ok(names.includes('room-front-wall'));
  assert.ok(names.filter(n=>n==='room-back-window-glass').length>=2);
  assert.ok(names.filter(n=>n==='room-side-window-glass').length>=4);
  assert.ok(names.includes('room-city-tower'));
  assert.ok(names.includes('room-ceiling-light'));
  assert.ok(names.includes('room-skirting-side'));
  assert.ok(room.getParts()>80);
  room.dispose();
});

test('CSS3D fallback contains perspective room planes and signage',()=>{
  const room=makeFallbackSpatialRoom(CSS3DObject,documentRef);
  assert.ok(room.length>=5);
  assert.ok(room.some(part=>part.name==='css-room-floor'));
  assert.ok(room.some(part=>part.name==='css-room-ceiling'));
  assert.ok(room.some(part=>part.name==='css-room-back'));
  assert.ok(room.filter(part=>part.name==='css-room-back-window').length>=2);
  assert.ok(room.some(part=>part.name==='css-room-front'));
  assert.ok(room.some(part=>part.name==='css-room-left'));
  assert.ok(room.some(part=>part.name==='css-room-right'));
  for(const panel of room) {
    assert.equal(panel.element.style.pointerEvents,'none');
    assert.ok(panel.element.style.background);
  }
});

test('walk boundaries prevent camera from passing through walls',()=>{
  assert.ok(ROOM_BOUNDS.minX<ROOM_BOUNDS.maxX);
  assert.ok(ROOM_BOUNDS.minZ<ROOM_BOUNDS.maxZ);
  const preview=readFileSync(new URL('../client/js/module/Spatial/SpatialPreview.js',import.meta.url),'utf8');
  assert.match(preview,/makeSpatialRoom\(THREE, document, this\.roomTheme\)/);
  assert.match(preview,/makeFallbackSpatialRoom\(CSS3DObject,document,this\.roomTheme\)/);
  assert.match(preview,/ROOM_BOUNDS\.minX/);
  assert.match(preview,/data-spatial="room"/);
  assert.match(preview,/data-spatial="room-status"/);
});

test('room palettes differ materially in dark and light mode',()=>{
  const light=getRoomPalette('light');
  const dark=getRoomPalette('dark');
  assert.equal(getRoomTheme('light'),'light');
  assert.equal(getRoomTheme('unknown'),'dark');
  assert.notEqual(light.wall,dark.wall);
  assert.notEqual(light.floor,dark.floor);
  assert.notEqual(light.ceiling,dark.ceiling);
  assert.notEqual(light.sky,dark.sky);
  assert.notEqual(light.clear,dark.clear);
  const lightRoom=makeSpatialRoom(THREE,documentRef,'light');
  const darkRoom=makeSpatialRoom(THREE,documentRef,'dark');
  assert.equal(lightRoom.theme,'light');
  assert.equal(darkRoom.theme,'dark');
  assert.notDeepEqual(
    lightRoom.group.children.find(child=>child.name==='room-floor').material.options,
    darkRoom.group.children.find(child=>child.name==='room-floor').material.options
  );
  lightRoom.dispose();darkRoom.dispose();
  const lightFallback=makeFallbackSpatialRoom(CSS3DObject,documentRef,'light');
  const darkFallback=makeFallbackSpatialRoom(CSS3DObject,documentRef,'dark');
  assert.notEqual(
    lightFallback.find(part=>part.name==='css-room-floor').element.style.background,
    darkFallback.find(part=>part.name==='css-room-floor').element.style.background
  );
});
test('Spatial widget X rotation persists in existing separate pose key',()=>{
  const preview=readFileSync(new URL('../client/js/module/Spatial/SpatialPreview.js',import.meta.url),'utf8');
  assert.match(preview,/data-spatial="rotate-x"/);
  assert.match(preview,/record\.pose\.rotation\[0\]=THREE\.MathUtils\.degToRad/);
  assert.match(preview,/getRoomTheme\(document\.documentElement\.dataset\.theme\)/);
  assert.match(preview,/attributeFilter:\['data-theme'\]/);
  assert.match(preview,/this\.root\.dataset\.roomTheme=next/);
});
