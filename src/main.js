import * as THREE from 'three'
import { gsap }            from 'gsap'
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js'
import { buildHogwartsScene, tickScene, doorPairs, sunLight } from './HogwartsScene.js'
import { createCameraController, SECTION_THRESHOLDS, DOOR_THRESHOLDS } from './CameraPath.js'
import { initTextAnimations, showSection, hideAllSections } from './TextAnimations.js'

// ─── Renderer (with shadows) ────────────────────────────────────────────────

const canvas   = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping         = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.55
renderer.outputColorSpace    = THREE.SRGBColorSpace
renderer.shadowMap.enabled   = true
renderer.shadowMap.type      = THREE.PCFSoftShadowMap

// ─── Scene & camera ───────────────────────────────────────────────────────────

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600)
camera.position.set(0, 5, 9)

// ─── Post-processing (gentle bloom) ──────────────────────────────────────────

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55, 0.55, 0.74    // richer magical glow on flames, fairy lights + windows
)
composer.addPass(bloom)
composer.addPass(new OutputPass())

// ─── Build world ──────────────────────────────────────────────────────────────

buildHogwartsScene(scene)
const camCtrl = createCameraController(camera)

// ─── Mouse parallax (capped to ~10px) ────────────────────────────────────────

let mTX = 0, mTY = 0, mX = 0, mY = 0
const MAX_OFFSET = 0.09   // world units ≈ ~10px on screen
window.addEventListener('mousemove', e => {
  mTX = (e.clientX / window.innerWidth  - 0.5) * 2
  mTY = (e.clientY / window.innerHeight - 0.5) * 2
}, { passive: true })

// ─── 3D doors — open by proximity (seamless, no overlay) ─────────────────────

const doorState = new Array(DOOR_THRESHOLDS.length).fill(0)
function setDoor(i, frac) {
  const p = doorPairs[i]; if (!p) return
  const a = frac * Math.PI * 0.46
  p.leftPivot.rotation.y  = -a
  p.rightPivot.rotation.y =  a
}
function updateDoors(t) {
  DOOR_THRESHOLDS.forEach((th, i) => {
    const open = t > th - 0.06 ? 1 : 0   // open just before the camera arrives
    if (open !== doorState[i]) {
      doorState[i] = open
      gsap.to({ v: open ? 0 : 1 }, {
        v: open ? 1 : 0, duration: open ? 0.9 : 0.6,
        ease: open ? 'power2.out' : 'power2.in',
        onUpdate: function () { setDoor(i, this.targets()[0].v) },
      })
    }
  })
}

// ─── Scroll → camera ──────────────────────────────────────────────────────────

const dots = document.querySelectorAll('.dot')
function onScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  camCtrl.setTarget(maxScroll > 0 ? window.scrollY / maxScroll : 0)
}
window.addEventListener('scroll', onScroll, { passive: true })

dots.forEach(dot => dot.addEventListener('click', () => {
  const t = SECTION_THRESHOLDS[parseInt(dot.dataset.idx)]
  if (!t) return
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  window.scrollTo({ top: (t.show + 0.01) * maxScroll, behavior: 'smooth' })
}))

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
  bloom.resolution.set(window.innerWidth, window.innerHeight)
})

// ─── Render loop ──────────────────────────────────────────────────────────────

let lastTime = 0, lastIdx = -1
const right = new THREE.Vector3(), up = new THREE.Vector3()

function animate(time) {
  requestAnimationFrame(animate)
  const dt = Math.min((time - lastTime) / 1000, 0.05)
  lastTime = time

  tickScene(time / 1000, camera)
  const { active, t } = camCtrl.update(dt)

  // breathing
  camera.position.y += Math.sin(time * 0.0004) * 0.012

  // capped mouse parallax — offset perpendicular to view
  mX += (mTX - mX) * 0.05
  mY += (mTY - mY) * 0.05
  right.set(1,0,0).applyQuaternion(camera.quaternion)
  up.set(0,1,0).applyQuaternion(camera.quaternion)
  camera.position.addScaledVector(right, THREE.MathUtils.clamp(mX,-1,1) * MAX_OFFSET)
  camera.position.addScaledVector(up,   -THREE.MathUtils.clamp(mY,-1,1) * MAX_OFFSET)

  // moonlight shadow frustum follows the camera
  if (sunLight) {
    sunLight.position.set(camera.position.x + 16, camera.position.y + 42, camera.position.z + 16)
    sunLight.target.position.set(camera.position.x, camera.position.y, camera.position.z - 4)
    sunLight.target.updateMatrixWorld()
  }

  updateDoors(t)

  // Seamless section switch — no black overlay, text fades via showSection
  if (active !== lastIdx) {
    lastIdx = active
    if (active >= 0) {
      const id = SECTION_THRESHOLDS[active].id
      dots.forEach((d, i) => d.classList.toggle('active', i === active))
      showSection(id)
    } else {
      hideAllSections()
    }
  }

  composer.render()
}

// ─── Loading sequence ─────────────────────────────────────────────────────────

function runLoader() {
  const chars   = [...document.querySelectorAll('.load-char')]
  const fill    = document.querySelector('.loading-fill')
  const loading = document.getElementById('loading')
  chars.forEach((c, i) => {
    c.style.transition = `opacity 0.4s ${i*55}ms cubic-bezier(0.16,1,0.3,1), transform 0.4s ${i*55}ms cubic-bezier(0.16,1,0.3,1)`
    c.style.opacity = '1'; c.style.transform = 'translateY(0)'
  })
  setTimeout(() => { fill.style.transition = 'width 1.0s cubic-bezier(0.4,0,0.2,1)'; fill.style.width = '100%' }, chars.length*55 + 80)
  setTimeout(() => {
    loading.style.transition = 'opacity 0.8s ease'; loading.style.opacity = '0'
    setTimeout(() => {
      loading.style.display = 'none'
      initTextAnimations(); showSection('s-hero')
      requestAnimationFrame(animate)
    }, 800)
  }, chars.length*55 + 1300)
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', runLoader)
else runLoader()
