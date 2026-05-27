import * as THREE from 'three'

const animatables = []
export const doorPairs = []      // [{ leftPivot, rightPivot }, ...]
export let   sunLight  = null     // exported so main.js makes it follow the camera

const stairSteps = []            // { mesh, h } — climb-reveal staircase
let   libraryWindow = null       // { left, right } casement pivots for the finale

// ── Layout (all interior, fully enclosed, connected linearly) ────────────────
//  A  Entrance  (Hero)      camera travels -z
//  B  Great Hall (About)    camera travels -z
//  C  Spiral Tower (Work)   camera spirals UP
//  D  Corridor  (Experience) camera travels +x (elevated)
//  E  Library   (Contact)   camera rests
export const LAYOUT = {
  A: { x0:-9,  x1:9,  z0:-12, z1:12,  yTop:16 },
  B: { x0:-11, x1:11, z0:-62, z1:-12, yTop:22 },
  C: { cx:0, cz:-75, rWall:13, rStair:7, yTop:34 },
  D: { x0:13, x1:52, z0:-81, z1:-69, y0:24, yTop:34 },
  E: { x0:52, x1:82, z0:-91, z1:-59, y0:24, yTop:46 },
}

export function buildHogwartsScene(scene) {
  scene.background = new THREE.Color(0x0c1018)        // cool winter night
  scene.fog = new THREE.FogExp2(0x0c1018, 0.0055)

  const M = createMaterials()
  buildStars(scene)
  buildEntrance(scene, M)
  buildGreatHall(scene, M)
  buildTower(scene, M)
  buildCorridor(scene, M)
  buildLibrary(scene, M)
  buildWinterExterior(scene, M)
  buildAllDoors(scene, M)
  setupLighting(scene)
  return animatables
}

export function tickScene(elapsed, cam) { for (const fn of animatables) fn(elapsed, cam) }

// ─── Procedural textures ─────────────────────────────────────────────────────

function makeStoneTexture(r=110, g=98, b=80, mortar=0.9) {
  const s = 1024, c = document.createElement('canvas'); c.width = c.height = s
  const x = c.getContext('2d')
  x.fillStyle = `rgb(${Math.round(r*0.6)},${Math.round(g*0.6)},${Math.round(b*0.6)})`; x.fillRect(0,0,s,s) // dark mortar base
  const bh = 80, bw = 160
  for (let row=0; row*bh<s+bh; row++) {
    const y = row*bh, off=(row%2)*(bw/2)
    for (let col=-1; col*bw+off<s+bw; col++) {
      const xx=col*bw+off
      const v=(Math.random()-0.5)*30, br=r+v, bg=g+v, bb=b+v
      // brick face
      x.fillStyle=`rgb(${br|0},${bg|0},${bb|0})`
      x.fillRect(xx+4,y+4,bw-8,bh-8)
      // bevel — light top/left, shadow bottom/right (fakes relief)
      x.fillStyle='rgba(255,248,230,0.16)'; x.fillRect(xx+4,y+4,bw-8,3); x.fillRect(xx+4,y+4,3,bh-8)
      x.fillStyle='rgba(0,0,0,0.28)';       x.fillRect(xx+4,y+bh-7,bw-8,3); x.fillRect(xx+bw-7,y+4,3,bh-8)
      // grime streaks
      if(Math.random()<0.4){ x.fillStyle='rgba(0,0,0,0.12)'; const gx=xx+8+Math.random()*(bw-20); x.fillRect(gx,y+6,2+Math.random()*4,bh-12) }
      // a few cracks
      if(Math.random()<0.18){ x.strokeStyle='rgba(0,0,0,0.35)'; x.lineWidth=1; x.beginPath(); x.moveTo(xx+10+Math.random()*bw*0.6,y+8); x.lineTo(xx+20+Math.random()*bw*0.6,y+bh-8); x.stroke() }
    }
  }
  // overall grain
  for (let i=0;i<9000;i++){const px=Math.random()*s,py=Math.random()*s,v=(Math.random()-0.5)*34
    x.fillStyle=`rgba(${v>0?255:0},${v>0?255:0},${v>0?255:0},${Math.abs(v)/120})`;x.fillRect(px,py,2,2)}
  const t = new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,2); t.anisotropy=8; return t
}

function makeFloorTexture() {
  const s=1024,c=document.createElement('canvas');c.width=c.height=s
  const x=c.getContext('2d')
  x.fillStyle='#23200f';x.fillRect(0,0,s,s)            // dark grout base
  const tile=128
  for(let gy=0;gy<s;gy+=tile)for(let gx=0;gx<s;gx+=tile){
    const off=((gy/tile)%2)*(tile/2), tx=gx+off
    const v=(Math.random()-0.5)*30
    x.fillStyle=`rgb(${90+v|0},${78+v|0},${56+v|0})`
    x.fillRect(tx+5,gy+5,tile-10,tile-10)
    // bevel highlight + shadow for relief
    x.fillStyle='rgba(255,244,214,0.14)'; x.fillRect(tx+5,gy+5,tile-10,4)
    x.fillStyle='rgba(0,0,0,0.30)';       x.fillRect(tx+5,gy+tile-9,tile-10,4)
    // worn polish patches (lighter)
    if(Math.random()<0.5){ x.fillStyle='rgba(255,240,210,0.10)'; x.beginPath(); x.ellipse(tx+tile/2,gy+tile/2,30+Math.random()*25,18+Math.random()*15,0,0,7); x.fill() }
  }
  for(let i=0;i<1400;i++){const px=Math.random()*s,py=Math.random()*s,v=(Math.random()-0.5)*18
    x.fillStyle=`rgba(${v>0?220:0},${v>0?190:0},${v>0?130:0},${Math.abs(v)/100})`;x.fillRect(px,py,3,3)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);t.anisotropy=8;return t
}

function makeWoodTexture() {
  const s=256,c=document.createElement('canvas');c.width=c.height=s
  const x=c.getContext('2d');x.fillStyle='#3a2410';x.fillRect(0,0,s,s)
  x.strokeStyle='rgba(70,40,16,0.5)';x.lineWidth=1
  for(let y=0;y<s;y+=4+Math.random()*6){x.beginPath();x.moveTo(0,y+(Math.random()-0.5)*2);x.lineTo(s,y+(Math.random()-0.5)*2);x.stroke()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);return t
}

