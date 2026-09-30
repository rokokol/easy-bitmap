// Text in the 5x8 font GyverGFX prints with (assets/font5x8.h, vendored from GyverGFX): a
// glyph is 5 column bytes, bit 0 on top, and print() adds a blank sixth column after each
import { create, set, scale } from './bitmap.js'
import { parse } from './cparse.js'

const ASCII_FIRST = 0x20
const ASCII_LAST = 0x7e
const UPPER = 95
const LOWER = 127
const YO = 159

// The font's row for a character, or undefined for one it lacks. GyverGFX prints Ё as Е
export function glyphIndex(ch) {
  const c = ch.codePointAt(0)
  if (c >= ASCII_FIRST && c <= ASCII_LAST) return c - ASCII_FIRST
  if (c >= 0x410 && c <= 0x42f) return UPPER + c - 0x410
  if (c >= 0x430 && c <= 0x44f) return LOWER + c - 0x430
  if (c === 0x451) return YO
  if (c === 0x401) return UPPER + 5
  return undefined
}

// The glyphs of the font's C source, five bytes each
export function loadFont(source) {
  const values = parse(source).arrays[0].values
  const glyphs = []
  for (let i = 0; i + 5 <= values.length; i += 5) glyphs.push(values.slice(i, i + 5))
  return glyphs
}

export function renderFont(text, font, n = 1) {
  const lines = text.split('\n').map(line => [...line].map(glyphIndex).filter(i => i !== undefined && font[i]))
  const b = create(Math.max(0, ...lines.map(l => l.length)) * 6, lines.length * 8)
  lines.forEach((line, row) =>
    line.forEach((glyph, k) => {
      for (let col = 0; col < 5; col++)
        for (let bit = 0; bit < 8; bit++) if (font[glyph][col] >> bit & 1) set(b, k * 6 + col, row * 8 + bit, 1)
    }),
  )
  return n === 1 ? b : scale(b, n)
}
