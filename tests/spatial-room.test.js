import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { ROOM_BOUNDS, ROOM_ELEMENT_NAMES, makeSpatialRoom,
  makeFallbackSpatialRoom } from '../client/js/module/Spatial/SpatialRoom.js';

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
  room.dispose();
});

test('CSS3D fallback contains perspective room planes and signage',()=>{
  const room=makeFallbackSpatialRoom(CSS3DObject,documentRef);
  assert.ok(room.length>=5);
  assert.ok(room.some(part=>part.name==='css-room-floor'));
  assert.ok(room.some(part=>part.name==='css-room-ceiling'));
  assert.ok(room.some(part=>part.name==='css-room-back'));
  for(const panel of room) {
    assert.equal(panel.element.style.pointerEvents,'none');
    assert.ok(panel.element.style.background);
  }
});

test('walk boundaries prevent camera from passing through walls',()=>{
  assert.ok(ROOM_BOUNDS.minX<ROOM_BOUNDS.maxX);
  assert.ok(ROOM_BOUNDS.minZ<ROOM_BOUNDS.maxZ);
  const preview=readFileSync(new URL('../client/js/module/Spatial/SpatialPreview.js',import.meta.url),'utf8');
  assert.match(preview,/makeSpatialRoom\(THREE, document\)/);
  assert.match(preview,/makeFallbackSpatialRoom\(CSS3DObject,document\)/);
  assert.match(preview,/ROOM_BOUNDS\.minX/);
  assert.match(preview,/data-spatial="room"/);
  assert.match(preview,/data-spatial="room-status"/);
});