function makeRugTexture() {
  const s=256,c=document.createElement('canvas');c.width=c.height=s
  const x=c.getContext('2d')
  x.fillStyle='#5e1414';x.fillRect(0,0,s,s)              // deep crimson
  x.strokeStyle='#c9a227';x.lineWidth=10                 // gold border
  x.strokeRect(14,14,s-28,s-28)
  x.strokeStyle='#8a1c1c';x.lineWidth=4;x.strokeRect(30,30,s-60,s-60)
  // central diamond motif (gold)
  x.strokeStyle='#c9a227';x.lineWidth=3
  x.beginPath();x.moveTo(s/2,50);x.lineTo(s-50,s/2);x.lineTo(s/2,s-50);x.lineTo(50,s/2);x.closePath();x.stroke()
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t
}

// ─── Materials ────────────────────────────────────────────────────────────────

function createMaterials() {
  const stone = new THREE.MeshStandardMaterial({ map: makeStoneTexture(112,100,82), color:0x9a8a72, roughness:0.9, metalness:0, side:THREE.DoubleSide })
  const stoneDark = new THREE.MeshStandardMaterial({ map: makeStoneTexture(74,64,50), color:0x6e5e48, roughness:0.95, metalness:0, side:THREE.DoubleSide })
  const floor = new THREE.MeshStandardMaterial({ map: makeFloorTexture(), color:0x7a6a50, roughness:0.6, metalness:0.18, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1 })
  const arch = new THREE.MeshStandardMaterial({ map: makeStoneTexture(126,112,90), color:0xb0a081, roughness:0.85, metalness:0, side:THREE.DoubleSide })
  const wood = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), color:0x4a3018, roughness:0.8, metalness:0.05 })
  const doorWood = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), color:0x6a4422, roughness:0.7, metalness:0.08, side:THREE.DoubleSide })
  const iron = new THREE.MeshStandardMaterial({ color:0x42382e, roughness:0.5, metalness:0.7 })
  const gold = new THREE.MeshStandardMaterial({ color:0xc9a227, roughness:0.25, metalness:0.85 })
  const rug = new THREE.MeshStandardMaterial({ map: makeRugTexture(), color:0xffffff, roughness:0.85, metalness:0 })
  const banner = new THREE.MeshStandardMaterial({ color:0x7a1818, roughness:0.85, metalness:0, side:THREE.DoubleSide })
  // frosted lit window glass — winter glow on solid walls (hides the void behind)
  const glass = new THREE.MeshStandardMaterial({ color:0xaecae8, emissive:new THREE.Color(0x7aa6e0), emissiveIntensity:1.1, roughness:0.25, transparent:true, opacity:0.82, side:THREE.DoubleSide })
  // clear glass for the openable finale casement — snow visible through it
  const clearGlass = new THREE.MeshStandardMaterial({ color:0xbcd6f0, emissive:new THREE.Color(0x6a92cc), emissiveIntensity:0.5, roughness:0.1, transparent:true, opacity:0.26, side:THREE.DoubleSide })
  // warm fire/candle glow
  const flame = new THREE.MeshStandardMaterial({ color:0x000000, emissive:new THREE.Color(0xff8a2c), emissiveIntensity:1.8 })
  const candle = new THREE.MeshStandardMaterial({ color:0xf0e0b8, emissive:new THREE.Color(0xffb040), emissiveIntensity:0.6 })
  const fire = new THREE.MeshStandardMaterial({ color:0x000000, emissive:new THREE.Color(0xff5e16), emissiveIntensity:2.0 })
  // winter exterior
  const snowGround = new THREE.MeshStandardMaterial({ color:0xdfe8f4, roughness:0.95, metalness:0, emissive:new THREE.Color(0x2a3a55), emissiveIntensity:0.25 })
  const pine = new THREE.MeshStandardMaterial({ color:0x16331f, roughness:0.9, metalness:0 })
  const snowCap = new THREE.MeshStandardMaterial({ color:0xeaf2fb, roughness:0.85, metalness:0, emissive:new THREE.Color(0x35506e), emissiveIntensity:0.3 })
  const broomWood = new THREE.MeshStandardMaterial({ color:0x4a2c12, roughness:0.7, metalness:0.05 })
  const broomBristle = new THREE.MeshStandardMaterial({ color:0x9a6a28, roughness:0.85, metalness:0 })
  return { stone, stoneDark, floor, arch, wood, doorWood, iron, gold, rug, banner, glass, clearGlass, flame, candle, fire, snowGround, pine, snowCap, broomWood, broomBristle }
}

// ─── Mesh helpers ────────────────────────────────────────────────────────────

function mk(parent, geo, mat, pos=[0,0,0], rot=[0,0,0], cast=true, receive=true) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos); m.rotation.set(...rot)
  m.castShadow = cast; m.receiveShadow = receive
  parent.add(m); return m
}

// Floor / ceiling slab
function slab(parent, mat, x0, x1, z0, z1, y, faceUp=true) {
  const m = mk(parent, new THREE.PlaneGeometry(Math.abs(x1-x0), Math.abs(z1-z0)), mat,
    [(x0+x1)/2, y, (z0+z1)/2], [faceUp ? -Math.PI/2 : Math.PI/2, 0, 0], false, true)
  return m
}

// Solid straight wall.  axis 'z' → spans x[h0,h1] at fixed z.  axis 'x' → spans z[h0,h1] at fixed x.
function wall(parent, mat, axis, fixed, h0, h1, y0, y1) {
  const w = Math.abs(h1-h0), h = Math.abs(y1-y0)
  const m = mk(parent, new THREE.PlaneGeometry(w, h), mat,
    axis==='z' ? [(h0+h1)/2, (y0+y1)/2, fixed] : [fixed, (y0+y1)/2, (h0+h1)/2],
    axis==='z' ? [0,0,0] : [0, Math.PI/2, 0], false, true)
  return m
}

// Wall with a centred doorway gap (left jamb + right jamb + lintel above)
function wallDoor(parent, mat, axis, fixed, h0, h1, y0, y1, doorC, doorHalf, doorTop) {
  if (doorC - doorHalf > h0 + 0.05) wall(parent, mat, axis, fixed, h0, doorC-doorHalf, y0, y1)
  if (doorC + doorHalf < h1 - 0.05) wall(parent, mat, axis, fixed, doorC+doorHalf, h1, y0, y1)
  if (doorTop < y1 - 0.05)          wall(parent, mat, axis, fixed, doorC-doorHalf, doorC+doorHalf, doorTop, y1)
}

// ─── Stars ───────────────────────────────────────────────────────────────────

function buildStars(scene) {
  const n=4000, geo=new THREE.BufferGeometry(), pos=new Float32Array(n*3)
  for(let i=0;i<n;i++){const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=160+Math.random()*60
    pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.sin(ph)*Math.sin(th);pos[i*3+2]=r*Math.cos(ph)}
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3))
  const stars=new THREE.Points(geo,new THREE.PointsMaterial({color:0xfff0d0,size:0.7,sizeAttenuation:true,transparent:true,opacity:0.95}))
  scene.add(stars); animatables.push(t=>{stars.rotation.y=t*0.0008})
}

