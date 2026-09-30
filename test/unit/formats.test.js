import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formats, layouts, pack, unpack, byId, fits } from '../../src/core/formats.js'
import { equals } from '../../src/core/bitmap.js'
import { random, single } from './helpers.js'

// Expected bytes come from each library's drawing loop, read in its source:
// GyverGFX and Adafruit drawBitmap test 0x80 first, drawXBitmap and u8g2 XBM test 0x01 first,
// GyverOLED indexes frame[page * width + column] with bit 0 at the top of the page,
// HD44780 CGRAM rows keep the character in the low 5 bits with bit 4 on the left
test('pixel (0,0) of an 8x8 lands where each layout puts it', () => {
  const b = single(8, 8, 0, 0)
  assert.deepEqual(pack(b, layouts.rowsMsb).slice(0, 2), [0x80, 0x00])
  assert.deepEqual(pack(b, layouts.rowsLsb).slice(0, 2), [0x01, 0x00])
  assert.deepEqual(pack(b, layouts.pagesLsb).slice(0, 2), [0x01, 0x00])
  assert.deepEqual(pack(b, layouts.pagesMsb).slice(0, 2), [0x80, 0x00])
})

test('rows layout: pixel (9,1) of 16x8 is bit 6 of byte 3', () => {
  const bytes = pack(single(16, 8, 9, 1), layouts.rowsMsb)
  assert.equal(bytes.length, 16)
  assert.equal(bytes[3], 0x40)
  assert.equal(bytes.filter(Boolean).length, 1)
})

test('rows layout pads each row to a whole byte', () => {
  const bytes = pack(single(13, 2, 12, 1), layouts.rowsMsb)
  assert.equal(bytes.length, 4)
  assert.equal(bytes[3], 0x08)
})

test('pages layout: pixel (3,9) of 16x16 is bit 1 of byte 19', () => {
  const bytes = pack(single(16, 16, 3, 9), layouts.pagesLsb)
  assert.equal(bytes.length, 32)
  assert.equal(bytes[19], 0x02)
  assert.equal(bytes.filter(Boolean).length, 1)
})

test('pages layout pads the height up to a whole page', () => {
  assert.equal(pack(single(5, 11, 0, 10), layouts.pagesLsb).length, 10)
})

test('LCD character: pixel (0,0) is bit 4, pixel (4,7) is bit 0 of the last row', () => {
  assert.deepEqual(pack(single(5, 8, 0, 0), layouts.char5), [0x10, 0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(pack(single(5, 8, 4, 7), layouts.char5), [0, 0, 0, 0, 0, 0, 0, 0x01])
})

test('per-pixel layout is row-major, top row first, one value per pixel', () => {
  const values = pack(single(3, 2, 1, 1), layouts.pixels, { on: 0xff00ff })
  assert.deepEqual(values, [0, 0, 0, 0, 0xff00ff, 0])
})

for (const [name, layout] of Object.entries(layouts)) {
  for (const [w, h] of [[1, 1], [5, 8], [13, 11], [128, 64], [256, 256]]) {
    if (layout.bits === 5 && w > 5) continue
    test(`${name} round-trips a random ${w}x${h}`, () => {
      const b = random(w, h, w * 1000 + h)
      assert.ok(equals(unpack(pack(b, layout, { on: 1 }), w, h, layout), b))
    })
  }
}

test('every preset names a known layout, a unique id and a usage line', () => {
  const ids = new Set()
  for (const f of formats) {
    assert.ok(Object.values(layouts).includes(f.layout), f.id)
    assert.ok(!ids.has(f.id), `duplicate ${f.id}`)
    ids.add(f.id)
    const lines = f.usage({ name: 'img', W: 'IMG_W', H: 'IMG_H', w: 8, h: 8, opts: {} })
    assert.ok(Array.isArray(lines) && lines.length > 0, f.id)
    assert.match(lines.join('\n'), /img/, f.id)
    assert.doesNotMatch(lines.join('\n'), /undefined|NaN/, f.id)
  }
})

test('byId finds a preset and refuses an unknown one', () => {
  assert.equal(byId('gyveroled').lib, 'GyverOLED')
  assert.equal(byId('nope'), undefined)
})

test('size constraints: MD_MAX72xx takes one row of modules only', () => {
  const md = byId('md_max72xx')
  assert.ok(fits(md, 32, 8))
  assert.ok(!fits(md, 16, 16))
  assert.ok(!fits(md, 12, 8))
  assert.ok(fits(byId('gyveroled'), 13, 11))
})

test('noob presets are LED-matrix presets that accept 8x8 or 16x16', () => {
  const noob = formats.filter(f => f.noob)
  assert.ok(noob.length >= 5)
  for (const f of noob) {
    assert.equal(f.group, 'LED matrix', f.id)
    assert.ok(fits(f, 8, 8) || fits(f, 16, 16), f.id)
  }
})
