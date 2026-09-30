import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emit, emitChars, identifier } from '../../src/core/cemit.js'
import { formats, byId, fits, optionDefaults } from '../../src/core/formats.js'
import { create } from '../../src/core/bitmap.js'
import { random, single } from './helpers.js'

const lines = s => s.split('\n')

test('a PROGMEM preset declares a const PROGMEM array', () => {
  const { declaration } = emit(single(8, 8, 0, 0), byId('gyveroled'), { name: 'logo' })
  assert.ok(lines(declaration).includes('const uint8_t logo[] PROGMEM = {'))
})

test('MD_MAX72xx declares a mutable RAM array, because setBuffer takes uint8_t*', () => {
  const { declaration } = emit(create(8, 8), byId('md_max72xx'), { name: 'a' })
  assert.ok(lines(declaration).includes('uint8_t a[] = {'))
})

test('every preset that reads with pgm_read declares const and PROGMEM', () => {
  for (const f of formats.filter(f => f.progmem)) {
    const size = f.rule?.size ?? [8, 8]
    const { declaration } = emit(create(...size), f, { name: 'x', opts: optionDefaults(f) })
    assert.match(declaration, /^const \w+ x\[\] PROGMEM = \{$/m, f.id)
  }
})

test('size constants are named after the array and hold the real size', () => {
  const { declaration } = emit(create(13, 11), byId('gyveroled'), { name: 'sprite' })
  assert.ok(lines(declaration).includes('#define SPRITE_W 13'))
  assert.ok(lines(declaration).includes('#define SPRITE_H 11'))
})

test('rows presets put one bitmap row on each line', () => {
  const { declaration } = emit(single(16, 3, 0, 1), byId('gyvermax7219'), { name: 'm' })
  const body = lines(declaration).filter(l => l.startsWith('  0x'))
  assert.deepEqual(body, ['  0x00, 0x00,', '  0x80, 0x00,', '  0x00, 0x00,'])
})

test('binary radix writes every byte as 0b with 8 digits', () => {
  const { declaration } = emit(single(8, 1, 1, 0), byId('gyvermax7219'), { name: 'm', radix: 'bin' })
  assert.ok(lines(declaration).includes('  0b01000000,'))
})

test('microLED uses the element type of its colour depth and the colour value', () => {
  const f = byId('microled')
  const d1 = emit(single(2, 1, 0, 0), f, { name: 'p', opts: { depth: 1, color: 0xff0000 } }).declaration
  assert.match(d1, /^const uint8_t p\[\] PROGMEM = \{$/m)
  assert.match(d1, /0xC0, 0x00/)
  const d3 = emit(single(2, 1, 1, 0), f, { name: 'p', opts: { depth: 3, color: 0x00ff00 } }).declaration
  assert.match(d3, /^const uint32_t p\[\] PROGMEM = \{$/m)
  assert.match(d3, /0x000000, 0x00FF00/)
})

test('usage names the array and the constants of the emitted code', () => {
  const { usage } = emit(create(16, 16), byId('gyvermax7219'), { name: 'heart' })
  assert.ok(usage.includes('mtrx.drawBitmap(0, 0, heart, HEART_W, HEART_H);'))
})

test('FastLED gets its XY helper in the declaration, serpentine by default', () => {
  const f = byId('fastled')
  const { declaration } = emit(create(8, 8), f, { name: 'a', opts: optionDefaults(f) })
  assert.match(declaration, /uint16_t XY\(uint8_t x, uint8_t y\)/)
  assert.match(declaration, /\(y & 1\)/)
})

test('LedControl on a 16x16 chain addresses four modules', () => {
  const { usage } = emit(create(16, 16), byId('ledcontrol'), { name: 'a' })
  assert.match(usage, /m < 4/)
})

test('identifier turns any text into a valid C name', () => {
  assert.equal(identifier('my logo!'), 'my_logo')
  assert.equal(identifier('8x8'), '_8x8')
  assert.equal(identifier(''), 'bitmap')
})

test('a preset refuses a size its rule does not allow', () => {
  assert.throws(() => emit(create(12, 8), byId('md_max72xx'), { name: 'a' }), /8/)
})

test('LCD characters: one row of 8 five-bit rows per slot, createChar loop', () => {
  const slots = [single(5, 8, 0, 0), create(5, 8), single(5, 8, 4, 7)]
  const { declaration, usage } = emitChars(slots, { name: 'glyphs' })
  assert.ok(lines(declaration).includes('byte glyphs[3][8] = {'))
  assert.ok(lines(declaration).some(l => l.startsWith('  { 0b10000, 0b00000,')))
  assert.ok(lines(declaration).some(l => l.includes('0b00001 }')))
  assert.match(usage, /for \(uint8_t i = 0; i < 3; i\+\+\) lcd\.createChar\(i, glyphs\[i\]\);/)
  assert.match(usage, /lcd\.write\(byte\(0\)\);/)
})

test('emit output is stable for a random picture of every preset', () => {
  for (const f of formats) {
    const [w, h] = f.rule?.size ?? [16, 8]
    if (!fits(f, w, h)) continue
    const b = random(w, h, 7)
    const a = emit(b, f, { name: 'x', opts: optionDefaults(f) })
    assert.deepEqual(emit(b, f, { name: 'x', opts: optionDefaults(f) }), a, f.id)
  }
})
