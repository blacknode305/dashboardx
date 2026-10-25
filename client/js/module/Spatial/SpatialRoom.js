/**
 * DashboardX's self-contained architectural 3D studio.
 * No external textures or assets. Real window OPENINGS, visible sky/city
 * behind glazing, four walls, ceiling, floor, frames and furniture.
 * Light/dark modes follow the Desktop theme.
 */
export const ROOM_BOUNDS=Object.freeze({minX:-3.8,maxX:3.8,minZ:-4.6,maxZ:1.3});
export const ROOM_ELEMENT_NAMES=Object.freeze([
  'room-floor','room-ceiling','room-back-wall','room-left-wall','room-right-wall',
  'room-front-wall','room-back-window-glass','room-side-window-glass'
]);
export const ROOM_THEMES=Object.freeze({
  dark:Object.freeze({
    wall:0x1c3052,wallEdge:0x2b4465,floor:0x142842,ceiling:0x0f203b,
    frame:0x406485,accent:0x73cddf,interior:0x21365d,
    sky:0x244a7c,skyUpper:0x142c56,building:0x172b4a,buildingAlt:0x315479,
    glass:0x79b6d2,light:0xd5e9ff,ambient:0xb2d1fa,ground:0x10203c,
    line:0x395879,sign:'#e4f5ff',subtitle:'#9bcfdf',
    clear:0x09152c,fog:0x0f2340
  }),
  light:Object.freeze({
    wall:0xd8e7f2,wallEdge:0xadc9d9,floor:0xb9d3e2,ceiling:0xf1f6fa,
    frame:0x7c9eb6,accent:0x4c9fb8,interior:0xdeeaf5,
    sky:0x80c4e9,skyUpper:0xbedff4,building:0x799eb5,buildingAlt:0x9dbdcc,
    glass:0xc4eafb,light:0xfffcdf,ambient:0xf1faff,ground:0xbed7e7,
    line:0x9cb8cc,sign:'#1a4665',subtitle:'#40758f',
    clear:0xd9eaf4,fog:0xc7e1ee
  })
});
export function getRoomTheme(theme) {
  return theme==='light' ? 'light' : 'dark';
}
export function getRoomPalette(theme) {
  return ROOM_THEMES[getRoomTheme(theme)];
}
const FRONT_Z=6.53, BACK_Z=-10.53, SIDE_X=5.72;
const WIN_BOTTOM=1.12,WIN_TOP=3.70;
const WIN_HEIGHT=WIN_TOP-WIN_BOTTOM;
const WIN_MID=(WIN_TOP+WIN_BOTTOM)/2;
const WINDOW_WIDTH=2.60;

