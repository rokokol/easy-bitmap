// The one registry of export presets. Every list the site shows, every encoder and decoder,
// the README table and the tests derive from `layouts` and `formats` below; a preset is
// never described anywhere else
import { create } from './bitmap.js'

// A packed layout fills `bits` bits per byte along `axis`:
// 'x' walks each row left to right, rows top to bottom (row-major);
// 'y' walks each column top to bottom in pages of `bits` rows, pages outer, columns inner.
// `msbFirst` puts the first pixel of a group into the highest used bit
export const layouts = {
  rowsMsb: { id: 'rowsMsb', kind: 'packed', axis: 'x', msbFirst: true, bits: 8 },
  rowsLsb: { id: 'rowsLsb', kind: 'packed', axis: 'x', msbFirst: false, bits: 8 },
  pagesLsb: { id: 'pagesLsb', kind: 'packed', axis: 'y', msbFirst: false, bits: 8 },
  pagesMsb: { id: 'pagesMsb', kind: 'packed', axis: 'y', msbFirst: true, bits: 8 },
  char5: { id: 'char5', kind: 'packed', axis: 'x', msbFirst: true, bits: 5 },
  // One value per pixel, row-major, top row first; a lit pixel holds opts.on, an unlit one 0
  pixels: { id: 'pixels', kind: 'pixels' },
}

// How a person names each layout, in the README table and the page
export const layoutLabels = {
  rowsMsb: 'rows, MSB = left',
  rowsLsb: 'rows, LSB = left (XBM)',
  pagesLsb: 'vertical pages, bit 0 = top',
  pagesMsb: 'vertical pages, bit 7 = top',
  char5: '8 rows of 5 bits, bit 4 = left',
  pixels: 'one colour per pixel',
}

function bitOf(layout, k) {
  return layout.msbFirst ? layout.bits - 1 - k : k
}

// Calls visit(index, bit, x, y) for every pixel position the layout stores
function walk(w, h, layout, visit) {
  const n = layout.bits
  if (layout.axis === 'x') {
    const per = Math.ceil(w / n)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) visit(y * per + Math.floor(x / n), bitOf(layout, x % n), x, y)
  } else {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) visit(Math.floor(y / n) * w + x, bitOf(layout, y % n), x, y)
  }
}

export function packedLength(w, h, layout) {
  if (layout.kind === 'pixels') return w * h
  const n = layout.bits
  return layout.axis === 'x' ? Math.ceil(w / n) * h : Math.ceil(h / n) * w
}

export function pack(b, layout, opts = {}) {
  if (layout.kind === 'pixels') return Array.from(b.data, v => (v ? opts.on ?? 1 : 0))
  const out = new Array(packedLength(b.w, b.h, layout)).fill(0)
  walk(b.w, b.h, layout, (i, bit, x, y) => {
    if (b.data[y * b.w + x]) out[i] |= 1 << bit
  })
  return out
}

export function unpack(values, w, h, layout) {
  const b = create(w, h)
  if (layout.kind === 'pixels') {
    for (let i = 0; i < w * h; i++) b.data[i] = values[i] ? 1 : 0
    return b
  }
  walk(w, h, layout, (i, bit, x, y) => {
    b.data[y * w + x] = (values[i] ?? 0) >> bit & 1
  })
  return b
}

// microLED's mData for its COLOR_DEBTH: 1 = RRGGGBBB, 2 = RGB565, 3 = 0xRRGGBB
export function microLedColor(rgb, depth) {
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = rgb & 0xff
  if (depth === 1) return (r & 0xc0) | ((g & 0xe0) >> 2) | ((b & 0xe0) >> 5)
  if (depth === 2) return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | ((b & 0xf8) >> 3)
  return rgb & 0xffffff
}

const hex6 = rgb => '0x' + rgb.toString(16).padStart(6, '0').toUpperCase()

// Size rules: `step` = both sides a multiple of it, `height` = exactly that many rows,
// `size` = exactly [w, h]
const eightStep = { step: 8 }