// ─── Gothic arch frame ───────────────────────────────────────────────────────

function archFrame(parent, M, pos, rotY, w=7, h=11) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY
  mk(g, new THREE.BoxGeometry(0.9, h, 0.9), M.arch, [-w/2, h/2, 0])
  mk(g, new THREE.BoxGeometry(0.9, h, 0.9), M.arch, [ w/2, h/2, 0])
  mk(g, new THREE.BoxGeometry(w+1.1, 1.0, 0.95), M.arch, [0, h, 0])
  const peak = mk(g, new THREE.ConeGeometry(0.85, 2.2, 4), M.arch, [0, h+1.3, 0]); peak.rotation.y = Math.PI/4
  parent.add(g); return g
}

// Framed glowing window
function windowPane(parent, M, pos, rotY, w=2.6, h=4.6) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY
  mk(g, new THREE.PlaneGeometry(w, h), M.glass, [0,0,0], [0,0,0], false, false)
  // stone surround
  mk(g, new THREE.BoxGeometry(0.4, h+0.8, 0.5), M.arch, [-w/2-0.2, 0, -0.1])
  mk(g, new THREE.BoxGeometry(0.4, h+0.8, 0.5), M.arch, [ w/2+0.2, 0, -0.1])
  mk(g, new THREE.BoxGeometry(w+0.8, 0.4, 0.5), M.arch, [0, h/2+0.4, -0.1])
  mk(g, new THREE.BoxGeometry(w+0.8, 0.4, 0.5), M.arch, [0,-h/2-0.4, -0.1])
  // muntins
  mk(g, new THREE.BoxGeometry(0.1, h, 0.1), M.iron, [0,0,0.05], [0,0,0], false, false)
  mk(g, new THREE.BoxGeometry(w, 0.1, 0.1), M.iron, [0,0,0.05], [0,0,0], false, false)
  parent.add(g); return g
}

function torch(parent, M, pos, scene) {
  const [x,y,z]=pos
  mk(parent, new THREE.BoxGeometry(0.22,0.22,0.5), M.iron, [x,y,z])
  mk(parent, new THREE.SphereGeometry(0.2,7,6), M.flame, [x,y+0.3,z], [0,0,0], false, false)
  // No per-torch PointLight on purpose: there are ~30 torches and one real-time
  // light each murdered the frame rate (every light is evaluated per pixel by the
  // standard material). The flame still reads as lit via its emissive material +
  // bloom; the room key lights + ambient/hemisphere do the actual illumination.
}

// ─── A · Entrance hall ──────────────────────────────────────────────────────

function buildEntrance(scene, M) {
  const g = new THREE.Group()
  const {x0,x1,z0,z1,yTop} = LAYOUT.A
  slab(g, M.floor, x0,x1, z0,z1, 0, true)
  slab(g, M.stoneDark, x0,x1, z0,z1, yTop, false)
  wall(g, M.stone, 'x', x0, z0, z1, 0, yTop)          // left
  wall(g, M.stone, 'x', x1, z0, z1, 0, yTop)          // right
  wall(g, M.stone, 'z', z1, x0, x1, 0, yTop)          // back (behind camera)
  wallDoor(g, M.stone, 'z', z0, x0, x1, 0, yTop, 0, 3.6, 10)  // gate wall (front)
  archFrame(g, M, [0,0,z0], 0, 7.4, 10)

  // floor runner
  mk(g, new THREE.PlaneGeometry(4.4, z1-z0-1), M.rug, [0,0.03,(z0+z1)/2], [-Math.PI/2,0,0], false, true)

  // pillars in the corners
  ;[[x0+2,z0+3],[x1-2,z0+3],[x0+2,z1-3],[x1-2,z1-3]].forEach(([px,pz])=>{
    mk(g, new THREE.CylinderGeometry(0.7,0.85,yTop,12), M.stone, [px,yTop/2,pz])
    mk(g, new THREE.BoxGeometry(2,0.5,2), M.arch, [px,yTop-0.25,pz])
    mk(g, new THREE.BoxGeometry(2,0.5,2), M.arch, [px,0.25,pz])
  })

  torch(g, M, [x0+0.6, 6, 0]); torch(g, M, [x1-0.6, 6, 0])
  torch(g, M, [x0+0.6, 6, z1-3]); torch(g, M, [x1-0.6, 6, z1-3])
  // crest banners on back wall
  ;[-3.5,3.5].forEach(bx=> mk(g, new THREE.PlaneGeometry(2.2,6), M.banner, [bx,9,z1-0.15], [0,Math.PI,0], false, false))
  scene.add(g)
}

// ─── B · Great hall ───────────────────────────────────────────────────────────