/** Creates native Three.js geometry; caller must dispose after theme changes. */
export function makeSpatialRoom(THREE,doc=document,theme='dark'){
  const palette=getRoomPalette(theme);
  const group=new THREE.Group();
  group.name='dashboardx-virtual-room';
  group.userData={dashboardxRoom:true,theme:getRoomTheme(theme)};
  const geos=[],materials=[];
  const mat=(color,extra={},basic=false)=>{
    const value=new (basic?THREE.MeshBasicMaterial:THREE.MeshStandardMaterial)(
      {color,roughness:.88,metalness:0,...extra}
    );
    materials.push(value);return value;
  };
  const wall=mat(palette.wall),floor=mat(palette.floor),roof=mat(palette.ceiling);
  const frame=mat(palette.frame,{roughness:.55,metalness:.15});
  const edge=mat(palette.wallEdge);
  const accent=mat(palette.accent,{roughness:.5,metalness:.1});
  const furniture=mat(palette.interior);
  const sky=mat(palette.sky,{},true);
  const skyUpper=mat(palette.skyUpper,{},true);
  const skyline=mat(palette.building,{},true);
  const skylineAlt=mat(palette.buildingAlt,{},true);
  const glass=mat(palette.glass,{transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide},true);
  const lamp=mat(palette.light,{},true);
  const put=(name,w,h,d,x,y,z,material)=>{
    const geometry=new THREE.BoxGeometry(w,h,d);geos.push(geometry);
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=name;mesh.position.set(x,y,z);group.add(mesh);return mesh;
  };

  // Six sides, with real apertures (not an opaque wall behind painted windows).
  put('room-floor',11.6,.12,17.2,0,-.10,-2.0,floor);
  put('room-ceiling',11.6,.13,17.2,0,4.58,-2.0,roof);

  // Rear wall: solid lintel & sill plus posts around two window apertures.
  put('room-back-wall',11.6,.88,.15,0,4.14,BACK_Z,wall);
  put('room-back-wall-sill',11.6,1.12,.15,0,.56,BACK_Z,wall);
  for(const [x,w] of [[-5.47,.66],[-1.275,2.55],[1.275,2.55],[5.47,.66]]){
    put('room-back-wall',w,WIN_HEIGHT,.15,x,WIN_MID,BACK_Z,wall);
  }
  // Center structural slab doubles as a backdrop for the DashboardX sign.
  put('room-brand-board',2.4,1.1,.045,0,2.64,BACK_Z+.095,furniture);

  const createBackWindow=(x,index)=>{
    // The view is BEHIND the actual wall opening, with sky & building parallax.
    put('room-back-window-sky',WINDOW_WIDTH,WIN_HEIGHT,.01,x,WIN_MID,BACK_Z-.22,sky);
    put('room-back-window-sky-upper',WINDOW_WIDTH,WIN_HEIGHT*.4,.012,
      x,WIN_MID+WIN_HEIGHT*.3,BACK_Z-.207,skyUpper);
    for(let i=0;i<5;i++){
      const w=.34+(i%3)*.08;
      const height=.5+(i*3+index)%5*.24;
      const px=x-1.07+i*.50;
      put('room-city-tower',w,height,.025,px,WIN_BOTTOM+height/2,BACK_Z-.16,
        i%2?skyline:skylineAlt);
      for(let level=0;level<Math.min(5,Math.floor(height/.19));level++){
        put('room-city-window',.018,.035,.028,px,WIN_BOTTOM+.15+level*.19,BACK_Z-.135,lamp);
      }
    }
    put('room-back-window-glass',WINDOW_WIDTH,WIN_HEIGHT,.012,
      x,WIN_MID,BACK_Z+.112,glass);
    put('room-window-frame-top',WINDOW_WIDTH+.12,.07,.13,x,WIN_TOP,BACK_Z+.155,frame);
    put('room-window-frame-bottom',WINDOW_WIDTH+.12,.08,.13,x,WIN_BOTTOM,BACK_Z+.155,frame);
    for(const sign of [-1,1]){
      put('room-window-frame-side',.065,WIN_HEIGHT,.13,
        x+sign*(WINDOW_WIDTH/2),WIN_MID,BACK_Z+.155,frame);
    }
    put('room-window-mullion-v',.045,WIN_HEIGHT,.14,x,WIN_MID,BACK_Z+.16,frame);
    put('room-window-mullion-h',WINDOW_WIDTH,.045,.14,x,2.48,BACK_Z+.16,frame);
    put('room-window-sill',WINDOW_WIDTH+.18,.08,.42,x,WIN_BOTTOM-.03,BACK_Z+.30,edge);
  };
  createBackWindow(-3.84,0);
  createBackWindow(3.84,1);

  // Long side walls with two actual apertures per side, visible when orbiting.
  const sideWindowCenters=[-6.1,-1.4], sideWidth=2.2;
  for(const side of [-1,1]){
    const x=side*SIDE_X;
    const label=side===-1?'room-left-wall':'room-right-wall';
    put(label,.15,.90,17.2,x,4.13,-2,wall);
    put(label,.15,1.12,17.2,x,.56,-2,wall);
    const segs=[[-10.6,-7.2],[-5.0,-2.5],[-.3,6.6]];
    for(const [a,b] of segs){
      put(label,.15,WIN_HEIGHT,b-a,x,WIN_MID,(a+b)/2,wall);
    }
    for(const z of sideWindowCenters){
      put('room-side-window-sky',.012,WIN_HEIGHT,sideWidth, x+side*.24,WIN_MID,z,sky);
      for(let i=0;i<4;i++){
        const h=.62+(i%3)*.27;
        put('room-side-city-tower',.014,h,.30,x+side*.20,WIN_BOTTOM+h/2,
          z-.78+i*.48,i%2?skyline:skylineAlt);
      }
      put('room-side-window-glass',.018,WIN_HEIGHT,sideWidth,
        x-side*.108,WIN_MID,z,glass);
      for(const end of [-1,1])
        put('room-side-frame-vertical',.16,WIN_HEIGHT,.07,
          x-side*.18,WIN_MID,z+end*sideWidth/2,frame);
      put('room-side-frame-horizontal',.16,.045,sideWidth,
        x-side*.18,2.48,z,frame);
      put('room-side-frame-mullion',.16,WIN_HEIGHT,.05,
        x-side*.18,WIN_MID,z,frame);
      put('room-side-sill',.37,.07,sideWidth+.16,
        x-side*.20,WIN_BOTTOM-.025,z,edge);
    }
    for (const z of [-10.4,-7.25,-2.65,2.2,6.35])
      put('room-wall-pillar',.27,4.46,.24,x-side*.05,2.23,z,edge);
  }

  // Fourth wall closes the room behind the starting camera, but a wide
  // central doorway avoids the feeling of being in a sealed cube.
  put('room-front-wall',11.6,1.20,.16,0,4.02,FRONT_Z,wall);
  for(const side of [-1,1])
    put('room-front-wall',4.10,3.42,.16,side*3.75,1.71,FRONT_Z,wall);
  for(const side of [-1,1])
    put('room-entry-column',.17,3.46,.25,side*1.75,1.73,FRONT_Z-.06,frame);
  put('room-entry-lintel',3.7,.12,.28,0,3.48,FRONT_Z-.06,accent);

  // Architectural floor: accessible movement cues, restrained technology.
  for(let x=-5.25;x<5.35;x+=1.5)
    put('room-floor-seam',.016,.007,17,x,-.034,-2,edge);
  for(let z=-10.0;z<6.5;z+=1.5)
    put('room-floor-seam',11.38,.007,.016,0,-.034,z,edge);
  for(const side of [-1,1]){
    put('room-skirting-side',.05,.17,16.9,side*5.63,.085,-2,edge);
    put('room-worktop',.90,.08,2.45,side*4.86,.77,-4.2,furniture);
    for(const z of [-5.23,-3.15])
      put('room-worktop-leg',.07,.73,.07,side*4.86,.38,z,frame);
  }
  put('room-skirting-back',11.4,.17,.05,0,.085,BACK_Z+.12,edge);
  for(const z of [-7.5,-4.2,-.9,2.4]){
    put('room-ceiling-beam',11.35,.16,.20,0,4.43,z,edge);
    for(const x of [-3.5,0,3.5]){
      put('room-ceiling-light',1.18,.04,.14,x,4.31,z,lamp);
      put('room-ceiling-light-frame',1.26,.045,.19,x,4.36,z,frame);
    }
  }
  // True Three.js lights to illuminate both day and night rooms.
  const ambient=new THREE.HemisphereLight(palette.ambient,palette.ground,
    theme==='light'?2.0:1.45);
  group.add(ambient);
  const key=new THREE.DirectionalLight(palette.light,theme==='light'?2.2:1.7);
  key.position.set(-3,4,2);group.add(key);
  const fill=new THREE.PointLight(palette.light,theme==='light'?32:18,18,2);
  fill.position.set(3,3.7,-1);group.add(fill);

  const canvas=doc.createElement('canvas');
  canvas.width=960;canvas.height=300;
  const ctx=canvas.getContext?.('2d');
  if(ctx){
    ctx.clearRect(0,0,960,300);
    ctx.textAlign='center';
    ctx.fillStyle=palette.sign;
    ctx.font='650 82px system-ui, sans-serif';
    ctx.fillText('DashboardX',480,135);
    ctx.font='500 27px system-ui, sans-serif';
    ctx.fillStyle=palette.subtitle;
    ctx.fillText('SPATIAL WORKSPACE  /  BLACKNODE305',480,206);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    const brand=mat(0xffffff,{map:texture,transparent:true,depthWrite:false},true);
    const geo=new THREE.PlaneGeometry(2.15,.83);geos.push(geo);
    const sign=new THREE.Mesh(geo,brand);
    sign.name='room-signage';sign.position.set(0,2.67,BACK_Z+.14);
    group.add(sign);
  }
  return {
    group,
    theme:getRoomTheme(theme),
    getParts:()=>group.children.filter(child=>child.isMesh).length,
    dispose:()=>{
      for(const g of geos)g.dispose();
      for(const m of materials){m.map?.dispose?.();m.dispose();}
    }
  };
}

