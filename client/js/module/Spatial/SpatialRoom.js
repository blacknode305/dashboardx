/**
 * Lightweight virtual urban studio for Spatial Preview.
 * All geometry and textures are procedural: no paid assets or network models.
 * Built as Three.js meshes; optional CSS3D room if browser WebGL is unavailable.
 */
export const ROOM_BOUNDS = Object.freeze({ minX:-4.0, maxX:4.0, minZ:-4.6, maxZ:1.4 });
export const ROOM_ELEMENT_NAMES = Object.freeze([
  'room-floor','room-ceiling','room-back-wall','room-left-wall','room-right-wall'
]);

export function makeSpatialRoom(THREE, documentRef = document) {
  const group = new THREE.Group();
  group.name = 'dashboardx-virtual-room';
  group.userData.dashboardxRoom = true;
  const walls = new THREE.MeshStandardMaterial({color:0x202f59,roughness:.96,metalness:0});
  const floorMat = new THREE.MeshStandardMaterial({color:0x142e4a,roughness:.91,metalness:.04});
  const roofMat = new THREE.MeshStandardMaterial({color:0x131d3e,roughness:.96});
  const beamMat = new THREE.MeshStandardMaterial({color:0x385779,roughness:.85,metalness:.07});
  const accentMat = new THREE.MeshStandardMaterial({color:0x62c3cf,roughness:.72,metalness:.09});
  const windowMat = new THREE.MeshBasicMaterial({color:0x183457});
  const windowGlint = new THREE.MeshBasicMaterial({color:0x5796b4});
  const materialSet = [walls,floorMat,roofMat,beamMat,accentMat,windowMat,windowGlint];
  const geometrySet = [];
  const addBox = (name,width,height,depth,x,y,z,material) => {
    const geo = new THREE.BoxGeometry(width,height,depth);
    geometrySet.push(geo);
    const mesh = new THREE.Mesh(geo,material);
    mesh.name = name;
    mesh.position.set(x,y,z);
    group.add(mesh);
    return mesh;
  };
  // Inside a real architectural volume, facing toward the back wall (-Z).
  // Room height 4.6m, width 11.6m, depth 17m: window panels stay far
  // behind all default widget poses (around Z=-2).
  addBox('room-floor',11.6,.12,17.2,0,-.10,-2.0,floorMat);
  addBox('room-ceiling',11.6,.14,17.2,0,4.60,-2.0,roofMat);
  addBox('room-back-wall',11.6,4.66,.14,0,2.30,-10.55,walls);
  addBox('room-left-wall',.14,4.66,17.2,-5.80,2.30,-2.0,walls);
  addBox('room-right-wall',.14,4.66,17.2,5.80,2.30,-2.0,walls);

  // Floor tiling reads from the camera, not just as a flat void.
  for(let x=-5.25;x<=5.25;x+=1.5)
    addBox('room-floor-seam-x',.016,.007,16,x,-.034,-2.0,beamMat);
  for(let z=-9.8;z<=5.8;z+=1.5)
    addBox('room-floor-seam-z',11.35,.007,.015,0,-.034,z,beamMat);

  // Corner pillars and window-side structure.
  for(const x of [-5.52,5.52]) {
    addBox('room-front-pillar',.22,4.54,.22,x,2.27,5.90,beamMat);
    addBox('room-back-pillar',.22,4.54,.24,x,2.27,-10.40,beamMat);
  }
  for(const x of [-3.92,3.92]){
    addBox('room-wall-art-frame',2.68,2.45,.055,x,2.46,-10.36,beamMat);
    addBox('room-wall-art-glass',2.46,2.23,.018,x,2.46,-10.32,windowMat);
    addBox('room-window-vertical',.045,2.18,.03,x,2.46,-10.29,accentMat);
    addBox('room-window-horizontal',2.42,.045,.03,x,2.46,-10.29,accentMat);
    // Fake reflections: understated reflections, not neon decoration.
    addBox('room-window-reflection',1.95,.055,.008,x,3.22,-10.27,windowGlint);
  }
  // Central architectural board behind the main panel row.
  addBox('room-brand-board',3.92,1.55,.05,0,2.52,-10.35,
    new THREE.MeshStandardMaterial({color:0x152b53,roughness:.72}));
  addBox('room-brand-top',4.04,.037,.10,0,3.31,-10.28,accentMat);
  addBox('room-brand-bottom',4.04,.037,.10,0,1.73,-10.28,beamMat);
  for(const z of [-7.5,-4.2,-.9,2.4]){
    addBox('room-ceiling-crossbeam',11.38,.14,.18,0,4.45,z,beamMat);
    for(const x of [-3.65,0,3.65])
      addBox('room-ceiling-light',1.3,.035,.07,x,4.34,z,
        new THREE.MeshBasicMaterial({color:0xb5e5f0}));
  }
  // Human-scale desk silhouettes along the sides, leaving widget field free.
  for(const x of [-4.78,4.78]){
    addBox('room-side-worktop',.88,.06,2.7,x,.75,-4.45,beamMat);
    for(const z of [-5.55,-3.35])
      addBox('room-worktop-leg',.065,.74,.07,x,.37,z,beamMat);
  }

  const logoCanvas = documentRef.createElement('canvas');
  logoCanvas.width=960; logoCanvas.height=300;
  const ctx=logoCanvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0,0,960,300);
    ctx.textAlign='center';
    ctx.fillStyle='#e1f4ff';
    ctx.font='600 91px system-ui, sans-serif';
    ctx.fillText('DashboardX',480,132);
    ctx.font='500 30px system-ui, sans-serif';
    ctx.fillStyle='#8ecfe2';
    ctx.fillText('SPATIAL WORKSPACE   /   BLACKNODE305',480,202);
    ctx.fillStyle='#67bfda';
    ctx.fillRect(275,230,410,3);
    const texture=new THREE.CanvasTexture(logoCanvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    materialSet.push(new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    const geo=new THREE.PlaneGeometry(3.63,1.13);
    geometrySet.push(geo);
    const plaque=new THREE.Mesh(geo,materialSet.at(-1));
    plaque.name='room-signage';
    plaque.position.set(0,2.49,-10.308);
    group.add(plaque);
  }

  group.add(new THREE.HemisphereLight(0xb3dcef,0x13274a,2.2));
  const key = new THREE.DirectionalLight(0xd5e8ff,2.0);
  key.position.set(-4,4,3);
  group.add(key);
  const fill = new THREE.PointLight(0x9ccbf2,20,14,2);
  fill.position.set(3,3,0);
  group.add(fill);

  const originalDispose = () => {
    geometrySet.forEach(geo=>geo.dispose());
    materialSet.forEach(mat=>{
      if(mat.map) mat.map.dispose();
      mat.dispose();
    });
    group.traverse(child=>{
      if(child.material&&!materialSet.includes(child.material)){
        if(child.material.map)child.material.map.dispose();
        child.material.dispose();
      }
    });
  };
  return {group, dispose:originalDispose,
    getParts:()=>group.children.filter(child=>child.isMesh).length};
}