function buildGreatHall(scene, M) {
  const g = new THREE.Group()
  const {x0,x1,z0,z1,yTop} = LAYOUT.B
  slab(g, M.floor, x0,x1, z0,z1, 0, true)
  slab(g, M.stoneDark, x0,x1, z0,z1, yTop, false)
  wall(g, M.stone, 'x', x0, z0, z1, 0, yTop)
  wall(g, M.stone, 'x', x1, z0, z1, 0, yTop)
  wallDoor(g, M.stone, 'z', z1, x0, x1, 0, yTop, 0, 3.6, 10)   // entry from A
  wallDoor(g, M.stone, 'z', z0, x0, x1, 0, yTop, 0, 3.6, 11)   // exit to tower
  archFrame(g, M, [0,0,z0], 0, 7.4, 11)
  archFrame(g, M, [0,0,z1], Math.PI, 7.4, 10)

  // central runner
  mk(g, new THREE.PlaneGeometry(4.6, z1-z0-2), M.rug, [0,0.03,(z0+z1)/2], [-Math.PI/2,0,0], false, true)

  // rib arches + pillars along the nave
  for (let z=z1-6; z>=z0+4; z-=10) {
    mk(g, new THREE.TorusGeometry((x1-x0)/2, 0.26, 8, 24, Math.PI), M.arch, [0, yTop, z])
    ;[x0+1.6, x1-1.6].forEach(px=>{
      mk(g, new THREE.CylinderGeometry(0.85,1.0,yTop,12), M.stone, [px,yTop/2,z])
      mk(g, new THREE.BoxGeometry(2.3,0.55,2.3), M.arch, [px,yTop-0.3,z])
    })
  }
  // long tables + benches
  ;[-4,4].forEach(tx=>{
    mk(g, new THREE.BoxGeometry(2.2,0.16,40), M.wood, [tx,1.1,(z0+z1)/2])
    for(let z=z1-8; z>=z0+6; z-=11){ mk(g, new THREE.BoxGeometry(0.2,1.1,0.2), M.wood,[tx-0.9,0.55,z]); mk(g, new THREE.BoxGeometry(0.2,1.1,0.2), M.wood,[tx+0.9,0.55,z]) }
    mk(g, new THREE.BoxGeometry(0.45,0.5,40), M.wood, [tx+Math.sign(tx)*2,0.42,(z0+z1)/2])
  })
  // candelabra on tables
  ;[-4,4].forEach(tx=>{ for(let z=z1-10; z>=z0+8; z-=13){
    mk(g, new THREE.CylinderGeometry(0.05,0.07,0.7,6), M.candle, [tx,1.55,z], [0,0,0], false, false)
    mk(g, new THREE.SphereGeometry(0.09,5,4), M.flame, [tx,1.95,z], [0,0,0], false, false)
  }})

  // windows along both side walls (glowing moonlight)
  for (let z=z1-8; z>=z0+6; z-=12) {
    windowPane(g, M, [x0+0.25, 13, z],  Math.PI/2, 2.6, 5)
    windowPane(g, M, [x1-0.25, 13, z], -Math.PI/2, 2.6, 5)
  }
  // banners between windows
  for (let z=z1-14; z>=z0+8; z-=12) {
    mk(g, new THREE.PlaneGeometry(2,7), M.banner, [x0+0.3,11,z], [0,Math.PI/2,0], false, false)
    mk(g, new THREE.PlaneGeometry(2,7), M.banner, [x1-0.3,11,z], [0,-Math.PI/2,0], false, false)
  }

  // floating enchanted candles
  const n=68, cg=new THREE.CylinderGeometry(0.06,0.06,0.55,6), fg=new THREE.SphereGeometry(0.11,6,5)
  const cm=new THREE.InstancedMesh(cg,M.candle,n), fm=new THREE.InstancedMesh(fg,M.flame,n)
  cm.castShadow=false; fm.castShadow=false
  const d=new THREE.Object3D(), data=[]
  for(let i=0;i<n;i++){const col=(i%8)-3.5,row=Math.floor(i/8)
    const x=col*2.4+(Math.random()-0.5), y=13+Math.sin(i*1.7)*3, z=z1-7-row*4.6
    data.push({x,y,z,ph:Math.random()*6.28})
    d.position.set(x,y,z);d.updateMatrix();cm.setMatrixAt(i,d.matrix)
    d.position.set(x,y+0.36,z);d.updateMatrix();fm.setMatrixAt(i,d.matrix)}
  cm.instanceMatrix.needsUpdate=fm.instanceMatrix.needsUpdate=true; g.add(cm,fm)
  animatables.push(t=>{data.forEach((c,i)=>{const b=Math.sin(t*0.6+c.ph)*0.3
    d.position.set(c.x,c.y+b,c.z);d.updateMatrix();cm.setMatrixAt(i,d.matrix)
    d.position.set(c.x,c.y+b+0.36,c.z);d.updateMatrix();fm.setMatrixAt(i,d.matrix)})
    cm.instanceMatrix.needsUpdate=fm.instanceMatrix.needsUpdate=true})

  // wall torches
  for(let z=z1-6; z>=z0+6; z-=11){ torch(g,M,[x0+0.7,7,z]); torch(g,M,[x1-0.7,7,z]) }

  // ── Christmas at Hogwarts — flanking trees, garlands, icicles ──
  buildChristmasTree(g, M, x0+4.5, 0, z0+9, 1.2)
  buildChristmasTree(g, M, x1-4.5, 0, z0+9, 1.2)
  buildChristmasTree(g, M, x0+4.5, 0, -27, 0.95)
  buildChristmasTree(g, M, x1-4.5, 0, -27, 0.95)
  // garlands wrapped around the pillars + red bows
  const bowMat=new THREE.MeshStandardMaterial({color:0x8a1414,roughness:0.7})
  for(let z=z1-6; z>=z0+4; z-=11){ [x0+1.6, x1-1.6].forEach(px=>{
    ;[6,12].forEach(gy=>mk(g, new THREE.TorusGeometry(1.3,0.3,6,16), M.pine, [px,gy,z], [Math.PI/2,0,0]))
    mk(g, new THREE.SphereGeometry(0.32,6,5), bowMat, [px+1.4,9,z])
  })}
  // icicles hanging from the tops of the side walls
  const iceMat=new THREE.MeshStandardMaterial({color:0xdbeafe,roughness:0.3,metalness:0.1,transparent:true,opacity:0.85,emissive:new THREE.Color(0x3a5a82),emissiveIntensity:0.35})
  for(let z=z1-3; z>=z0+3; z-=1.9){ [x0+0.4,x1-0.4].forEach(px=>{
    mk(g, new THREE.ConeGeometry(0.13,0.7+Math.random()*0.9,5), iceMat, [px,yTop-0.4,z], [Math.PI,0,0], false, false)
  })}
  scene.add(g)
}

// ─── C · Spiral tower ──────────────────────────────────────────────────────────

