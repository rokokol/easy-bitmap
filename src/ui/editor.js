// The pixel canvas: draws a bitmap at a whole number of device pixels per cell and turns
// pointer input into cell events. What a stroke does is main.js's business
import { color } from './colors.js'

const MIN_CELL = 2
const MAX_CELL = 48

export function createEditor(canvas, wrap, { onStart, onMove, onEnd, onHover }) {
  const ctx = canvas.getContext('2d')
  let cell = 8
  let shown
  let options = {}
  let active = null
  let palette

  function readPalette() {
    palette = {
      off: color('--cell-off'),
      on: color('--cell-on'),
      grid: color('--grid'),
      guide: color('--byte-guide'),
    }
  }

  function fit(b) {
    // The wrap's padding leaves room for the outline and the offset shadow
    const room = Math.max(160, wrap.clientWidth - 16)
    const tall = Math.max(160, Math.min(innerHeight * 0.62, 640))
    cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(room / b.w, tall / b.h))))
    const dpr = devicePixelRatio || 1
    canvas.style.width = `${b.w * cell}px`
    canvas.style.height = `${b.h * cell}px`
    canvas.width = Math.round(b.w * cell * dpr)
    canvas.height = Math.round(b.h * cell * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // guides: 'x' marks every 8 columns (row-major bytes), 'y' every 8 rows (pages)
  function render(b, opts = {}) {
    if (!palette) readPalette()
    if (!shown || shown.w !== b.w || shown.h !== b.h || opts.refit) fit(b)
    shown = b
    options = opts
    const W = b.w * cell
    const H = b.h * cell
    ctx.fillStyle = palette.off
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = palette.on
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) if (b.data[y * b.w + x]) ctx.fillRect(x * cell, y * cell, cell, cell)
    if (cell >= 6) {
      ctx.fillStyle = palette.grid
      for (let x = 1; x < b.w; x++) ctx.fillRect(x * cell, 0, 1, H)
      for (let y = 1; y < b.h; y++) ctx.fillRect(0, y * cell, W, 1)
    }
    if (opts.guides) {
      ctx.fillStyle = palette.guide
      if (opts.guides === 'x') for (let x = 8; x < b.w; x += 8) ctx.fillRect(x * cell - 1, 0, 2, H)
      if (opts.guides === 'y') for (let y = 8; y < b.h; y += 8) ctx.fillRect(0, y * cell - 1, W, 2)
    }
  }

  function cellAt(e) {
    const r = canvas.getBoundingClientRect()
    return { x: Math.floor((e.clientX - r.left) / cell), y: Math.floor((e.clientY - r.top) / cell) }
  }

  canvas.addEventListener('contextmenu', e => e.preventDefault())

  canvas.addEventListener('pointerdown', e => {
    if (active || (e.button !== 0 && e.button !== 2)) return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    active = e.pointerId
    onStart(cellAt(e), e.button === 2 ? 'secondary' : 'primary', e)
  })

  canvas.addEventListener('pointermove', e => {
    const p = cellAt(e)
    onHover(p)
    if (e.pointerId !== active) return
    // Coalesced events keep fast strokes continuous on high-rate pointers
    for (const ev of e.getCoalescedEvents?.() ?? [e]) onMove(cellAt(ev))
  })

  const finish = e => {
    if (e.pointerId !== active) return
    active = null
    onEnd()
  }
  canvas.addEventListener('pointerup', finish)
  canvas.addEventListener('pointercancel', finish)
  canvas.addEventListener('pointerleave', () => onHover(null))

  new ResizeObserver(() => shown && render(shown, { ...options, refit: true })).observe(wrap)

  return {
    render,
    recolor() {
      readPalette()
      if (shown) render(shown, options)
    },
  }
}
