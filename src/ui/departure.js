// Departure Mono as a bitmap. The font is drawn on an 11 px grid, and at exactly 11 px a
// canvas renders it without a single partial pixel, so the glyphs are read at that size and
// enlarged by whole pixels, the way a display library scales its font
import { create, scale } from '../core/bitmap.js'

const SIZE = 11
const FONT = `${SIZE}px "Departure Mono"`

export function loadDeparture() {
  return document.fonts.load(FONT)
}

export function renderDeparture(text, n = 1) {
  const lines = text.split('\n')
  const probe = new OffscreenCanvas(1, 1).getContext('2d')
  probe.font = FONT
  const w = Math.ceil(Math.max(0, ...lines.map(l => probe.measureText(l).width)))
  const h = lines.length * SIZE
  if (!w) return create(0, h)
  const ctx = new OffscreenCanvas(w, h).getContext('2d')
  ctx.font = FONT
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => ctx.fillText(line, 0, i * SIZE))
  const alpha = ctx.getImageData(0, 0, w, h).data
  const b = create(w, h)
  for (let i = 0; i < w * h; i++) b.data[i] = alpha[i * 4 + 3] > 127 ? 1 : 0
  return n === 1 ? b : scale(b, n)
}
