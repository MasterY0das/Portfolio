import { gsap } from 'gsap'

// ─── Char splitter (preserves <br> tags) ─────────────────────────────────────

function splitChars(el) {
  const html = el.innerHTML
  const text = el.textContent
  el.innerHTML = ''
  el.setAttribute('aria-label', text.trim())

  const allSpans = []
  const parts = html.split(/<br\s*\/?>/i)

  parts.forEach((part, pi) => {
    const tmp = document.createElement('span')
    tmp.innerHTML = part
    const str = tmp.textContent
    ;[...str].forEach(ch => {
      const s = document.createElement('span')
      s.className = 'char'
      s.textContent = ch === ' ' ? ' ' : ch
      s.style.display = 'inline-block'
      s.setAttribute('aria-hidden', 'true')
      el.appendChild(s)
      allSpans.push(s)
    })
    if (pi < parts.length - 1) el.appendChild(document.createElement('br'))
  })

  return allSpans
}

// ─── Kill all tweens on a section and its children ────────────────────────────

function killSection(el) {
  gsap.killTweensOf(el)
  el.querySelectorAll('*').forEach(child => {
    gsap.killTweensOf(child)
    gsap.set(child, { clearProps: 'all' })
  })
}

// ─── Per-section animation factories ─────────────────────────────────────────

const SECTION_ANIMATIONS = {

  's-hero'(el) {
    const tl      = gsap.timeline({ defaults: { ease: 'expo.out' } })
    const line1   = el.querySelector('.name-line:first-child')
    const line2   = el.querySelector('.name-line:last-child')
    const eyebrow = el.querySelector('.eyebrow')
    const title   = el.querySelector('.hero-title')
    const sub     = el.querySelector('.hero-sub')
    const cue     = el.querySelector('.scroll-cue')

    gsap.set(line1,  { y: 90, opacity: 0, filter: 'blur(14px)', skewX: -4 })
    gsap.set(line2,  { y: 60, opacity: 0 })
    gsap.set([eyebrow, title, sub, cue], { y: 18, opacity: 0 })

    if (line1) tl.to(line1, { y: 0, opacity: 1, filter: 'blur(0px)', skewX: 0, duration: 1.2 })
    if (line2) tl.to(line2, { y: 0, opacity: 1, duration: 0.9 }, '-=0.6')
    tl.to(eyebrow, { y: 0, opacity: 1, duration: 0.55 }, '-=0.5')
    tl.to(title,   { y: 0, opacity: 1, duration: 0.5  }, '-=0.4')
    tl.to(sub,     { y: 0, opacity: 1, duration: 0.5  }, '-=0.4')
    tl.to(cue,     { y: 0, opacity: 1, duration: 0.45 }, '-=0.3')
    return tl
  },

  's-about'(el) {
    const tl     = gsap.timeline({ defaults: { ease: 'expo.out' } })
    const label  = el.querySelector('.section-label')
    const headEl = el.querySelector('.section-heading')
    const chars  = splitChars(headEl)
    const lines  = el.querySelectorAll('.body-line')
    const chips  = el.querySelectorAll('.skill-chip')

    gsap.set(label, { x: -40, opacity: 0 })
    gsap.set(chars, { y: 80, opacity: 0, skewX: 8 })
    gsap.set(lines, { y: 22, opacity: 0 })
    gsap.set(chips, { y: 18, opacity: 0 })

    tl.to(label, { x: 0, opacity: 1, duration: 0.5 })
      .to(chars, { y: 0, opacity: 1, skewX: 0,
          stagger: { amount: 0.5, ease: 'power2.out' }, duration: 0.9 }, '-=0.2')
      .to(lines, { y: 0, opacity: 1, stagger: 0.2, duration: 0.75 }, '-=0.3')
      .to(chips, { y: 0, opacity: 1, stagger: 0.1, duration: 0.5,
          ease: 'back.out(1.4)' }, '-=0.3')
    return tl
  },

  's-work'(el) {
    const tl     = gsap.timeline({ defaults: { ease: 'expo.out' } })
    const label  = el.querySelector('.section-label')
    const lines  = el.querySelectorAll('.section-heading .heading-line')
    const chars  = []
    lines.forEach(l => chars.push(...splitChars(l)))
    const rows   = el.querySelectorAll('.project-row')

    gsap.set(label, { x: -40, opacity: 0 })
    gsap.set(chars, { y: 100, opacity: 0, scaleY: 1.4 })
    gsap.set(rows,  { y: 35,  opacity: 0, x: -20 })

    tl.to(label, { x: 0, opacity: 1, duration: 0.5 })
      .to(chars, { y: 0, opacity: 1, scaleY: 1,
          stagger: { amount: 0.45, ease: 'power3.out' }, duration: 1.0 }, '-=0.2')
      .to(rows, { y: 0, opacity: 1, x: 0, stagger: 0.15, duration: 0.7 }, '-=0.3')
    return tl
  },

  's-exp'(el) {
    const tl     = gsap.timeline({ defaults: { ease: 'expo.out' } })
    const label  = el.querySelector('.section-label')
    const headEl = el.querySelector('.section-heading')
    const chars  = splitChars(headEl)
    const trows  = el.querySelectorAll('.timeline-row')

    gsap.set(label, { x: -40, opacity: 0 })
    gsap.set(chars, { y: 70, opacity: 0, letterSpacing: '0.4em' })
    gsap.set(trows, { x: -50, opacity: 0 })

    tl.to(label, { x: 0, opacity: 1, duration: 0.5 })
      .to(chars, { y: 0, opacity: 1, letterSpacing: '0.02em',
          stagger: { amount: 0.4, ease: 'power2.out' }, duration: 0.9 }, '-=0.2')
      .to(trows, { x: 0, opacity: 1, stagger: 0.12, duration: 0.7 }, '-=0.2')
    return tl
  },

  's-contact'(el) {
    const tl      = gsap.timeline({ defaults: { ease: 'expo.out' } })
    const lines   = el.querySelectorAll('.contact-line')
    const allChars = []
    lines.forEach(line => {
      const chars = splitChars(line)
      allChars.push(...chars)
    })
    const links  = el.querySelectorAll('.contact-link')
    const credit = el.querySelector('.footer-credit')

    gsap.set(allChars, { y: 100, opacity: 0, scaleX: 1.12 })
    gsap.set(links,    { y: 25,  opacity: 0 })
    gsap.set(credit,   { opacity: 0 })

    tl.to(allChars, { y: 0, opacity: 1, scaleX: 1,
        stagger: { amount: 0.65, ease: 'power3.out' }, duration: 1.1 })
      .to(links,  { y: 0, opacity: 1, stagger: 0.1, duration: 0.55 }, '-=0.3')
      .to(credit, { opacity: 1, duration: 0.8 }, '-=0.1')
    return tl
  },
}

