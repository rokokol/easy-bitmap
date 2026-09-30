import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, inferSize, decode, ParseError } from '../../src/core/cparse.js'
import { emit, emitChars } from '../../src/core/cemit.js'
import { formats, byId, fits, optionDefaults } from '../../src/core/formats.js'
import { equals } from '../../src/core/bitmap.js'
import { random } from './helpers.js'

test('reads hex, binary, Arduino B-binary and decimal literals', () => {
  const [a] = parse('uint8_t a[] = {0x0F, 0b101, B11, 12, 0XfF};').arrays
  assert.deepEqual(a.values, [15, 5, 3, 12, 255])
})

test('reads a bare list without a declaration', () => {
  assert.deepEqual(parse('0x01, 0x02\n0x03').arrays[0].values, [1, 2, 3])
})

test('ignores comments, PROGMEM, const and static', () => {
  const src = `// logo 8x2
  static const unsigned char logo[] PROGMEM = { /* first */ 0x01, // row
    0x02 };`
  const [a] = parse(src).arrays
  assert.equal(a.name, 'logo')
  assert.deepEqual(a.values, [1, 2])
})

test('keeps the dimensions of a 2D array', () => {
  const [a] = parse('byte chars[2][8] = {{1,2,3,4,5,6,7,8},{0,0,0,0,0,0,0,1}};').arrays
  assert.deepEqual(a.dims, [2, 8])
  assert.equal(a.values.length, 16)
})

test('finds several arrays and the size constants', () => {
  const p = parse('#define ICON_W 13\nconst int ICON_H = 11;\nuint8_t icon[] = {1};\nuint8_t b[] = {2, 3};')
  assert.deepEqual(p.arrays.map(a => a.name), ['icon', 'b'])
  assert.equal(p.defines.ICON_W, 13)
  assert.equal(p.defines.ICON_H, 11)
})

test('an unknown token is an error that names it, never an empty picture', () => {
  assert.throws(() => parse('{0x01, foo, 0x02}'), e => e instanceof ParseError && /foo/.test(e.message))
  assert.throws(() => parse('   '), ParseError)
  assert.throws(() => parse('{0x01, 0x02'), ParseError)
})

test('size comes from the constants first', () => {
  const p = parse('#define A_W 16\n#define A_H 8\nuint8_t a[] = {' + '0,'.repeat(16) + '};')
  assert.deepEqual(inferSize(p, p.arrays[0], byId('gyvermax7219')).size, [16, 8])
})

test('size comes from a WxH comment when there are no constants', () => {
  const p = parse('// 16x8 heart\nuint8_t a[] = {' + '0,'.repeat(16) + '};')
  assert.deepEqual(inferSize(p, p.arrays[0], byId('gyvermax7219')).size, [16, 8])
})

test('size falls back to the current size when the length matches it', () => {
  const p = parse('{' + '0,'.repeat(8) + '}')
  assert.deepEqual(inferSize(p, p.arrays[0], byId('gyvermax7219'), [8, 8]).size, [8, 8])
})

test('an ambiguous length offers the sizes that fit it', () => {
  const p = parse('{' + '0,'.repeat(8) + '}')
  const r = inferSize(p, p.arrays[0], byId('gyvermax7219'), [16, 16])
  assert.equal(r.size, undefined)
  assert.ok(r.candidates.some(([w, h]) => w === 8 && h === 8))
  assert.ok(r.candidates.some(([w, h]) => w === 16 && h === 4))
})

for (const f of formats.filter(f => f.id !== 'hd44780')) {
  for (const radix of ['hex', 'bin']) {
    test(`${f.id} (${radix}): parse and decode return what emit wrote`, () => {
      const [w, h] = fits(f, 16, 8) ? [16, 8] : [8, 8]
      const b = random(w, h, 11)
      const opts = optionDefaults(f)
      const code = emit(b, f, { name: 'pic', radix, opts }).declaration
      const p = parse(code)
      const a = p.arrays.find(x => x.name === 'pic')
      const size = inferSize(p, a, f).size
      assert.deepEqual(size, [w, h])
      assert.ok(equals(decode(a, f, ...size), b))
    })
  }
}

test('LCD characters round-trip through emitChars and parse', () => {
  const slots = [random(5, 8, 1), random(5, 8, 2), random(5, 8, 3)]
  const p = parse(emitChars(slots, { name: 'g' }).declaration)
  const a = p.arrays[0]
  assert.deepEqual(a.dims, [3, 8])
  for (let i = 0; i < 3; i++) {
    assert.ok(equals(decode({ values: a.values.slice(i * 8, i * 8 + 8) }, byId('hd44780'), 5, 8), slots[i]))
  }
})
