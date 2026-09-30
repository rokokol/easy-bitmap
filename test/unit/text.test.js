import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fonts, gyverIndex, adafruitIndex, loadFont, renderFont } from '../../src/core/text.js'
import { toRows } from '../../src/core/bitmap.js'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const gyver = loadFont(read('assets/font5x8.h'))
const adafruit = loadFont(read('assets/glcdfont.c'))

// The table in font5x8.h: ASCII from the space, then А..Я, а..я and ё
test('GyverGFX: characters map to their rows of the font table', () => {
  assert.equal(gyverIndex(' '), 0)
  assert.equal(gyverIndex('A'), 33)
  assert.equal(gyverIndex('~'), 94)
  assert.equal(gyverIndex('А'), 95)
  assert.equal(gyverIndex('Я'), 126)
  assert.equal(gyverIndex('а'), 127)
  assert.equal(gyverIndex('я'), 158)
  assert.equal(gyverIndex('ё'), 159)
})

test('GyverGFX: Ё prints as Е and a character the font lacks prints nothing', () => {
  assert.equal(gyverIndex('Ё'), gyverIndex('Е'))
  assert.equal(gyverIndex('€'), undefined)
  assert.equal(renderFont('€', gyver, 1, gyverIndex).w, 0)
})

// glcdfont.c holds 256 glyphs indexed by the byte itself; the text tool offers its ASCII
test('Adafruit GFX: an ASCII character is its own row, anything else is left out', () => {
  assert.equal(adafruitIndex('A'), 65)
  assert.equal(adafruitIndex(' '), 32)
  assert.equal(adafruitIndex('~'), 126)
  assert.equal(adafruitIndex('Ж'), undefined)
  assert.equal(adafruitIndex('\u0007'), undefined)
})

test('each font file holds every glyph its index can name, five columns each', () => {
  assert.equal(gyver.length, 160)
  assert.equal(adafruit.length, 256)
  assert.ok([...gyver, ...adafruit].every(g => g.length === 5))
})

test('every bitmap font of the registry names its file and its index', () => {
  const files = fonts.filter(f => f.file)
  assert.deepEqual(files.map(f => f.id).sort(), ['adafruit5x7', 'gyver5x8'])
  assert.ok(files.every(f => typeof f.index === 'function'))
})

test('a glyph is 6 columns wide with its spacing column, 8 rows tall, bit 0 on top', () => {
  const b = renderFont('!', gyver, 1, gyverIndex)
  assert.equal(b.w, 6)
  assert.equal(b.h, 8)
  // "!" is 0x6f in its middle column: rows 0-3 and 5-6 lit
  assert.deepEqual(toRows(b).map(r => r[2]), ['#', '#', '#', '#', '.', '#', '#', '.'])
  assert.ok(toRows(b).every(r => r[5] === '.'))
})

test('each character advances 6 columns, a new line 8 rows', () => {
  assert.equal(renderFont('abc', gyver, 1, gyverIndex).w, 18)
  const two = renderFont('ab\nc', adafruit, 1, adafruitIndex)
  assert.equal(two.w, 12)
  assert.equal(two.h, 16)
})

test('scale enlarges every pixel into a square', () => {
  const one = renderFont('A', gyver, 1, gyverIndex)
  const two = renderFont('A', gyver, 2, gyverIndex)
  assert.equal(two.w, 12)
  assert.equal(two.h, 16)
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 12; x++) assert.equal(two.data[y * 12 + x], one.data[(y >> 1) * 6 + (x >> 1)])
})
