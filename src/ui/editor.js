// The pixel canvas: draws a bitmap at a whole number of device pixels per cell and turns
// pointer input into cell events. What a stroke does is main.js's business
import { color } from '../../assets/ddlc-cloud.js'

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
      grid: color('--ddlc-grid'),
      guide: color('--byte-guide'),
    }
  }

  function fit(b) {
    // The border box, scrollbar included: a scrollbar that comes and goes with the canvas
    // must not change the room the canvas is fitted to. The padding keeps the outline and
    // the offset shadow inside
    const room = Math.max(160, wrap.offsetWidth - 16)
    const tall = Math.max(160, Math.min(innerHeight * 0.62, 640))
    cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(room / b.w, tall / b.h))))
    const dpr = devicePixelRatio || 1
    canvas.style.width = `${b.w * cell}px`
    canvas.style.height = `${b.h * cell}px`
    canvas.width = Math.round(b.w * cell * dpr)
    canvas.height = Math.round(b.h * cell * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // guides: { x, y } draws a line every x columns and every y rows
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
    const { x: gx, y: gy } = opts.guides ?? {}
    ctx.fillStyle = palette.guide
    if (gx) for (let x = gx; x < b.w; x += gx) ctx.fillRect(x * cell - 1, 0, 2, H)
    if (gy) for (let y = gy; y < b.h; y += gy) ctx.fillRect(0, y * cell - 1, W, 2)
    // ghost: { bitmap, x, y }, what a click would place, drawn over the picture
    if (opts.ghost) {
      const { bitmap: g, x: ox, y: oy } = opts.ghost
      ctx.globalAlpha = 0.6
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++) if (g.data[y * g.w + x]) ctx.fillRect((ox + x) * cell, (oy + y) * cell, cell, cell)
      ctx.globalAlpha = 1
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

  // Only a new border-box width refits: the wrap's height and its scrollbars follow the
  // canvas. The refit waits for the next frame, since resizing the wrap inside its own
  // observer is a loop that WebKit reports as an error
  let width = 0
  let frame = 0
  new ResizeObserver(([entry]) => {
    const w = Math.round(entry.borderBoxSize[0].inlineSize)
    if (w === width) return
    width = w
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => shown && render(shown, { ...options, refit: true }))
  }).observe(wrap)

  return {
    render,
    recolor() {
      readPalette()
      if (shown) render(shown, options)
    },
  }
}
