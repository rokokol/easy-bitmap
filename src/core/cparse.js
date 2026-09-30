// Reads bitmap arrays back out of C: declarations with their dimensions, #define and
// const size constants, WxH hints in comments, and number literals of every common kind
import { unpack, packedLength, fits } from './formats.js'

export class ParseError extends Error {}

const NUMBER = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|B[01]{1,8}|\d+)(?:[uU]?[lL]{0,2})$/

function toNumber(token) {
  const t = token.replace(/[uUlL]+$/, '')
  if (/^0[xX]/.test(t)) return parseInt(t.slice(2), 16)
  if (/^0[bB]/.test(t)) return parseInt(t.slice(2), 2)
  if (/^B/.test(t)) return parseInt(t.slice(1), 2)
  return parseInt(t, 10)
}

function stripComments(src) {
  const hints = []
  const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, c => {
    const m = c.match(/(\d+)\s*[xX×хХ]\s*(\d+)/)
    if (m) hints.push([+m[1], +m[2]])
    return ' '
  })
  return { code, hints }
}

// Returns the index just past the brace that closes the one at `open`
function closeBrace(code, open) {
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}' && --depth === 0) return i + 1
  }
  throw new ParseError('a { has no matching }')
}

function values(text) {
  const tokens = text.replace(/[{}]/g, ',').split(/[\s,]+/).filter(Boolean)
  return tokens.map(t => {
    if (!NUMBER.test(t)) throw new ParseError(`"${t}" is not a number`)
    return toNumber(t)
  })
}

export function parse(src) {
  const { code, hints } = stripComments(src)
  const defines = {}
  for (const m of code.matchAll(/#define\s+([A-Za-z_]\w*)\s+(\S+)/g)) if (NUMBER.test(m[2])) defines[m[1]] = toNumber(m[2])
  for (const m of code.matchAll(/\b([A-Za-z_]\w*)\s*=\s*([0-9][\w]*)\s*;/g)) if (NUMBER.test(m[2])) defines[m[1]] = toNumber(m[2])

  const arrays = []
  const decl = /([A-Za-z_]\w*)\s*((?:\[[^\]]*\]\s*)+)(?:PROGMEM\s*)?=\s*\{/g
  for (const m of code.matchAll(decl)) {
    const open = m.index + m[0].length - 1
    const end = closeBrace(code, open)
    const dims = [...m[2].matchAll(/\[([^\]]*)\]/g)].map(d => {
      const t = d[1].trim()
      if (!t) return undefined
      return NUMBER.test(t) ? toNumber(t) : defines[t]
    })
    arrays.push({ name: m[1], dims, values: values(code.slice(open, end)) })
  }

  if (!arrays.length) {
    const open = code.indexOf('{')
    const text = open >= 0 ? code.slice(open, closeBrace(code, open)) : code
    const v = values(text)
    if (!v.length) throw new ParseError('no numbers found')
    arrays.push({ name: undefined, dims: [], values: v })
  }
  return { arrays, defines, hints }
}

const suffixes = { w: ['_W', '_WIDTH', 'W', 'WIDTH', '_w', '_width'], h: ['_H', '_HEIGHT', 'H', 'HEIGHT', '_h', '_height'] }

function constant(defines, name, axis) {
  for (const base of name ? [name, name.toUpperCase()] : []) {
    for (const s of suffixes[axis]) if (defines[base + s] !== undefined) return defines[base + s]
  }
  return undefined
}

// Picks the picture size for `array` under `format`: size constants, then a WxH comment,
// then `current`; otherwise lists the sizes whose packed length matches
export function inferSize(parsed, array, format, current) {
  const n = array.values.length
  const ok = ([w, h]) => w > 0 && h > 0 && fits(format, w, h) && packedLength(w, h, format.layout) === n
  const w = constant(parsed.defines, array.name, 'w')
  const h = constant(parsed.defines, array.name, 'h')
  const tries = []
  if (w !== undefined && h !== undefined) tries.push([w, h])
  tries.push(...parsed.hints)
  if (current) tries.push(current)
  for (const t of tries) if (ok(t)) return { size: t }

  const candidates = []
  for (let cw = 1; cw <= 256; cw++) {
    for (let ch = 1; ch <= 256; ch++) {
      if (!ok([cw, ch])) continue
      const l = format.layout
      // Padding bits make many widths share one length; keep the ones without padding
      if (l.kind === 'packed' && l.axis === 'x' && cw % l.bits) continue
      if (l.kind === 'packed' && l.axis === 'y' && ch % l.bits) continue
      candidates.push([cw, ch])
    }
  }
  return { candidates }
}

export function decode(array, format, w, h) {
  return unpack(array.values, w, h, format.layout)
}