function buildTower(scene, M) {
  const g = new THREE.Group()
  const {cx,cz,rWall,rStair,yTop} = LAYOUT.C
  const N=28
  const entryA = Math.PI/2   // +z (toward hall)
  const exitA  = 0           // +x (toward corridor)
  const near = (a,b)=>{let d=Math.abs(a-b)%(Math.PI*2); d=Math.min(d,Math.PI*2-d); return d<0.28}

  for(let i=0;i<N;i++){
    const a=(i/N)*Math.PI*2
    const px=cx+Math.cos(a)*rWall, pz=cz+Math.sin(a)*rWall
    const chord = 2*rWall*Math.sin(Math.PI/N)*1.15
    let y0=0, y1=yTop
    if (near(a,entryA)) { y0=11; }              // doorway gap below (to hall)
    else if (near(a,exitA)) { y1=24; }          // doorway gap above (to corridor)
    const m = mk(g, new THREE.PlaneGeometry(chord, y1-y0), M.stone, [px,(y0+y1)/2,pz], [0,0,0], false, true)
    m.lookAt(new THREE.Vector3(cx,(y0+y1)/2,cz))
  }
  // floor + open top capped by cone roof
  mk(g, new THREE.CylinderGeometry(rWall, rWall, 0.4, N), M.floor, [cx,0,cz], [0,0,0], false, true)
  mk(g, new THREE.ConeGeometry(rWall+0.6, 9, N), M.stoneDark, [cx, yTop+4, cz])

  // central pillar
  mk(g, new THREE.CylinderGeometry(1.4,1.6,yTop,16), M.stone, [cx,yTop/2,cz])

  // spiral steps (2 turns) — modelled treads + risers + balustrade, climb-reveal
  const steps=44
  const innerR=1.7, outerR=rStair+2.2, rMid=(innerR+outerR)/2, radialLen=outerR-innerR
  for(let i=0;i<steps;i++){
    const f=i/steps, a=f*Math.PI*4, h=2+f*(yTop-7)
    const grp=new THREE.Group(); grp.position.set(cx,0,cz); grp.rotation.y=-a
    const stoneMat=M.arch.clone(); stoneMat.transparent=true; stoneMat.opacity=0
    const railMat =M.gold.clone(); railMat.transparent=true;  railMat.opacity=0
    const X=rMid   // local +x is radial after group rotation
    const tread=new THREE.Mesh(new THREE.BoxGeometry(radialLen,0.34,1.95),stoneMat); tread.position.set(X,h,0); tread.receiveShadow=true; grp.add(tread)
    const nose =new THREE.Mesh(new THREE.BoxGeometry(radialLen,0.16,0.3),stoneMat);  nose.position.set(X,h+0.09,0.98); grp.add(nose)
    const riser=new THREE.Mesh(new THREE.BoxGeometry(radialLen,0.6,0.14),stoneMat);  riser.position.set(X,h-0.3,0.96); grp.add(riser)
    const post =new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.15,8),railMat); post.position.set(outerR-0.2,h+0.6,0); grp.add(post)
    const rail =new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,2.15),railMat);        rail.position.set(outerR-0.2,h+1.15,0); grp.add(rail)
    g.add(grp)
    stairSteps.push({ group:grp, mats:[stoneMat,railMat], h })
  }
  // Climb-reveal — the staircase UNFOLDS ahead of you as you climb (Hogwarts
  // moving-stair feel): steps you've passed stay solid, steps up to AHEAD units
  // above the camera fade + rise into place, everything higher stays hidden so
  // the spiral keeps building into the dark above you.
  const AHEAD = 9
  animatables.push((t,cam)=>{
    if(!cam) return
    const camY=cam.position.y
    for(const s of stairSteps){
      const target=Math.max(0,Math.min(1,(camY + AHEAD - s.h)/AHEAD))
      const op=s.mats[0].opacity + (target-s.mats[0].opacity)*0.1
      for(const m of s.mats) m.opacity=op
      s.group.position.y=(1-op)*-3.2                          // rise up into place as it materialises
      s.group.visible = op>0.02
    }
  })
  // arches at the two doorways
  archFrame(g, M, [cx+Math.cos(entryA)*rWall, 0, cz+Math.sin(entryA)*rWall], -entryA+Math.PI/2, 6.6, 11)
  archFrame(g, M, [cx+Math.cos(exitA)*rWall, 24, cz+Math.sin(exitA)*rWall], -exitA+Math.PI/2, 6.6, 9)

  // torches spiralling up the wall
  for(let i=0;i<8;i++){const f=i/8,a=f*Math.PI*4+0.5,h=4+f*(yTop-8)
    torch(g,M,[cx+Math.cos(a)*(rWall-1.2),h,cz+Math.sin(a)*(rWall-1.2)])}
  // portraits
  for(let i=0;i<5;i++){const a=(i/5)*Math.PI*4+1.0,h=5+(i/5)*(yTop-9)
    const px=cx+Math.cos(a)*(rWall-0.5),pz=cz+Math.sin(a)*(rWall-0.5)
    const fr=mk(g,new THREE.BoxGeometry(2.2,3,0.14),M.wood,[px,h,pz]);fr.lookAt(new THREE.Vector3(cx,h,cz))
    const pt=mk(g,new THREE.PlaneGeometry(1.6,2.4),M.glass,[px,h,pz],[0,0,0],false,false);pt.lookAt(new THREE.Vector3(cx,h,cz));pt.translateZ(0.08)}
  scene.add(g)
}

// ─── D · Corridor ──────────────────────────────────────────────────────────────

function buildCorridor(scene, M) {
  const g = new THREE.Group()
  const {x0,x1,z0,z1,y0,yTop} = LAYOUT.D
  slab(g, M.floor, x0,x1, z0,z1, y0, true)
  slab(g, M.stoneDark, x0,x1, z0,z1, yTop, false)
  wall(g, M.stone, 'z', z1, x0, x1, y0, yTop)             // far side (windows go here, +z side toward -z? choose z0)
  wallDoor(g, M.stone, 'x', x0, z0, z1, y0, yTop, (z0+z1)/2, 3.2, y0+8)  // entry from tower
  wallDoor(g, M.stone, 'x', x1, z0, z1, y0, yTop, (z0+z1)/2, 3.2, y0+8)  // exit to library
  // window wall (z0)
  wall(g, M.stone, 'z', z0, x0, x1, y0, yTop)
  for(let x=x0+5;x<=x1-5;x+=8) windowPane(g, M, [x, y0+4.5, z0+0.3], 0, 2.4, 4.4)
  archFrame(g, M, [x0,y0,(z0+z1)/2], Math.PI/2, 6.4, 8.5)
  archFrame(g, M, [x1,y0,(z0+z1)/2], -Math.PI/2, 6.4, 8.5)
  // runner
  mk(g, new THREE.PlaneGeometry(x1-x0-2, 3.4), M.rug, [(x0+x1)/2, y0+0.03, (z0+z1)/2], [-Math.PI/2,0,Math.PI/2], false, true)
  // ONE grand chandelier down the centre (replaces the wall clutter)
  buildChandelier(g, M, (x0+x1)/2, (z0+z1)/2, yTop, y0+5.5, 2.1, 0xffc474, 3.8, 64)
  // a torch at each end for warmth
  torch(g, M, [x0+3, y0+4.6, z1-0.4]); torch(g, M, [x1-3, y0+4.6, z1-0.4])
  scene.add(g)
}

// ─── E · Library / final chamber ────────────────────────────────────────────────