// ─── Controller ───────────────────────────────────────────────────────────────

const sectionTimelines = {}    // sectionId → gsap Timeline
let lastActiveSection  = null

// ─── Public API ───────────────────────────────────────────────────────────────

export function initTextAnimations() {
  // No-op — hero animation is created by the first showSection('s-hero') call
}

export function showSection(sectionId) {
  if (lastActiveSection === sectionId) return

  const el = document.getElementById(sectionId)
  if (!el) return

  // 1. Kill & immediately hide every other section
  ;['s-hero','s-about','s-work','s-exp','s-contact'].forEach(id => {
    if (id === sectionId) return
    const other = document.getElementById(id)
    if (!other) return
    // Kill running timeline for that section
    sectionTimelines[id]?.kill()
    delete sectionTimelines[id]
    // Kill element & children tweens
    gsap.killTweensOf(other)
    other.querySelectorAll('*').forEach(c => gsap.killTweensOf(c))
    // Force invisible
    gsap.set(other, { opacity: 0 })
    other.classList.remove('active')
  })

  lastActiveSection = sectionId

  // 2. Kill any previous timeline for this section
  sectionTimelines[sectionId]?.kill()
  delete sectionTimelines[sectionId]

  // 3. Reset all children of the incoming section (clear GSAP state)
  gsap.killTweensOf(el)
  el.querySelectorAll('*').forEach(c => {
    gsap.killTweensOf(c)
    gsap.set(c, { clearProps: 'all' })
  })

  // 4. Make the section visible BEFORE the animation sets children to start state
  gsap.set(el, { opacity: 1 })
  el.classList.add('active')

  // 5. Build & play a fresh animation
  const animFn = SECTION_ANIMATIONS[sectionId]
  if (animFn) {
    sectionTimelines[sectionId] = animFn(el)
  }
}

export function hideAllSections() {
  ;['s-hero','s-about','s-work','s-exp','s-contact'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    sectionTimelines[id]?.kill()
    delete sectionTimelines[id]
    gsap.killTweensOf(el)
    el.querySelectorAll('*').forEach(c => gsap.killTweensOf(c))
    gsap.set(el, { opacity: 0 })
    el.classList.remove('active')
  })
  lastActiveSection = null
}

export function hideSection(sectionId) {
  const el = document.getElementById(sectionId)
  if (!el) return
  sectionTimelines[sectionId]?.kill()
  delete sectionTimelines[sectionId]
  gsap.killTweensOf(el)
  gsap.set(el, { opacity: 0 })
  el.classList.remove('active')
  if (lastActiveSection === sectionId) lastActiveSection = null
}

// No-op kept for any remaining import references
export function revealNav() {}
