// Writes the README's preset table from src/core/formats.js and test/libs/targets.mjs, so the
// table never restates the registry by hand. test/unit/readme.test.js fails when it is stale
//
//   node scripts/presets-table.mjs          print the table
//   node scripts/presets-table.mjs --write  replace it in README.md
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { formats, layoutLabels, byId } from '../src/core/formats.js'
import { targets } from '../test/libs/targets.mjs'

export const START = '<!-- presets:start -->'
export const END = '<!-- presets:end -->'
export const README = fileURLToPath(new URL('../README.md', import.meta.url))

export function table() {
  const checked = new Map()
  const add = (id, lib) => checked.set(id, [...new Set([...(checked.get(id) ?? []), lib])])
  for (const [key, t] of Object.entries(targets)) {
    const id = t.format ?? key
    const lib = t.lib ?? byId(id).lib
    add(id, lib)
    for (const other of t.covers ?? []) add(other, lib)
  }
  const rows = formats.map(f => {
    const by = checked.get(f.id)?.join(', ') ?? '—'
    return `| ${f.label} | ${f.group} | ${layoutLabels[f.layout.id]} | ${by} |`
  })
  return ['| Preset | Kind | Bytes | Drawn in CI by |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

export function withTable(readme) {
  const a = readme.indexOf(START)
  const b = readme.indexOf(END)
  if (a < 0 || b < a) throw new Error(`README.md has no ${START} ... ${END} block`)
  return readme.slice(0, a + START.length) + '\n' + table() + '\n' + readme.slice(b)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--write')) writeFileSync(README, withTable(readFileSync(README, 'utf8')))
  else console.log(table())
}
