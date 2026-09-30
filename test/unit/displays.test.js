import { test } from 'node:test'
import assert from 'node:assert/strict'
import { displays, visibleDisplays, visibleFormats, tools, visibleTools, NOOB_SIZES } from '../../src/core/displays.js'
import { byId, fits } from '../../src/core/formats.js'

test('every display names a default preset that accepts its size', () => {
  for (const d of displays) {
    const f = byId(d.format)
    assert.ok(f, d.id)
    assert.ok(fits(f, d.w, d.h), d.id)
  }
})

test('noob mode shows only the 8x8 and 16x16 LED matrices', () => {
  const shown = visibleDisplays(true)
  assert.deepEqual(shown.map(d => [d.w, d.h]).sort(), NOOB_SIZES.map(s => [...s]).sort())
  assert.ok(shown.every(d => d.kind === 'led'))
  assert.ok(visibleDisplays(false).length > shown.length)
})

test('noob mode lists only LED-matrix presets that take the current size', () => {
  const at16 = visibleFormats(true, 16, 16)
  assert.ok(at16.length > 0)
  assert.ok(at16.every(f => f.group === 'LED matrix' && fits(f, 16, 16)))
  assert.ok(!at16.some(f => f.id === 'md_max72xx'))
  assert.ok(visibleFormats(true, 8, 8).some(f => f.id === 'md_max72xx'))
  assert.ok(visibleFormats(false, 128, 64).some(f => f.id === 'gyveroled'))
  assert.ok(!visibleFormats(false, 128, 64).some(f => f.id === 'hd44780'))
})

test('noob mode keeps exactly the basic tools', () => {
  const basic = visibleTools(true).map(t => t.id)
  assert.deepEqual(basic.sort(), ['pen', 'eraser'].sort())
  assert.ok(visibleTools(false).length > basic.length)
  assert.ok(tools.every(t => t.key && t.label))
})
