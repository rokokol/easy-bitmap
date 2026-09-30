import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeBitmap, encodeChars, decodeHash } from '../../src/core/hash.js'
import { equals } from '../../src/core/bitmap.js'
import { random } from './helpers.js'

for (const [w, h] of [[1, 1], [8, 8], [13, 11], [128, 64], [256, 256]]) {
  test(`a ${w}x${h} bitmap and its preset survive the hash`, () => {
    const b = random(w, h, w + h)
    const d = decodeHash(encodeBitmap(b, 'gyveroled'))
    assert.equal(d.kind, 'bitmap')
    assert.equal(d.format, 'gyveroled')
    assert.ok(equals(d.bitmap, b))
  })
}

test('LCD characters survive the hash', () => {
  const slots = [random(5, 8, 1), random(5, 8, 2)]
  const d = decodeHash(encodeChars(slots))
  assert.equal(d.kind, 'chars')
  assert.equal(d.slots.length, 2)
  d.slots.forEach((s, i) => assert.ok(equals(s, slots[i])))
})

test('the hash is URL-safe', () => {
  assert.match(encodeBitmap(random(64, 64, 9), 'u8g2'), /^[A-Za-z0-9._-]+$/)
})

test('a leading # is accepted', () => {
  assert.equal(decodeHash('#' + encodeBitmap(random(3, 3), 'u8g2')).kind, 'bitmap')
})

// AAAA is valid base64 of 3 bytes, where an 8x8 needs 8: a link cut short
for (const bad of ['', 'x', '1.b.8.8.u8g2.AAAA', '1.c.2.AAAAAAAAAAA', '1.b.8.8.nope.AAAAAAAAAAA', '2.b.8.8.u8g2.AA', '1.b.8.8.u8g2.A', '1.b.0.8.u8g2.', '1.b.999.8.u8g2.AA', '1.c.9.AAAA', '1.q.1']) {
  test(`"${bad}" is rejected, not half-read`, () => {
    assert.equal(decodeHash(bad), undefined)
  })
}
