// Turns a bitmap into C for one preset of formats.js: the declaration to paste at file scope
// and the lines that draw it
import { pack, fits, elementType, onValue, formats } from './formats.js'

const digits = { uint8_t: 2, uint16_t: 4, uint32_t: 6 }
const binDigits = { uint8_t: 8, uint16_t: 16, uint32_t: 24 }

export function identifier(text) {
  const id = String(text).trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  if (!id) return 'bitmap'
  return /^[0-9]/.test(id) ? '_' + id : id
}

function literal(v, type, radix) {
  if (radix === 'bin') return '0b' + v.toString(2).padStart(binDigits[type], '0')
  return '0x' + v.toString(16).toUpperCase().padStart(digits[type], '0')
}

// How many values make one line: a row of bytes, a page, or a row of pixels
function lineLength(b, layout) {
  if (layout.kind === 'pixels') return b.w
  return layout.axis === 'x' ? Math.ceil(b.w / layout.bits) : b.w
}

function body(values, perLine, format) {
  const chunk = Math.min(perLine, 16)
  const out = []
  for (let i = 0; i < values.length; i += chunk) out.push('  ' + values.slice(i, i + chunk).map(format).join(', ') + ',')
  return out
}

export function emit(b, format, { name = 'bitmap', radix = 'hex', opts = {} } = {}) {
  if (!fits(format, b.w, b.h)) throw new RangeError(`${format.lib} does not take a ${b.w}x${b.h} picture (${ruleText(format)})`)
  const id = identifier(name)
  const W = id.toUpperCase() + '_W'
  const H = id.toUpperCase() + '_H'
  const type = elementType(format, opts)
  const values = pack(b, format.layout, { on: onValue(format, opts) })
  // A RAM array stays mutable: MD_MAX72xx setBuffer takes uint8_t*
  const qualifier = format.progmem ? 'const ' : ''
  const storage = format.progmem ? ' PROGMEM' : ''
  const declaration = [
    `// ${id}: ${b.w}x${b.h}, ${format.label}. ${format.note}`,
    `#define ${W} ${b.w}`,
    `#define ${H} ${b.h}`,
    `${qualifier}${type} ${id}[]${storage} = {`,
    ...body(values, lineLength(b, format.layout), v => literal(v, type, radix)),
    '};',
    ...(format.helper ? ['', ...format.helper({ name: id, W, H, w: b.w, h: b.h, opts })] : []),
  ].join('\n')
  const usage = format.usage({ name: id, W, H, w: b.w, h: b.h, opts }).join('\n')
  return { declaration, usage }
}

export function ruleText(format) {
  const r = format.rule
  if (!r) return 'any size'
  if (r.size) return `exactly ${r.size[0]}x${r.size[1]}`
  const parts = []
  if (r.step) parts.push(`sides in steps of ${r.step}`)
  if (r.height !== undefined) parts.push(`height ${r.height}`)
  return parts.join(', ')
}

const lcd = formats.find(f => f.id === 'hd44780')

// HD44780 custom characters: slots of 5x8, emitted as byte name[N][8] in binary so the
// shape reads straight off the code
export function emitChars(slots, { name = 'chars' } = {}) {
  const id = identifier(name)
  const n = slots.length
  const rows = slots.map((s, i) => {
    const bytes = pack(s, lcd.layout).map(v => '0b' + v.toString(2).padStart(5, '0'))
    return `  { ${bytes.join(', ')} }${i < n - 1 ? ',' : ''} // ${i}`
  })
  const declaration = [
    `// ${id}: ${n} custom character${n === 1 ? '' : 's'} of 5x8 for HD44780 LCDs. ${lcd.note}`,
    `byte ${id}[${n}][8] = {`,
    ...rows,
    '};',
  ].join('\n')
  const usage = [
    ...lcd.usage({ name: id, count: n }),
    'lcd.setCursor(0, 0);',
    'lcd.write(byte(0));',
  ].join('\n')
  return { declaration, usage }
}
