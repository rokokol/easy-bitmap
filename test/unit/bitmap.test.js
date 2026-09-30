import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as B from '../../src/core/bitmap.js'
import { art, random } from './helpers.js'

const rows = b => B.toRows(b)

test('create gives an empty bitmap of the asked size', () => {
  const b = B.create(3, 2)
  assert.equal(b.w, 3)
  assert.equal(b.h, 2)
  assert.deepEqual(rows(b), ['...', '...'])
})

test('set and get ignore coordinates outside the bitmap', () => {
  const b = B.create(2, 2)
  B.set(b, 5, 0, 1)
  B.set(b, -1, 0, 1)
  assert.equal(B.get(b, 5, 0), 0)
  assert.deepEqual(rows(b), ['..', '..'])
})

test('rotate90 turns clockwise and swaps width and height', () => {
  const r = B.rotate90(art('##.', '...'))
  assert.equal(r.w, 2)
  assert.equal(r.h, 3)
  assert.deepEqual(rows(r), ['.#', '.#', '..'])
})

test('four rotations, two flips, two inversions return the original', () => {
  const b = random(13, 7, 3)
  assert.ok(B.equals(B.rotate90(B.rotate90(B.rotate90(B.rotate90(b)))), b))
  assert.ok(B.equals(B.flipH(B.flipH(b)), b))
  assert.ok(B.equals(B.flipV(B.flipV(b)), b))
  assert.ok(B.equals(B.invert(B.invert(b)), b))
  assert.ok(!B.equals(B.flipH(b), b))
})

test('flipH mirrors left to right, flipV top to bottom', () => {
  assert.deepEqual(rows(B.flipH(art('#..', '.#.'))), ['..#', '.#.'])
  assert.deepEqual(rows(B.flipV(art('#..', '.#.'))), ['.#.', '#..'])
})

test('shift with wrap moves pixels round; w shifts return the original', () => {
  const b = art('#..', '...')
  assert.deepEqual(rows(B.shift(b, 1, 1, true)), ['...', '.#.'])
  assert.deepEqual(rows(B.shift(b, -1, 0, true)), ['..#', '...'])
  let s = random(9, 4, 5)
  for (let i = 0; i < 9; i++) s = B.shift(s, 1, 0, true)
  assert.ok(B.equals(s, random(9, 4, 5)))
})

test('shift without wrap drops what leaves the edge', () => {
  assert.deepEqual(rows(B.shift(art('#.', '..'), -1, 0, false)), ['..', '..'])
})

test('resize keeps the top-left corner and clears new space', () => {
  const r = B.resize(art('##', '##'), 3, 1)
  assert.deepEqual(rows(r), ['##.'])
})

test('stamp paints a square pen centred on the point, clipped at the edges', () => {
  const b = B.create(4, 4)
  B.stamp(b, 0, 0, 3, 1)
  assert.deepEqual(rows(b), ['##..', '##..', '....', '....'])
})

// A 1-px line lights both ends and one cell per step of its longer axis, each cell
// touching the previous one, whichever end it starts from
for (const [x0, y0, x1, y1] of [[0, 0, 4, 2], [4, 2, 0, 0], [1, 5, 6, 0], [3, 0, 3, 4], [0, 2, 5, 2]]) {
  test(`line (${x0},${y0})-(${x1},${y1}) is a connected 1-px path`, () => {
    const b = B.create(7, 6)
    B.line(b, x0, y0, x1, y1, 1, 1)
    assert.equal(B.get(b, x0, y0), 1)
    assert.equal(B.get(b, x1, y1), 1)
    const lit = []
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (B.get(b, x, y)) lit.push([x, y])
    assert.equal(lit.length, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1)
    for (const [x, y] of lit) {
      if (x === x0 && y === y0) continue
      assert.ok(lit.some(([u, v]) => (u !== x || v !== y) && Math.abs(u - x) <= 1 && Math.abs(v - y) <= 1))
    }
  })
}

test('rect draws an outline or a filled box from any two corners', () => {
  const o = B.create(4, 3)
  B.rect(o, 3, 2, 0, 0, 1, false)
  assert.deepEqual(rows(o), ['####', '#..#', '####'])
  const f = B.create(4, 3)
  B.rect(f, 1, 0, 2, 1, 1, true)
  assert.deepEqual(rows(f), ['.##.', '.##.', '....'])
})

test('floodFill fills the 4-connected region only', () => {
  const b = art('.#..', '.#..', '..#.')
  B.floodFill(b, 0, 0, 1)
  assert.deepEqual(rows(b), ['##..', '##..', '###.'])
})

test('floodFill on a cell that already has the value changes nothing', () => {
  const b = art('#.', '..')
  B.floodFill(b, 0, 0, 1)
  assert.deepEqual(rows(b), ['#.', '..'])
})

test('floodFill survives a large empty bitmap without recursion limits', () => {
  const b = B.create(256, 256)
  B.floodFill(b, 10, 10, 1)
  assert.ok(b.data.every(v => v === 1))
})

test('clone is independent of its source', () => {
  const a = art('#.')
  const c = B.clone(a)
  B.set(c, 1, 0, 1)
  assert.deepEqual(rows(a), ['#.'])
})
