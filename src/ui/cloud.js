// The background: a ball of pixels on a fixed 6 px lattice that trails the pointer on a
// spring. Its edge dissolves by ordered dithering: a cell is lit when the density at its
// distance, 1 - (d / R)^2, beats that cell's threshold in an 8x8 Bayer matrix. It draws
// only while something moves, and not at all under prefers-reduced-motion
import { color } from './colors.js'
import { bayerThresholds } from '../core/dither.js'

const CELL = 6
const RADIUS = 150
const STIFFNESS = 0.08
const DAMPING = 0.72
const BAYER = bayerThresholds(8)

export function startCloud(canvas) {
  const ctx = canvas.getContext('2d')
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  const target = { x: innerWidth / 2, y: innerHeight / 2 }
  const centre = { ...target }
  const speed = { x: 0, y: 0 }
  let size = 0
  let shown = false
  let frame = 0
  let fill = color('--cloud')

  function resize() {
    const dpr = devicePixelRatio || 1
    canvas.width = Math.round(innerWidth * dpr)
    canvas.height = Math.round(innerHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }

  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    if (size < 0.02) return
    const r = RADIUS * size
    ctx.fillStyle = fill
    const i0 = Math.max(0, Math.floor((centre.x - r) / CELL))
    const i1 = Math.ceil((centre.x + r) / CELL)
    const j0 = Math.max(0, Math.floor((centre.y - r) / CELL))
    const j1 = Math.ceil((centre.y + r) / CELL)
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * CELL - centre.x
        const dy = (j + 0.5) * CELL - centre.y
        const density = 1 - (dx * dx + dy * dy) / (r * r)
        if (density > BAYER[j & 7][i & 7]) ctx.fillRect(i * CELL, j * CELL, CELL - 1, CELL - 1)
      }
  }

  function step() {
    speed.x = (speed.x + (target.x - centre.x) * STIFFNESS) * DAMPING
    speed.y = (speed.y + (target.y - centre.y) * STIFFNESS) * DAMPING
    centre.x += speed.x
    centre.y += speed.y
    size += ((shown ? 1 : 0) - size) * 0.12
    draw()
    const moving = Math.abs(speed.x) + Math.abs(speed.y) > 0.05 || Math.abs((shown ? 1 : 0) - size) > 0.01
    frame = moving && !document.hidden ? requestAnimationFrame(step) : 0
  }

  function kick() {
    if (still.matches) return
    if (!frame) frame = requestAnimationFrame(step)
  }

  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && !e.buttons) return
    target.x = e.clientX
    target.y = e.clientY
    shown = true
    kick()
  })
  addEventListener('pointerdown', e => {
    target.x = e.clientX
    target.y = e.clientY
    shown = true
    kick()
  })
  addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch') return
    shown = false
    kick()
  })
  document.documentElement.addEventListener('pointerleave', () => {
    shown = false
    kick()
  })
  addEventListener('resize', resize)
  still.addEventListener('change', () => (still.matches ? ((size = 0), draw()) : kick()))
  resize()

  return {
    recolor() {
      fill = color('--cloud')
      draw()
    },
  }
}
