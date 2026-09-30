// Draws emitted code with the real Arduino libraries, compiled for the host on the
// EpoxyDuino core, and compares every pixel the library lit with the picture exported.
// Needs g++; the library sources live in test/libs/vendor, kept by vendor-sync.sh
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { targets } from './targets.mjs'
import { byId, fits, optionDefaults } from '../../src/core/formats.js'
import { emit, emitChars } from '../../src/core/cemit.js'
import { toRows, create, set } from '../../src/core/bitmap.js'
import { random } from '../unit/helpers.js'

const here = dirname(fileURLToPath(import.meta.url))
const vendor = process.env.LIBS_VENDOR ?? join(here, 'vendor')
const build = join(here, '.build')
const epoxy = join(vendor, 'EpoxyDuino/cores/epoxy')
const only = process.env.LIBS_ONLY?.split(',')

const cxx = ['-std=gnu++17', '-O0', '-w', '-DARDUINO=100', '-DUNIX_HOST_DUINO', '-DEPOXY_DUINO', '-DEPOXY_CORE_AVR']

// harness/host is the platform a board would give: a Wire that records I2C traffic in
// place of EpoxyDuino's stub, avr-libc headers, and host.h for what EpoxyDuino lacks
const platform = join(here, 'harness', 'host')
const generated = join(build, 'host')
const host = ['-include', join(platform, 'host.h'), '-I' + generated]

// The Arduino core's binary.h: B0 to B11111111, every spelling with leading zeros
function writeBinaryHeader() {
  mkdirSync(generated, { recursive: true })
  const lines = []
  for (let n = 1; n <= 8; n++)
    for (let v = 0; v < 1 << n; v++) lines.push(`#define B${v.toString(2).padStart(n, '0')} ${v}`)
  writeFileSync(join(generated, 'binary.h'), `#pragma once\n${lines.join('\n')}\n`)
}
writeBinaryHeader()

function compile(src, obj, includes, defines = []) {
  const fresh = existsSync(obj) && statSync(obj).mtimeMs > statSync(src).mtimeMs
  if (fresh) return obj
  mkdirSync(dirname(obj), { recursive: true })
  const lang = src.endsWith('.c') ? ['-x', 'c', '-std=gnu11'] : []
  const flags = src.endsWith('.c') ? cxx.filter(f => !f.startsWith('-std')) : [...cxx, ...host]
  execFileSync('g++', [...lang, ...flags, ...defines, ...includes.map(i => '-I' + i), '-c', src, '-o', obj], { stdio: 'pipe' })
  return obj
}

function coreObjects() {
  return [
    ...readdirSync(epoxy)
      .filter(f => f.endsWith('.cpp') && f !== 'main.cpp' && f !== 'Wire.cpp')
      .map(f => compile(join(epoxy, f), join(build, 'core', f + '.o'), [platform, epoxy])),
    compile(join(platform, 'Wire.cpp'), join(build, 'core', 'host-Wire.cpp.o'), [platform, epoxy]),
  ]
}

// A corner in each corner and the diagonal, which exposes a mirrored or transposed layout,
// and a random fill, which exposes a shifted one
function pictures(w, h) {
  const marks = create(w, h)
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) set(marks, x, y, 1)
  for (let i = 0; i < Math.min(w, h); i++) set(marks, i, i, 1)
  return [marks, random(w, h, w * 7 + h)]
}

// LCD characters: n glyphs side by side as one 5n x 8 picture, slot i in columns 5i..5i+4
function glyphStrips() {
  return [1, 3, 8].flatMap(n => pictures(5 * n, 8))
}

function slots(b) {
  return Array.from({ length: b.w / 5 }, (_, i) => {
    const s = create(5, 8)
    for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) set(s, x, y, b.data[y * b.w + 5 * i + x])
    return s
  })
}

// Each picture gets a namespace of its own, since a helper such as FastLED's XY() is
// emitted once per picture and a sketch holds only one
function generate(format, pics, opts, chars) {
  const parts = pics.map((b, i) => {
    const { declaration, usage } = chars ? emitChars(slots(b), { name: `p${i}` }) : emit(b, format, { name: `p${i}`, opts })
    return `namespace pic${i} {\n${declaration}\nvoid draw() {\n${usage}\n}\n}\n`
  })
  const table = pics.map((b, i) => `  { pic${i}::draw, ${b.w}, ${b.h} },`).join('\n')
  return `${parts.join('\n')}\nstruct Pic { void (*draw)(); int w, h; };\nconst Pic pics[] = {\n${table}\n};\nconst int pic_count = ${pics.length};\n`
}

// A library that cannot be vendored is fetched at its pinned commit into the build
// directory, once; its include and source paths then resolve there instead
function root(t) {
  if (!t.fetch) return vendor
  const base = join(build, 'fetched')
  const dir = join(base, basename(t.fetch.repo))
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(dir, { recursive: true })
    const git = (...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' })
    git('init', '-q')
    git('fetch', '-q', '--depth=1', `https://github.com/${t.fetch.repo}`, t.fetch.commit)
    git('checkout', '-q', 'FETCH_HEAD')
  }
  return base
}

function runs(id, t) {
  if (!t.variants) return [{ key: id, title: '', opts: {}, defines: [] }]
  return t.variants.map((v, i) => ({ key: `${id}-${i}`, title: `, ${v.name}`, opts: v.opts ?? {}, defines: v.defines ?? [] }))
}

for (const [id, t] of Object.entries(targets)) {
  if (only && !only.includes(id)) continue
  const format = byId(t.format ?? id)
  for (const run of runs(id, t)) test(`${t.lib ?? format.lib}: ${format.label}${run.title} draws what was exported`, () => {
    const dir = join(build, run.key)
    mkdirSync(dir, { recursive: true })
    const from = root(t)
    const includes = [dir, join(here, 'harness'), platform, epoxy, ...t.include.map(p => join(from, p))]
    const defines = [...(t.defines ?? []), ...run.defines]
    const libObjects = t.sources.map(s => compile(join(from, s), join(build, 'lib', run.key, basename(s) + '.o'), includes, defines))
    const pics = t.chars ? glyphStrips() : t.sizes.filter(([w, h]) => fits(format, w, h)).flatMap(([w, h]) => pictures(w, h))
    assert.ok(pics.length > 0, 'no picture size fits this preset')
    const opts = { ...optionDefaults(format), ...run.opts }
    writeFileSync(join(dir, 'gen.h'), generate(format, pics, opts, t.chars))
    const main = join(dir, 'harness.o')
    execFileSync('g++', [...cxx, ...host, ...defines, ...includes.map(i => '-I' + i), '-c', join(here, 'harness', t.harness), '-o', main], { stdio: 'pipe' })
    const exe = join(dir, 'harness')
    execFileSync('g++', [main, ...libObjects, ...coreObjects(), ...(t.link ?? []), '-o', exe], { stdio: 'pipe' })
    const out = execFileSync(exe, { encoding: 'utf8' }).split('\n')
    pics.forEach((b, i) => {
      const at = out.indexOf(`pic ${i}`)
      assert.ok(at >= 0, `picture ${i} missing from the harness output`)
      assert.deepEqual(out.slice(at + 1, at + 1 + b.h), toRows(b), `picture ${i}, ${b.w}x${b.h}`)
    })
  })
}
