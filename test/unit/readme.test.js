import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { README, withTable, table } from '../../scripts/presets-table.mjs'
import { formats } from '../../src/core/formats.js'

test('the README preset table is the one the registry generates', () => {
  const readme = readFileSync(README, 'utf8')
  assert.equal(readme, withTable(readme), 'run: node scripts/presets-table.mjs --write')
})

test('the table has one row per preset', () => {
  assert.equal(table().split('\n').length, formats.length + 2)
})