function buildLibrary(scene, M) {
  const g = new THREE.Group()
  const {x0,x1,z0,z1,y0,yTop} = LAYOUT.E
  slab(g, M.floor, x0,x1, z0,z1, y0, true)
  slab(g, M.stoneDark, x0,x1, z0,z1, yTop, false)
  wall(g, M.stone, 'z', z0, x0, x1, y0, yTop)
  wall(g, M.stone, 'z', z1, x0, x1, y0, yTop)
  // far wall has a big arched window OPENING (the finale)
  wallWindowGap(g, M.stone, 'x', x1, z0, z1, y0, yTop, (z0+z1)/2, 3.8, y0+2, y0+18)
  wallDoor(g, M.stone, 'x', x0, z0, z1, y0, yTop, (z0+z1)/2, 3.2, y0+8)  // entry from corridor
  archFrame(g, M, [x0,y0,(z0+z1)/2], Math.PI/2, 6.4, 8.5)

  // ── Openable casement window — blows wide open at the finale ──
  const midZ=(z0+z1)/2, wHalf=3.8, wbot=y0+2, wtop=y0+18, panelH=wtop-wbot, panelW=wHalf
  mk(g, new THREE.TorusGeometry(wHalf,0.5,8,20,Math.PI), M.arch, [x1-0.1, wtop, midZ], [0,-Math.PI/2,0])
  const makeCasement=(hingeZ, dir)=>{
    const pivot=new THREE.Group(); pivot.position.set(x1, (wbot+wtop)/2, hingeZ)
    const cz=dir*panelW/2
    mk(pivot, new THREE.BoxGeometry(0.07,panelH-0.6,panelW-0.5), M.clearGlass, [0.06,0,cz],[0,0,0],false,false)
    mk(pivot, new THREE.BoxGeometry(0.13,panelH,0.18), M.iron, [0.06,0,0],[0,0,0],false,false)             // hinge post
    mk(pivot, new THREE.BoxGeometry(0.13,panelH,0.18), M.iron, [0.06,0,dir*panelW],[0,0,0],false,false)      // free post
    mk(pivot, new THREE.BoxGeometry(0.13,0.18,panelW), M.iron, [0.06, panelH/2,cz],[0,0,0],false,false)       // top rail
    mk(pivot, new THREE.BoxGeometry(0.13,0.18,panelW), M.iron, [0.06,-panelH/2,cz],[0,0,0],false,false)       // bottom rail
    mk(pivot, new THREE.BoxGeometry(0.1,panelH,0.09), M.iron, [0.07,0,cz],[0,0,0],false,false)                // muntin v
    mk(pivot, new THREE.BoxGeometry(0.1,0.09,panelW), M.iron, [0.07,0,cz],[0,0,0],false,false)                // muntin h
    g.add(pivot); return pivot
  }
  libraryWindow = { left: makeCasement(midZ-wHalf, +1), right: makeCasement(midZ+wHalf, -1) }
  animatables.push((t,cam)=>{
    if(!cam||!libraryWindow) return
    const open = (cam.position.x > 58 ? 1 : 0) * 1.4
    libraryWindow.left.rotation.y  += (( open) - libraryWindow.left.rotation.y )*0.045
    libraryWindow.right.rotation.y += ((-open) - libraryWindow.right.rotation.y)*0.045
  })

  // bookshelves along z walls — individual spines (no z-fighting / glitch)
  const bookHues=[0x7a1818,0x1d4d2b,0x8a6a16,0x123a5e,0x5e2a10,0x6a2410,0x2c4a1a]
  ;[z0+0.6, z1-0.6].forEach(zz=>{
    const fz = zz + (zz < (z0+z1)/2 ? 0.62 : -0.62)   // book faces sit just in front of the case
    for(let x=x0+5;x<=x1-4;x+=5){
      mk(g, new THREE.BoxGeometry(4.4,9,1.0), M.wood, [x, y0+4.5, zz], [0,0,0], true, true)   // case
      for(let row=0; row<5; row++){
        const sy=y0+1.4+row*1.6
        mk(g, new THREE.BoxGeometry(4.2,0.12,0.92), M.wood, [x, sy-0.78, zz])                 // shelf board
        let bx=x-1.95
        while(bx < x+1.85){
          const w=0.22+Math.random()*0.2, h=0.95+Math.random()*0.5
          const c=bookHues[(Math.random()*bookHues.length)|0]
          const bm=new THREE.MeshStandardMaterial({ color:c, roughness:0.85, emissive:new THREE.Color(c), emissiveIntensity:0.07 })
          mk(g, new THREE.BoxGeometry(w,h,0.44), bm, [bx+w/2, sy-0.7+h/2, fz], [0,0,0], false, false)
          bx += w+0.04
        }
      }
    }
  })
  // central reading tables
  ;[(z0+z1)/2-6,(z0+z1)/2+6].forEach(zz=>{
    mk(g, new THREE.BoxGeometry(3,0.18,7), M.wood, [(x0+x1)/2+4, y0+1.3, zz])
    ;[[-1.2,-3],[1.2,-3],[-1.2,3],[1.2,3]].forEach(([dx,dz])=>mk(g,new THREE.BoxGeometry(0.2,1.3,0.2),M.wood,[(x0+x1)/2+4+dx,y0+0.65,zz+dz]))
    mk(g, new THREE.CylinderGeometry(0.05,0.07,0.7,6), M.candle, [(x0+x1)/2+4,y0+1.8,zz],[0,0,0],false,false)
    mk(g, new THREE.SphereGeometry(0.1,5,4), M.flame, [(x0+x1)/2+4,y0+2.2,zz],[0,0,0],false,false)
  })
  // fireplace on z0 wall
  const fx=(x0+x1)/2+10
  mk(g, new THREE.BoxGeometry(6,5,1.2), M.stoneDark, [fx, y0+2.5, z0+0.6])
  mk(g, new THREE.BoxGeometry(4,3,0.4), M.fire, [fx, y0+1.8, z0+1.0], [0,0,0], false, false)
  const fl=new THREE.PointLight(0xff5e16, 2.4, 30, 1.5); fl.position.set(fx,y0+2,z0+2); g.add(fl)
  animatables.push(t=>{fl.intensity=2.2+Math.sin(t*7+fx)*0.4+Math.sin(t*15)*0.15})

  // chandeliers
  ;[(z0+z1)/2].forEach(zz=>{ const cxp=(x0+x1)/2+4
    mk(g, new THREE.TorusGeometry(1.6,0.12,8,18), M.gold, [cxp, yTop-3, zz], [Math.PI/2,0,0])
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2
      mk(g, new THREE.SphereGeometry(0.12,5,4), M.flame, [cxp+Math.cos(a)*1.6, yTop-2.7, zz+Math.sin(a)*1.6],[0,0,0],false,false)}
  })
  for(let z=z0+5;z<=z1-3;z+=8){ torch(g,M,[x0+0.6,y0+5,z]) }
  scene.add(g)
}

// ─── 3D doors ─────────────────────────────────────────────────────────────────

function buildDoorMesh(M, w=2.8, h=9) {
  const group=new THREE.Group()
  const make=(sign)=>{
    const pivot=new THREE.Group()
    const panel=mk(pivot, new THREE.BoxGeometry(w,h,0.2), M.doorWood, [sign*w/2, h/2, 0])
    ;[0.18,0.5,0.82].forEach(f=>mk(panel,new THREE.BoxGeometry(w-0.1,0.14,0.26),M.iron,[ -0 , h*f-h/2, 0.09]))
    const ring=mk(panel,new THREE.TorusGeometry(0.26,0.06,6,12),M.iron,[ -sign*(w/2-0.4), 0, 0.16]); ring.rotation.x=Math.PI/2
    return pivot
  }
  const leftPivot=make(1), rightPivot=make(-1)
  group.add(leftPivot,rightPivot)
  return { group, leftPivot, rightPivot }
}

