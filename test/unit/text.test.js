import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { glyphIndex, loadFont, renderFont } from '../../src/core/text.js'
import { toRows } from '../../src/core/bitmap.js'

const font = loadFont(readFileSync(new URL('../../assets/font5x8.h', import.meta.url), 'utf8'))

// The table in font5x8.h: ASCII from the space, then А..Я, а..я and ё
test('characters map to their rows of the font table', () => {
  assert.equal(glyphIndex(' '), 0)
  assert.equal(glyphIndex('A'), 33)
  assert.equal(glyphIndex('~'), 94)
  assert.equal(glyphIndex('А'), 95)
  assert.equal(glyphIndex('Я'), 126)
  assert.equal(glyphIndex('а'), 127)
  assert.equal(glyphIndex('я'), 158)
  assert.equal(glyphIndex('ё'), 159)
})

test('Ё prints as Е and a character the font lacks prints nothing, as GyverGFX does', () => {
  assert.equal(glyphIndex('Ё'), glyphIndex('Е'))
  assert.equal(glyphIndex('€'), undefined)
  assert.equal(renderFont('€', font).w, 0)
})

test('the font has every glyph the index names, five columns each', () => {
  assert.equal(font.length, 160)
  assert.ok(font.every(g => g.length === 5))
})

test('a glyph is 6 columns wide with its spacing column, 8 rows tall, bit 0 on top', () => {
  const b = renderFont('!', font)
  assert.equal(b.w, 6)
  assert.equal(b.h, 8)
  // "!" is 0x6f in its middle column: rows 0-3 and 5-6 lit
  assert.deepEqual(toRows(b).map(r => r[2]), ['#', '#', '#', '#', '.', '#', '#', '.'])
  assert.ok(toRows(b).every(r => r[5] === '.'))
})

test('each character advances 6 columns, a new line 8 rows', () => {
  assert.equal(renderFont('abc', font).w, 18)
  const two = renderFont('ab\nc', font)
  assert.equal(two.w, 12)
  assert.equal(two.h, 16)
})

test('scale enlarges every pixel into a square', () => {
  const one = renderFont('A', font)
  const two = renderFont('A', font, 2)
  assert.equal(two.w, 12)
  assert.equal(two.h, 16)
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 12; x++) assert.equal(two.data[y * 12 + x], one.data[(y >> 1) * 6 + (x >> 1)])
})
