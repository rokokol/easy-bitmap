import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHistory } from '../../src/core/history.js'

test('undo returns the state recorded before the change, redo goes forward again', () => {
  const h = createHistory()
  h.record('a')
  assert.equal(h.undo('b'), 'a')
  assert.equal(h.redo('a'), 'b')
})

test('undo and redo on an empty side return undefined', () => {
  const h = createHistory()
  assert.equal(h.undo('x'), undefined)
  assert.equal(h.redo('x'), undefined)
  assert.ok(!h.canUndo() && !h.canRedo())
})

test('a new change after undo drops the redo branch', () => {
  const h = createHistory()
  h.record('a')
  h.undo('b')
  h.record('a')
  assert.ok(!h.canRedo())
})

test('the stack keeps only the newest entries up to its limit', () => {
  const h = createHistory(3)
  for (const s of ['a', 'b', 'c', 'd']) h.record(s)
  assert.equal(h.undo('e'), 'd')
  assert.equal(h.undo('d'), 'c')
  assert.equal(h.undo('c'), 'b')
  assert.equal(h.undo('b'), undefined)
})

test('a series of undos walks back through every change in order', () => {
  const h = createHistory()
  let state = 0
  for (let i = 0; i < 5; i++) {
    h.record(state)
    state++
  }
  const seen = []
  for (let s; (s = h.undo(state)) !== undefined; state = s) seen.push(s)
  assert.deepEqual(seen, [4, 3, 2, 1, 0])
})