function buildAllDoors(scene, M) {
  const add=(w,h,pos,rotY)=>{
    const {group,leftPivot,rightPivot}=buildDoorMesh(M,w,h)
    leftPivot.position.set(-w,0,0); rightPivot.position.set(w,0,0)
    group.position.set(...pos); group.rotation.y=rotY
    scene.add(group); doorPairs.push({leftPivot,rightPivot})
  }
  add(3.4, 9.6, [0,0.1,LAYOUT.A.z0], 0)                 // gate (A→B)
  add(3.4, 10.6,[0,0.1,LAYOUT.B.z0], 0)                 // hall→tower
  const C=LAYOUT.C
  add(3.0, 8.4, [C.cx+C.rWall, 24, C.cz], Math.PI/2)    // tower→corridor (top, +x)
  add(3.0, 7.6, [LAYOUT.E.x0, LAYOUT.D.y0+0.1, (LAYOUT.D.z0+LAYOUT.D.z1)/2], Math.PI/2) // corridor→library
}

// ─── Wall with a rectangular window opening (jambs + sill + lintel) ──────────

function wallWindowGap(parent, mat, axis, fixed, h0, h1, y0, y1, openC, openHalf, openBot, openTop) {
  if (openC - openHalf > h0 + 0.05) wall(parent, mat, axis, fixed, h0, openC-openHalf, y0, y1)
  if (openC + openHalf < h1 - 0.05) wall(parent, mat, axis, fixed, openC+openHalf, h1, y0, y1)
  if (openBot > y0 + 0.05)          wall(parent, mat, axis, fixed, openC-openHalf, openC+openHalf, y0, openBot)
  if (openTop < y1 - 0.05)          wall(parent, mat, axis, fixed, openC-openHalf, openC+openHalf, openTop, y1)
}

// ─── Chandelier ──────────────────────────────────────────────────────────────

function buildChandelier(parent, M, x, z, ceilingY, bodyY, ringR=2.0, lightColor=0xffc070, lightIntensity=3.4, lightDist=58) {
  const g = new THREE.Group(); g.position.set(x, bodyY, z)
  const chainLen = Math.max(0.5, ceilingY - bodyY)
  mk(g, new THREE.CylinderGeometry(0.05,0.05,chainLen,6), M.iron, [0, chainLen/2, 0], [0,0,0], false, false)
  mk(g, new THREE.TorusGeometry(ringR,0.13,8,24), M.gold, [0,0,0], [Math.PI/2,0,0])
  mk(g, new THREE.TorusGeometry(ringR*0.55,0.1,8,20), M.gold, [0,0.85,0], [Math.PI/2,0,0])
  for (let k=0;k<6;k++){ const a=k/6*Math.PI*2
    mk(g, new THREE.CylinderGeometry(0.03,0.03,1.1,5), M.gold, [Math.cos(a)*ringR*0.78, 0.45, Math.sin(a)*ringR*0.78], [0.2*Math.sin(a),0,-0.2*Math.cos(a)]) }
  for (let k=0;k<10;k++){ const a=k/10*Math.PI*2, px=Math.cos(a)*ringR, pz=Math.sin(a)*ringR
    mk(g, new THREE.CylinderGeometry(0.09,0.11,0.6,6), M.candle, [px,0.42,pz], [0,0,0], false, false)
    mk(g, new THREE.SphereGeometry(0.13,6,5), M.flame, [px,0.82,pz], [0,0,0], false, false) }
  const l = new THREE.PointLight(lightColor, lightIntensity, lightDist, 1.4); l.position.set(0,0.6,0); g.add(l)
  parent.add(g)
  animatables.push(t=>{ g.rotation.z=Math.sin(t*0.5)*0.025; g.rotation.x=Math.cos(t*0.43)*0.02
    l.intensity = lightIntensity + Math.sin(t*6)*0.3 + Math.sin(t*13)*0.12 })
  return g
}

// ─── Christmas tree (decorated, twinkling) ───────────────────────────────────

function buildChristmasTree(parent, M, x, y, z, scale=1) {
  const g=new THREE.Group(); g.position.set(x,y,z); g.scale.setScalar(scale)
  mk(g, new THREE.CylinderGeometry(0.5,0.65,2,8), M.wood, [0,1,0])
  ;[[3.6,5,2.6],[2.9,4.6,4.8],[2.1,4,6.9],[1.3,3,8.7]].forEach(([rr,hh,by])=>
    mk(g, new THREE.ConeGeometry(rr,hh,10), M.pine, [0,by,0]))
  // gold star
  const starMat=new THREE.MeshStandardMaterial({color:0x000000,emissive:new THREE.Color(0xffd66a),emissiveIntensity:2.6})
  mk(g, new THREE.ConeGeometry(0.5,1.0,4), starMat, [0,10.5,0], [0,Math.PI/4,0], false, false)
  mk(g, new THREE.ConeGeometry(0.5,1.0,4), starMat, [0,10.0,0], [Math.PI,Math.PI/4,0], false, false)
  // baubles + fairy lights (twinkling coloured points)
  const cols=[0xff4030,0xffd24a,0xff8a3c,0x6fd0ff,0xffffff], N=48
  const pgeo=new THREE.BufferGeometry(), ppos=new Float32Array(N*3), pcol=new Float32Array(N*3)
  for(let i=0;i<N;i++){ const by=2.6+Math.random()*7.2, tr=3.6*(1-(by-2.6)/8.2)+0.4, a=Math.random()*6.28
    ppos[i*3]=Math.cos(a)*tr*(0.7+Math.random()*0.3); ppos[i*3+1]=by; ppos[i*3+2]=Math.sin(a)*tr*(0.7+Math.random()*0.3)
    const cc=new THREE.Color(cols[(Math.random()*cols.length)|0]); pcol[i*3]=cc.r; pcol[i*3+1]=cc.g; pcol[i*3+2]=cc.b }
  pgeo.setAttribute('position',new THREE.BufferAttribute(ppos,3)); pgeo.setAttribute('color',new THREE.BufferAttribute(pcol,3))
  const fairy=new THREE.Points(pgeo,new THREE.PointsMaterial({size:0.42,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0.95}))
  g.add(fairy)
  const l=new THREE.PointLight(0xffcf7a,1.8,30,1.3); l.position.set(0,5,0); g.add(l)
  animatables.push(t=>{ fairy.material.opacity=0.7+Math.sin(t*3+x)*0.25; l.intensity=1.6+Math.sin(t*4+x)*0.3 })
  parent.add(g); return g
}

