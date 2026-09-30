// The pure half of image import: lightness from pixels, the tone knobs, and the 1-bit
// conversion. Lightness runs from 0 (black) to 1 (white); a dark source pixel becomes lit
import { create } from './bitmap.js'

// Error-diffusion kernels as [dx, dy, weight], weights over `div`
const kernels = {
  floyd: { div: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
  // Atkinson spreads only 6/8 of the error on purpose: highlights and shadows clip harder
  atkinson: { div: 8, taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
  stucki: {
    div: 42,
    taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]],
  },
  sierra: {
    div: 32,
    taps: [[1, 0, 5], [2, 0, 3], [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2], [-1, 2, 2], [0, 2, 3], [1, 2, 2]],
  },
}

// Recursive Bayer matrix of side n (a power of two)
function bayer(n) {
  if (n === 1) return [[0]]
  const m = bayer(n / 2)
  const h = n / 2
  const out = Array.from({ length: n }, () => new Array(n))
  for (let y = 0; y < h; y++)
    for (let x = 0; x < h; x++) {
      const v = 4 * m[y][x]
      out[y][x] = v
      out[y][x + h] = v + 2
      out[y + h][x] = v + 3
      out[y + h][x + h] = v + 1
    }
  return out
}

// Thresholds in (0, 1) of an n x n Bayer matrix, shared with the background cloud
export function bayerThresholds(n) {
  return bayer(n).map(row => row.map(v => (v + 0.5) / (n * n)))
}

export const algorithms = {
  threshold: 'Threshold',
  floyd: 'Floyd–Steinberg',
  atkinson: 'Atkinson',
  stucki: 'Stucki',
  sierra: 'Sierra',
  bayer2: 'Bayer 2×2',
  bayer4: 'Bayer 4×4',
  bayer8: 'Bayer 8×8',
}

const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v)

// Rec. 709 luma of RGBA bytes, alpha composed over a white or black background
export function luminance(rgba, w, h, background = 'white') {
  const bg = background === 'black' ? 0 : 1
  const out = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3] / 255
    const c = k => (rgba[i * 4 + k] / 255) * a + bg * (1 - a)
    out[i] = clamp(0.2126 * c(0) + 0.7152 * c(1) + 0.0722 * c(2))
  }
  return out
}

// brightness and contrast in [-1, 1], gamma > 0 (above 1 lightens midtones)
export function adjust(lum, { brightness = 0, contrast = 0, gamma = 1, invert = false } = {}) {
  const c = Math.min(contrast, 0.99)
  const k = c >= 0 ? 1 / (1 - c) : 1 + c
  return lum.map(v => {
    let t = clamp(v + brightness)
    t = clamp((t - 0.5) * k + 0.5)
    t = Math.pow(t, 1 / gamma)
    return invert ? 1 - t : t
  })
}

export function dither(lum, w, h, { algorithm = 'floyd', threshold = 0.5, serpentine = true } = {}) {
  const b = create(w, h)
  if (algorithm.startsWith('bayer')) {
    const n = +algorithm.slice(5)
    const m = bayerThresholds(n)
    const shift = threshold - 0.5
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) b.data[y * w + x] = lum[y * w + x] < m[y % n][x % n] + shift ? 1 : 0
    return b
  }
  if (algorithm === 'threshold' || !kernels[algorithm]) {
    for (let i = 0; i < w * h; i++) b.data[i] = lum[i] < threshold ? 1 : 0
    return b
  }
  const { div, taps } = kernels[algorithm]
  const buf = Float32Array.from(lum)
  for (let y = 0; y < h; y++) {
    const back = serpentine && y % 2 === 1
    for (let i = 0; i < w; i++) {
      const x = back ? w - 1 - i : i
      const old = buf[y * w + x]
      const on = old < threshold
      b.data[y * w + x] = on ? 1 : 0
      const err = old - (on ? 0 : 1)
      for (const [dx, dy, wt] of taps) {
        const nx = x + (back ? -dx : dx)
        const ny = y + dy
        if (nx >= 0 && nx < w && ny < h) buf[ny * w + nx] += (err * wt) / div
      }
    }
  }
  return b
}
