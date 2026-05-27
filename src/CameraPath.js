import * as THREE from 'three'

// Interior journey — camera ALWAYS inside a walled room.
//  A entrance (-z) → B great hall (-z) → C spiral tower (up) → D corridor (+x) → E library
// Coordinates mirror LAYOUT in HogwartsScene.js.

const C = { cx:0, cz:-75 }   // tower centre

const RAW = [
  // ── 0–14%  Entrance hall ──────────────────────────────
  { p:[0,5, 9],  l:[0,5,-4]  },
  { p:[0,5, 3],  l:[0,5,-9]  },
  { p:[0,5,-2],  l:[0,5,-12] },   // at the gate

  // ── 14–38%  Great hall ────────────────────────────────
  { p:[0,5,-16], l:[0,7,-30] },
  { p:[0,5,-27], l:[0,7,-40] },
  { p:[0,5,-39], l:[0,6,-52] },
  { p:[0,5,-52], l:[0,6,-61] },   // approaching tower door

  // ── 38–57%  Spiral tower (up) ─────────────────────────
  { p:[0,5,-61],          l:[0,9, C.cz] },      // entering
  { p:[7,8, C.cz],        l:[0,12,C.cz] },      // east low
  { p:[0,12,C.cz+7],      l:[0,16,C.cz] },      // +z
  { p:[-7,16,C.cz],       l:[0,19,C.cz] },      // west
  { p:[0,20,C.cz-7],      l:[0,23,C.cz] },      // -z
  { p:[7,24,C.cz],        l:[0,26,C.cz] },      // east high
  { p:[3,27,C.cz+5],      l:[11,28,C.cz] },     // turning to exit

  // ── 57–80%  Corridor (+x) ─────────────────────────────
  { p:[14,28,-75], l:[28,28,-75] },
  { p:[24,28,-75], l:[38,28,-75] },
  { p:[34,28,-75], l:[46,28,-75] },
  { p:[44,28,-75], l:[52,28,-75] },   // approaching library door

  // ── 80–100%  Library ──────────────────────────────────
  { p:[55,30,-75], l:[70,31,-75] },
  { p:[62,30,-75], l:[78,32,-75] },
  { p:[66,30,-74], l:[81,33,-73] },   // resting, facing the grand window
]

const posCurve  = new THREE.CatmullRomCurve3(RAW.map(w=>new THREE.Vector3(...w.p)), false, 'catmullrom', 0.5)
const lookCurve = new THREE.CatmullRomCurve3(RAW.map(w=>new THREE.Vector3(...w.l)), false, 'catmullrom', 0.5)

export const SECTION_THRESHOLDS = [
  { id:'s-hero',    show:0.00, hide:0.14 },
  { id:'s-about',   show:0.14, hide:0.38 },
  { id:'s-work',    show:0.38, hide:0.57 },
  { id:'s-exp',     show:0.57, hide:0.80 },
  { id:'s-contact', show:0.80, hide:1.01 },
]

// Door open-trigger t (matches buildAllDoors order: gate, hall→tower, tower→corridor, corridor→library)
export const DOOR_THRESHOLDS = [0.12, 0.36, 0.55, 0.78]

export function createCameraController(camera) {
  let smooth=0, target=0
  const tmpP=new THREE.Vector3(), tmpL=new THREE.Vector3(), dummy=camera.clone()
  return {
    setTarget(t){ target=Math.max(0,Math.min(1,t)) },
    update(dt){
      smooth += (target-smooth)*Math.min(dt*2.4,1)
      const t=Math.max(0,Math.min(0.9999,smooth))
      posCurve.getPoint(t,tmpP); lookCurve.getPoint(t,tmpL)
      camera.position.lerp(tmpP,0.06)
      dummy.position.copy(camera.position); dummy.lookAt(tmpL)
      camera.quaternion.slerp(dummy.quaternion,0.055)
      let active=-1
      SECTION_THRESHOLDS.forEach((s,i)=>{ if(t>=s.show && t<s.hide) active=i })
      return { active, t }
    },
    getSmooth(){ return smooth },
  }
}