// ─── Winter exterior — snowy grounds, swaying pines, snowfall, flying brooms ──

function buildWinterExterior(scene, M) {
  const g = new THREE.Group()
  // snowy grounds — kept OUTSIDE the castle (x>84, beyond the library window)
  mk(g, new THREE.PlaneGeometry(260,300), M.snowGround, [214,8,-70], [-Math.PI/2,0,0], false, true)
  for (let i=0;i<12;i++){ const mx=100+Math.random()*200, mz=-160+Math.random()*220
    mk(g, new THREE.SphereGeometry(6+Math.random()*9,10,8), M.snowGround, [mx,6,mz]) }

  // evergreen pines that sway in the distance
  const trees=[]
  for (let i=0;i<18;i++){
    const tx=96+Math.random()*170, tz=-160+Math.random()*200, sc=0.8+Math.random()*1.2
    const tg=new THREE.Group(); tg.position.set(tx,8,tz); tg.scale.setScalar(sc)
    mk(tg,new THREE.CylinderGeometry(0.4,0.5,3,6),M.broomWood,[0,1.5,0])
    mk(tg,new THREE.ConeGeometry(3,5,8),M.pine,[0,4,0])
    mk(tg,new THREE.ConeGeometry(2.4,4.5,8),M.pine,[0,6.5,0])
    mk(tg,new THREE.ConeGeometry(1.7,3.8,8),M.pine,[0,9,0])
    mk(tg,new THREE.ConeGeometry(1.0,2.2,8),M.snowCap,[0,11,0])
    g.add(tg); trees.push({tg,ph:Math.random()*6.28})
  }
  animatables.push(t=>{ for(const o of trees){ o.tg.rotation.z=Math.sin(t*0.7+o.ph)*0.05; o.tg.rotation.x=Math.cos(t*0.6+o.ph)*0.04 } })

  // falling snow
  const SN=1000, sgeo=new THREE.BufferGeometry(), spos=new Float32Array(SN*3), sb=[]
  for (let i=0;i<SN;i++){ const x=84+Math.random()*95, y=10+Math.random()*48, z=-135+Math.random()*130
    sb.push({x,y,z,sp:3+Math.random()*4}); spos[i*3]=x; spos[i*3+1]=y; spos[i*3+2]=z }
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos,3))
  const snow=new THREE.Points(sgeo, new THREE.PointsMaterial({color:0xeaf4ff,size:0.55,transparent:true,opacity:0.9,sizeAttenuation:true}))
  g.add(snow)
  animatables.push(t=>{ const p=sgeo.attributes.position.array
    for(let i=0;i<SN;i++){ let y=sb[i].y-((t*sb[i].sp)%52); if(y<8)y+=52
      p[i*3]=sb[i].x+Math.sin(t*0.6+i)*0.7; p[i*3+1]=y; p[i*3+2]=sb[i].z }
    sgeo.attributes.position.needsUpdate=true })

  // brooms flying by
  const brooms=[]
  for (let b=0;b<3;b++){
    const bg=new THREE.Group()
    mk(bg, new THREE.CylinderGeometry(0.07,0.07,2.6,6), M.broomWood, [0,0,0], [0,0,Math.PI/2])
    mk(bg, new THREE.ConeGeometry(0.34,1.2,7), M.broomBristle, [-1.5,0,0], [0,0,-Math.PI/2])
    g.add(bg); brooms.push({bg, off:b*2.3, yy:33+b*5, sp:0.05+b*0.015})
  }
  animatables.push(t=>{ for(const o of brooms){ const u=((t*o.sp+o.off)%1)
    const z=-150+u*170, x=100+Math.sin(u*6.28)*18
    o.bg.position.set(x, o.yy+Math.sin(t*2+o.off)*0.9, z)
    o.bg.rotation.set(Math.sin(t*2.5+o.off)*0.08, Math.PI/2, Math.sin(t*3+o.off)*0.13) } })

  // cool moonlight over the grounds
  const moon=new THREE.PointLight(0x9ab8e8, 2.4, 460, 0.55); moon.position.set(160,90,-60); g.add(moon)
  scene.add(g)
}

// ─── Lighting + shadows ─────────────────────────────────────────────────────────

function setupLighting(scene) {
  // Brighter base illumination — surfaces read everywhere, not just near fire.
  // Bumped a touch to make up for the per-torch point lights we removed for perf.
  scene.add(new THREE.AmbientLight(0x9a96b0, 3.4))
  scene.add(new THREE.HemisphereLight(0x8090c0, 0x5a4628, 2.6))

  // Moonlight — the ONE shadow-casting light in the scene; follows camera in main.js
  sunLight = new THREE.DirectionalLight(0xd6e6ff, 1.7)
  sunLight.position.set(20, 50, 20)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(1024, 1024)
  const sc = sunLight.shadow.camera
  sc.near=1; sc.far=130; sc.left=-26; sc.right=26; sc.top=26; sc.bottom=-26
  sunLight.shadow.bias = -0.0006
  scene.add(sunLight); scene.add(sunLight.target)

  // Warm key lights per room. NONE cast shadows now: a PointLight shadow is a
  // 6-face cube render every frame, and three of them was the biggest single
  // frame-rate cost. The directional moonlight provides all the cast shadows.
  const key=(color,intensity,dist,pos)=>{
    const l=new THREE.PointLight(color,intensity,dist,1.4); l.position.set(...pos)
    scene.add(l); return l
  }
  key(0xffc888, 3.4, 44, [0, 12, 0])                 // entrance
  key(0xffbe70, 3.8, 66, [0, 15, -30])               // great hall
  key(0xffb45e, 3.4, 66, [0, 14, -52])               // hall end
  key(0xffac54, 3.4, 50, [LAYOUT.C.cx, 16, LAYOUT.C.cz]) // tower
  key(0xffbc6a, 3.4, 56, [32, LAYOUT.D.y0+5, -75])   // corridor
  key(0xffca8a, 3.8, 66, [66, LAYOUT.E.y0+8, -75])   // library

  // Cool winter moonlight spilling through the library window — magical contrast
  const win = new THREE.PointLight(0x9cc0f0, 2.6, 60, 1.1)
  win.position.set(80, LAYOUT.E.y0+12, -75); scene.add(win)
  // Cool fills near the great-hall + corridor windows
  const hallWin = new THREE.PointLight(0x88a8e0, 1.4, 40, 1.2); hallWin.position.set(0, 14, -36); scene.add(hallWin)
}
