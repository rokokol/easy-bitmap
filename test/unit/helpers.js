import { create, set } from '../../src/core/bitmap.js'

// Builds a bitmap from rows of '#' (on) and '.' (off), so a test states its picture
export function art(...rows) {
  const b = create(rows[0].length, rows.length)
  rows.forEach((row, y) => [...row].forEach((c, x) => set(b, x, y, c === '#' ? 1 : 0)))
  return b
}

// Deterministic pseudo-random bitmap (mulberry32), so a failure reproduces
export function random(w, h, seed = 1) {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const b = create(w, h)
  for (let i = 0; i < b.data.length; i++) b.data[i] = next() < 0.5 ? 1 : 0
  return b
}

export function single(w, h, x, y) {
  const b = create(w, h)
  set(b, x, y, 1)
  return b
}
