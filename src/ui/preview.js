// A picture of the picture on its hardware: an OLED panel, an LED matrix, a mono LCD, or a
// 16x2 character LCD with the custom characters in its first row
import { color } from './colors.js'

const MAX_WIDTH = 264

function setup(canvas, w, h) {
  const dpr = devicePixelRatio || 1
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

const looks = {
  oled: () => ({ ground: color('--ddlc-ink'), on: color('--ddlc-sayori-eye'), off: null, round: false }),
  led: () => ({ ground: color('--ddlc-ink'), on: color('--ddlc-bow'), off: color('--ddlc-yuri-shadow'), round: true }),
  lcd: () => ({ ground: color('--ddlc-ash'), on: color('--ddlc-ink'), off: null, round: false }),
}

export function renderBitmapPreview(canvas, b, kind) {
  const look = (looks[kind] ?? looks.oled)()
  const s = Math.max(1, Math.min(16, Math.floor(MAX_WIDTH / b.w)))
  const pad = Math.max(4, s)
  const ctx = setup(canvas, b.w * s + 2 * pad, b.h * s + 2 * pad)
  ctx.fillStyle = look.ground
  ctx.fillRect(0, 0, b.w * s + 2 * pad, b.h * s + 2 * pad)
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const lit = b.data[y * b.w + x]
      if (!lit && !look.off) continue
      ctx.fillStyle = lit ? look.on : look.off
      const px = pad + x * s
      const py = pad + y * s
      if (look.round && s >= 4) {
        ctx.beginPath()
        ctx.arc(px + s / 2, py + s / 2, s * 0.38, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const gap = s >= 3 ? 1 : 0
        ctx.fillRect(px, py, s - gap, s - gap)
      }
    }
}

// A 16x2 HD44780: 5x8 cells, a dot gap inside, a wider gap between cells
export function renderCharsPreview(canvas, slots) {
  const s = 3
  const cellW = 5 * s + 3
  const cellH = 8 * s + 5
  const pad = 8
  const cols = 16
  const rows = 2
  const W = cols * cellW + 2 * pad
  const H = rows * cellH + 2 * pad
  const ctx = setup(canvas, W, H)
  const ground = color('--ddlc-skirt')
  const dim = color('color-mix(in srgb, var(--ddlc-paper) 12%, var(--ddlc-skirt))')
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, W, H)
  const lit = color('--ddlc-paper')
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const glyph = r === 0 ? slots[c] : undefined
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 5; x++) {
          ctx.fillStyle = glyph && glyph.data[y * 5 + x] ? lit : dim
          ctx.fillRect(pad + c * cellW + x * s, pad + r * cellH + y * s, s - 1, s - 1)
        }
    }
}
