// The fonts of the text tool. The two bitmap fonts are the libraries' own, vendored into
// assets/ and drawn the way their print() draws them: a glyph is 5 column bytes, bit 0 on
// top, and every character advances 6 columns, the sixth one blank
import { create, set, scale } from './bitmap.js'
import { parse } from './cparse.js'

const ASCII_FIRST = 0x20
const ASCII_LAST = 0x7e
const UPPER = 95
const LOWER = 127
const YO = 159

// assets/font5x8.h: ASCII from the space, then А..Я, а..я and ё. GyverGFX prints Ё as Е
export function gyverIndex(ch) {
  const c = ch.codePointAt(0)
  if (c >= ASCII_FIRST && c <= ASCII_LAST) return c - ASCII_FIRST
  if (c >= 0x410 && c <= 0x42f) return UPPER + c - 0x410
  if (c >= 0x430 && c <= 0x44f) return LOWER + c - 0x430
  if (c === 0x451) return YO
  if (c === 0x401) return UPPER + 5
  return undefined
}

// assets/glcdfont.c: 256 glyphs indexed by the byte itself. Only printable ASCII is offered:
// print() would draw the UTF-8 bytes of anything else as unrelated glyphs
export function adafruitIndex(ch) {
  const c = ch.codePointAt(0)
  return c >= ASCII_FIRST && c <= ASCII_LAST ? c : undefined
}

// A font with a file is one of the libraries' bitmap fonts; Departure Mono has none and is
// drawn by the page itself (src/ui/departure.js)
export const fonts = [
  { id: 'gyver5x8', label: 'GyverGFX 5×8', file: 'assets/font5x8.h', index: gyverIndex },
  { id: 'adafruit5x7', label: 'Adafruit GFX 5×7, Latin only', file: 'assets/glcdfont.c', index: adafruitIndex },
  { id: 'departure', label: 'Departure Mono' },
]

// The glyphs of a font's C source, five bytes each
export function loadFont(source) {
  const values = parse(source).arrays[0].values
  const glyphs = []
  for (let i = 0; i + 5 <= values.length; i += 5) glyphs.push(values.slice(i, i + 5))
  return glyphs
}

export function renderFont(text, glyphs, n, index) {
  const lines = text.split('\n').map(line => [...line].map(index).filter(i => i !== undefined && glyphs[i]))
  const b = create(Math.max(0, ...lines.map(l => l.length)) * 6, lines.length * 8)
  lines.forEach((line, row) =>
    line.forEach((glyph, k) => {
      for (let col = 0; col < 5; col++)
        for (let bit = 0; bit < 8; bit++) if (glyphs[glyph][col] >> bit & 1) set(b, k * 6 + col, row * 8 + bit, 1)
    }),
  )
  return n === 1 ? b : scale(b, n)
}