/**
 * A full CSS3D fallback for browsers where WebGL is unavailable.
 * Room planes have different light/dark palettes, actual window-shaped
 * exterior views and mullions; they never intercept widget interactions.
 */
export function makeFallbackSpatialRoom(CSS3DObject,doc=document,theme='dark') {
  const isLight=getRoomTheme(theme)==='light';
  const c=isLight?{
    wall:'#dceaf5',floor:'#b8d3e3',roof:'#eef5fa',frame:'#7f9fb5',
    skyline:'#8faebd',sky:'#96d2ee',ink:'#2b5875'
  }:{
    wall:'#203352',floor:'#152844',roof:'#122442',frame:'#426b87',
    skyline:'#1c3659',sky:'#2e659a',ink:'#d9effe'
  };
  const result=[];
  const plane=(name,width,height,position,rotation,background)=>{
    const el=doc.createElement('div');
    el.className='spatial-css-room';
    el.dataset.roomPart=name;
    el.setAttribute('aria-hidden','true');
    Object.assign(el.style,{
      width:width+'px',height:height+'px',boxSizing:'border-box',
      background,backfaceVisibility:'visible',pointerEvents:'none'
    });
    const obj=new CSS3DObject(el);
    obj.name=name;obj.position.set(...position);obj.rotation.set(...rotation);
    obj.scale.setScalar(1/400);result.push(obj);return obj;
  };
  plane('css-room-floor',4640,6880,[0,-.03,-2],[-Math.PI/2,0,0],
    'repeating-linear-gradient(90deg,transparent 0px,transparent 590px,'+c.frame+' 600px),' +
    'repeating-linear-gradient(0deg,'+c.floor+' 0px,'+c.floor+' 590px,'+c.frame+' 600px)');
  plane('css-room-ceiling',4640,6880,[0,4.58,-2],[Math.PI/2,0,0],
    'repeating-linear-gradient(0deg,'+c.roof+' 0px,'+c.roof+' 1250px,'+c.frame+' 1260px)');
  plane('css-room-back',4640,1860,[0,2.3,BACK_Z],[0,0,0],
    'linear-gradient(90deg,'+c.wall+','+c.frame+','+c.wall+')');
  for(const x of [-3.84,3.84]){
    const w=WINDOW_WIDTH*400,h=WIN_HEIGHT*400;
    const window=plane('css-room-back-window',w,h,[x,WIN_MID,BACK_Z+.03],[0,0,0],
      'linear-gradient(180deg,'+c.sky+' 0%, '+c.sky+' 53%,'+c.skyline+' 55%,'+c.skyline+' 100%)');
    Object.assign(window.element.style,{
      border:'14px solid '+c.frame,
      boxShadow:'inset 0 0 35px '+c.frame
    });
    const bar=doc.createElement('div');
    Object.assign(bar.style,{position:'absolute',height:'100%',width:'10px',
      top:0,left:'50%',background:c.frame});
    window.element.append?.(bar);
  }
  for(const side of [-1,1]){
    plane(side<0?'css-room-left':'css-room-right',6880,1860,
      [side*SIDE_X,2.3,-2],[0,side===-1?Math.PI/2:-Math.PI/2,0],
      'repeating-linear-gradient(90deg,'+c.wall+' 0px,'+c.wall+' 1120px,'+
        c.sky+' 1130px,'+c.sky+' 1980px,'+c.frame+' 1990px)');
  }
  plane('css-room-front',4640,1860,[0,2.3,FRONT_Z],[0,Math.PI,0],c.wall);
  const board=plane('css-room-signage',910,330,[0,2.65,BACK_Z+.13],[0,0,0],
    'linear-gradient(100deg,'+c.frame+','+c.wall+')');
  board.element.textContent='DashboardX / SPATIAL WORKSPACE';
  Object.assign(board.element.style,{color:c.ink,display:'grid',placeItems:'center',
    font:'650 54px system-ui',letterSpacing:'3px'});
  return result;
}