/**
 * CSS3D fallback when WebGL is blocked by browser policy or GPU settings.
 * Still a perspective room with actual wall/floor planes, not a 2D wallpaper.
 */
export function makeFallbackSpatialRoom(CSS3DObject, documentRef=document) {
  const cssObjects=[];
  const addPlane=(name,w,h,position,rotation,background)=>{
    const el=documentRef.createElement('div');
    el.className='spatial-css-room';
    el.setAttribute('aria-hidden','true');
    el.dataset.roomPart=name;
    el.style.width=w+'px';
    el.style.height=h+'px';
    el.style.background=background;
    el.style.boxSizing='border-box';
    el.style.pointerEvents='none';
    el.style.backfaceVisibility='visible';
    const object=new CSS3DObject(el);
    object.name=name;
    object.position.set(...position);
    object.rotation.set(...rotation);
    object.scale.setScalar(1/400);
    cssObjects.push(object);
    return object;
  };
  addPlane('css-room-back',4640,1860,[0,2.3,-10.45],[0,0,0],
    'linear-gradient(90deg,#284367 0%,#172c52 28%,#202b60 70%,#284367 100%)');
  addPlane('css-room-left',6840,1860,[-5.74,2.3,-2],[0,Math.PI/2,0],
    'repeating-linear-gradient(90deg,#233d66 0px,#233d66 680px,#1e315a 688px,#2c476a 697px)');
  addPlane('css-room-right',6840,1860,[5.74,2.3,-2],[0,-Math.PI/2,0],
    'repeating-linear-gradient(90deg,#233d66 0px,#233d66 680px,#1e315a 688px,#2c476a 697px)');
  addPlane('css-room-floor',4640,6880,[0,-.03,-2],[-Math.PI/2,0,0],
    'repeating-linear-gradient(0deg,transparent 0px,transparent 598px,#5083a1 601px),' +
    'repeating-linear-gradient(90deg,#142c4f 0px,#142c4f 598px,#5083a1 601px)');
  addPlane('css-room-ceiling',4640,6880,[0,4.6,-2],[Math.PI/2,0,0],
    'linear-gradient(90deg,#131f46,#314877,#131f46)');
  addPlane('css-room-signage',1480,390,[0,2.47,-10.33],[0,0,0],
    'linear-gradient(90deg,#1d3158,#345777,#1d3158)');
  const label=cssObjects.at(-1).element;
  label.textContent='DashboardX   /   SPATIAL WORKSPACE';
  Object.assign(label.style,{
    color:'#e2f8ff',display:'flex',alignItems:'center',justifyContent:'center',
    border:'8px solid #65c7d8',font:'600 82px system-ui',letterSpacing:'6px'
  });
  return cssObjects;
}