// usage({ name, W, H, w, h, opts }) returns the lines that draw the array, where W and H
// are the names of the emitted size constants
export const formats = [
  {
    id: 'gyvermax7219',
    lib: 'GyverMAX7219',
    label: 'GyverMAX7219 (MAX7219 matrices)',
    group: 'LED matrix',
    noob: true,
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <GyverMAX7219.h>',
    note: 'Row-major, MSB = left, drawn by GyverGFX drawBitmap; a sprite of any size fits anywhere on the chain',
    usage: ({ name, W, H }) => [`mtrx.drawBitmap(0, 0, ${name}, ${W}, ${H});`, 'mtrx.update();'],
  },
  {
    id: 'ledcontrol',
    lib: 'LedControl',
    label: 'LedControl (MAX7219 matrices)',
    group: 'LED matrix',
    noob: true,
    layout: layouts.rowsMsb,
    progmem: false,
    include: '#include <LedControl.h>',
    rule: eightStep,
    note: 'One byte per module row, sent with setRow; module m sits at column m % COLS, row m / COLS of the picture',
    usage: ({ name, w, h }) => {
      const cols = w / 8
      const modules = cols * (h / 8)
      if (modules === 1) return [`for (int r = 0; r < 8; r++) lc.setRow(0, r, ${name}[r]);`]
      return [
        `for (int m = 0; m < ${modules}; m++)`,
        '  for (int r = 0; r < 8; r++)',
        `    lc.setRow(m, r, ${name}[((m / ${cols}) * 8 + r) * ${cols} + m % ${cols}]);`,
      ]
    },
  },
  {
    id: 'md_max72xx',
    lib: 'MD_MAX72xx',
    label: 'MD_MAX72xx (MAX7219 modules in a row)',
    group: 'LED matrix',
    noob: true,
    layout: layouts.pagesLsb,
    // setBuffer takes uint8_t*, so the array has to stay a mutable RAM array
    progmem: false,
    include: '#include <MD_MAX72xx.h>',
    rule: { step: 8, height: 8 },
    note: 'One byte per column, bit 0 = top; setBuffer counts columns down from the left edge',
    usage: ({ name, W }) => [`mx.setBuffer(mx.getColumnCount() - 1, ${W}, ${name});`],
  },
  {
    id: 'microled',
    lib: 'microLED',
    label: 'microLED (WS2812 matrices)',
    group: 'LED matrix',
    noob: true,
    layout: layouts.pixels,
    progmem: true,
    include: '#include <microLED.h>',
    options: [
      { id: 'depth', label: 'COLOR_DEBTH', choices: [1, 2, 3], default: 3 },
      { id: 'color', label: 'Colour', type: 'color', default: 0xffffff },
    ],
    element: opts => ['uint8_t', 'uint16_t', 'uint32_t'][(opts.depth ?? 3) - 1],
    on: opts => microLedColor(opts.color ?? 0xffffff, opts.depth ?? 3),
    note: 'One colour per pixel, top row first; set COLOR_DEBTH to match before the include',
    usage: ({ name, W, H, opts }) => [
      `leds.drawBitmap${[8, 16, 32][(opts.depth ?? 3) - 1]}(0, 0, ${name}, ${W}, ${H});`,
      'leds.show();',
    ],
  },
  {
    id: 'fastled',
    lib: 'FastLED',
    label: 'FastLED (WS2812 matrices)',
    group: 'LED matrix',
    noob: true,
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <FastLED.h>',
    options: [
      { id: 'serpentine', label: 'Serpentine wiring', type: 'bool', default: true },
      { id: 'color', label: 'Colour', type: 'color', default: 0xffffff },
    ],
    note: 'A 1-bit mask read with XY(), which maps a pixel to its LED; the picture spans the whole matrix',
    helper: ({ W, opts }) => [
      'uint16_t XY(uint8_t x, uint8_t y) {',
      opts.serpentine ?? true
        ? `  return (y & 1) ? y * ${W} + (${W} - 1 - x) : y * ${W} + x;`
        : `  return y * ${W} + x;`,
      '}',
    ],
    usage: ({ name, W, H, opts }) => [
      `for (uint8_t y = 0; y < ${H}; y++)`,
      `  for (uint8_t x = 0; x < ${W}; x++)`,
      `    if (pgm_read_byte(&${name}[y * ((${W} + 7) / 8) + x / 8]) & (0x80 >> (x % 8)))`,
      `      leds[XY(x, y)] = CRGB(${hex6(opts.color ?? 0xffffff)});`,
      'FastLED.show();',
    ],
  },
  {
    id: 'neomatrix',
    lib: 'Adafruit NeoMatrix',
    label: 'Adafruit NeoMatrix (WS2812 matrices)',
    group: 'LED matrix',
    noob: true,
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <Adafruit_NeoMatrix.h>',
    note: 'Adafruit GFX drawBitmap; the wiring is set by the NEO_MATRIX_* flags of the constructor',
    usage: ({ name, W, H }) => [
      `matrix.drawBitmap(0, 0, ${name}, ${W}, ${H}, matrix.Color(255, 255, 255));`,
      'matrix.show();',
    ],
  },
  {
    id: 'ledbackpack',
    lib: 'Adafruit LED Backpack',
    label: 'Adafruit LED Backpack (HT16K33)',
    group: 'LED matrix',
    noob: true,
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <Adafruit_LEDBackpack.h>',
    rule: { step: 8, height: 8 },
    note: 'Adafruit GFX drawBitmap; a 16x8 backpack is 8x16 until matrix.setRotation(1)',
    usage: ({ name, W, H }) => [`matrix.drawBitmap(0, 0, ${name}, ${W}, ${H}, LED_ON);`, 'matrix.writeDisplay();'],
  },
  {
    id: 'gyveroled',
    lib: 'GyverOLED',
    label: 'GyverOLED (SSD1306, SH1106)',
    group: 'Display',
    layout: layouts.pagesLsb,
    progmem: true,
    include: '#include <GyverOLED.h>',
    note: 'Vertical bytes in pages of 8 rows, bit 0 = top; the height is padded up to a whole page',
    usage: ({ name, W, H }) => [`oled.drawBitmap(0, 0, ${name}, ${W}, ${H});`, 'oled.update();'],
  },
  {
    id: 'gyvergfx',
    lib: 'GyverGFX',
    label: 'GyverGFX (any Gyver display)',
    group: 'Display',
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <GyverGFX.h>',
    note: 'Row-major, MSB = left',
    usage: ({ name, W, H }) => [`gfx.drawBitmap(0, 0, ${name}, ${W}, ${H});`],
  },
  {
    id: 'adafruit',
    lib: 'Adafruit GFX',
    label: 'Adafruit GFX drawBitmap (SSD1306, ST7735, ...)',
    group: 'Display',
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <Adafruit_SSD1306.h>',
    note: 'Row-major, MSB = left',
    usage: ({ name, W, H }) => [`display.drawBitmap(0, 0, ${name}, ${W}, ${H}, SSD1306_WHITE);`, 'display.display();'],
  },
  {
    id: 'adafruit_xbm',
    lib: 'Adafruit GFX',
    label: 'Adafruit GFX drawXBitmap',
    group: 'Display',
    layout: layouts.rowsLsb,
    progmem: true,
    include: '#include <Adafruit_SSD1306.h>',
    note: 'XBM: row-major, LSB = left',
    usage: ({ name, W, H }) => [`display.drawXBitmap(0, 0, ${name}, ${W}, ${H}, SSD1306_WHITE);`, 'display.display();'],
  },
  {
    id: 'u8g2',
    lib: 'U8g2',
    label: 'U8g2 drawXBMP',
    group: 'Display',
    layout: layouts.rowsLsb,
    progmem: true,
    include: '#include <U8g2lib.h>',
    note: 'XBM: row-major, LSB = left',
    usage: ({ name, W, H }) => [`u8g2.drawXBMP(0, 0, ${W}, ${H}, ${name});`, 'u8g2.sendBuffer();'],
  },
  {
    id: 'tft_espi',
    lib: 'TFT_eSPI',
    label: 'TFT_eSPI drawBitmap',
    group: 'Display',
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <TFT_eSPI.h>',
    note: 'Row-major, MSB = left',
    usage: ({ name, W, H }) => [`tft.drawBitmap(0, 0, ${name}, ${W}, ${H}, TFT_WHITE);`],
  },
  {
    id: 'raw_rows_msb',
    lib: 'Raw',
    label: `Raw: ${layoutLabels.rowsMsb}`,
    group: 'Raw',
    layout: layouts.rowsMsb,
    progmem: true,
    note: 'Each row padded to whole bytes, top row first',
    usage: ({ name }) => [`// ${name}: rows top to bottom, bit 7 = leftmost pixel`],
  },
  {
    id: 'raw_rows_lsb',
    lib: 'Raw',
    label: `Raw: ${layoutLabels.rowsLsb}`,
    group: 'Raw',
    layout: layouts.rowsLsb,
    progmem: true,
    note: 'Each row padded to whole bytes, top row first',
    usage: ({ name }) => [`// ${name}: rows top to bottom, bit 0 = leftmost pixel`],
  },
  {
    id: 'raw_pages_lsb',
    lib: 'Raw',
    label: `Raw: ${layoutLabels.pagesLsb} (SSD1306 buffer)`,
    group: 'Raw',
    layout: layouts.pagesLsb,
    progmem: true,
    note: 'Pages of 8 rows, each page left to right',
    usage: ({ name }) => [`// ${name}: pages of 8 rows, one byte per column, bit 0 = top`],
  },
  {
    id: 'raw_pages_msb',
    lib: 'Raw',
    label: `Raw: ${layoutLabels.pagesMsb}`,
    group: 'Raw',
    layout: layouts.pagesMsb,
    progmem: true,
    note: 'Pages of 8 rows, each page left to right; LedControl setColumn takes these bytes',
    usage: ({ name }) => [`// ${name}: pages of 8 rows, one byte per column, bit 7 = top`],
  },
  {
    id: 'hd44780',
    lib: 'LiquidCrystal',
    label: 'LCD custom characters (HD44780)',
    group: 'LCD',
    layout: layouts.char5,
    progmem: false,
    rule: { size: [5, 8] },
    note: '8 bytes per character, one per row, the low 5 bits hold the pixels, bit 4 = left',
    usage: ({ name, count = 8 }) => [`for (uint8_t i = 0; i < ${count}; i++) lcd.createChar(i, ${name}[i]);`],
  },
]

export function byId(id) {
  return formats.find(f => f.id === id)
}

export function fits(format, w, h) {
  const r = format.rule
  if (!r) return w >= 1 && h >= 1
  if (r.size) return w === r.size[0] && h === r.size[1]
  if (r.height !== undefined && h !== r.height) return false
  if (r.step && (w % r.step || h % r.step)) return false
  return w >= 1 && h >= 1
}

export function optionDefaults(format) {
  return Object.fromEntries((format.options ?? []).map(o => [o.id, o.default]))
}

export function elementType(format, opts) {
  return format.element ? format.element(opts) : 'uint8_t'
}

export function onValue(format, opts) {
  return format.on ? format.on(opts) : 1
}
