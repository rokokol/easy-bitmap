import { test } from 'node:test'
import assert from 'node:assert/strict'
import { algorithms, adjust, dither, luminance } from '../../src/core/dither.js'
import { toRows } from '../../src/core/bitmap.js'

const flat = (w, h, v) => new Float32Array(w * h).fill(v)
const lit = b => b.data.reduce((a, v) => a + v, 0)

function gradient(w, h) {
  const l = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) l[y * w + x] = x / (w - 1)
  return l
}

for (const algorithm of Object.keys(algorithms)) {
  test(`${algorithm}: black lights everything, white nothing`, () => {
    assert.equal(lit(dither(flat(9, 7, 0), 9, 7, { algorithm })), 63)
    assert.equal(lit(dither(flat(9, 7, 1), 9, 7, { algorithm })), 0)
  })

  test(`${algorithm}: the same input gives the same output`, () => {
    const g = gradient(32, 8)
    assert.deepEqual(dither(g, 32, 8, { algorithm }).data, dither(g, 32, 8, { algorithm }).data)
  })
}

test('bayer2 turns 50% grey into a checkerboard', () => {
  assert.deepEqual(toRows(dither(flat(4, 2, 0.5), 4, 2, { algorithm: 'bayer2' })), ['.#.#', '#.#.'])
})

for (const algorithm of ['floyd', 'stucki', 'sierra', 'bayer4', 'bayer8']) {
  test(`${algorithm} keeps the average darkness of a flat grey`, () => {
    for (const v of [0.2, 0.5, 0.7]) {
      const share = lit(dither(flat(64, 64, v), 64, 64, { algorithm })) / 4096
      assert.ok(Math.abs(share - (1 - v)) < 0.03, `${v}: ${share}`)
    }
  })
}

test('threshold splits at the threshold knob', () => {
  const l = new Float32Array([0.3, 0.6])
  assert.deepEqual(toRows(dither(l, 2, 1, { algorithm: 'threshold', threshold: 0.5 })), ['#.'])
  assert.deepEqual(toRows(dither(l, 2, 1, { algorithm: 'threshold', threshold: 0.7 })), ['##'])
})

test('serpentine changes error diffusion but not a plain threshold', () => {
  const g = gradient(32, 16)
  const on = dither(g, 32, 16, { algorithm: 'floyd', serpentine: true })
  const off = dither(g, 32, 16, { algorithm: 'floyd', serpentine: false })
  assert.notDeepEqual(on.data, off.data)
  assert.deepEqual(
    dither(g, 32, 16, { algorithm: 'threshold', serpentine: true }).data,
    dither(g, 32, 16, { algorithm: 'threshold', serpentine: false }).data,
  )
})

test('adjust with neutral knobs changes nothing', () => {
  const g = gradient(16, 1)
  const a = adjust(g, { brightness: 0, contrast: 0, gamma: 1, invert: false })
  a.forEach((v, i) => assert.ok(Math.abs(v - g[i]) < 1e-6))
})

test('adjust: invert mirrors, full brightness whitens, full negative darkens', () => {
  const g = gradient(16, 1)
  adjust(g, { invert: true }).forEach((v, i) => assert.ok(Math.abs(v - (1 - g[i])) < 1e-6))
  assert.ok(adjust(g, { brightness: 1 }).every(v => v === 1))
  assert.ok(adjust(g, { brightness: -1 }).every(v => v === 0))
})

test('adjust: more contrast pushes values away from the middle, gamma bends midtones', () => {
  const g = new Float32Array([0.25, 0.75])
  const c = adjust(g, { contrast: 0.5 })
  assert.ok(c[0] < 0.25 && c[1] > 0.75)
  assert.ok(adjust(new Float32Array([0.5]), { gamma: 2 })[0] > 0.5)
  assert.ok(adjust(new Float32Array([0.5]), { gamma: 0.5 })[0] < 0.5)
})

test('luminance weighs green most and composes alpha over the chosen background', () => {
  const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 0])
  const onWhite = luminance(rgba, 3, 1, 'white')
  assert.ok(onWhite[1] > onWhite[0])
  assert.equal(onWhite[2], 1)
  assert.equal(luminance(rgba, 3, 1, 'black')[2], 0)
})
