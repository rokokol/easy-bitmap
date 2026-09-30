// The page: state, and the wiring between src/core and the controls in index.html
import * as B from './core/bitmap.js'
import { byId, fits, optionDefaults } from './core/formats.js'
import { emit, emitChars, ruleText, identifier } from './core/cemit.js'
import { parse, inferSize, decode, ParseError } from './core/cparse.js'
import { createHistory } from './core/history.js'
import { encodeBitmap, encodeChars, decodeHash } from './core/hash.js'
import { displays, visibleDisplays, visibleFormats, tools, visibleTools, NOOB_SIZES } from './core/displays.js'
import { fonts, loadFont, renderFont } from './core/text.js'
import { loadDeparture, renderDeparture } from './ui/departure.js'
import { color } from './ui/colors.js'
import { createEditor } from './ui/editor.js'
import { renderBitmapPreview, renderCharsPreview } from './ui/preview.js'
import { initTheme } from './ui/theme.js'
import { startCloud } from './ui/cloud.js'
import { openImageDialog } from './ui/image.js'
import { load, save } from './ui/storage.js'

const $ = id => document.getElementById(id)
const SLOTS = 8
const lcd = byId('hd44780')

const saved = load()

const state = {
  mode: 'bitmap',
  noob: saved.noob ?? true,
  bitmap: B.create(8, 8),
  display: 'led8',
  format: 'gyvermax7219',
  options: {},
  name: 'bitmap',
  charsName: 'chars',
  radix: 'hex',
  tool: 'pen',
  pen: 1,
  slots: Array.from({ length: SLOTS }, () => B.create(5, 8)),
  slot: 0,
  text: { value: 'Hi!', font: 'gyver5x8', size: 1 },
}

const histories = { bitmap: createHistory(), chars: createHistory() }

// ---------- document ----------

function current() {
  return state.mode === 'bitmap' ? state.bitmap : state.slots[state.slot]
}

function setCurrent(b) {
  if (state.mode === 'bitmap') state.bitmap = b
  else state.slots[state.slot] = b
}

function snapshot() {
  return state.mode === 'bitmap' ? B.clone(state.bitmap) : { slots: state.slots.map(B.clone), slot: state.slot }
}

function restore(s) {
  if (state.mode === 'bitmap') state.bitmap = s
  else {
    state.slots = s.slots
    state.slot = s.slot
  }
}

// Every change to the document goes through edit(), so every change can be undone
function edit(apply) {
  histories[state.mode].record(snapshot())
  apply()
  refresh()
}

function change(transform) {
  edit(() => setCurrent(transform(current())))
}

function undo() {
  const s = histories[state.mode].undo(snapshot())
  if (s) restore(s), refresh({ controls: true })
}

function redo() {
  const s = histories[state.mode].redo(snapshot())
  if (s) restore(s), refresh({ controls: true })
}

function format() {
  return byId(state.format)
}

function formatOptions() {
  return { ...optionDefaults(format()), ...state.options[state.format] }
}

function usedSlots() {
  let n = 1
  state.slots.forEach((s, i) => s.data.some(Boolean) && (n = i + 1))
  return state.slots.slice(0, n)
}

// ---------- editor ----------

let stroke = null

const editor = createEditor($('editor'), $('canvas-wrap'), {
  onStart(p, button) {
    let value = button === 'secondary' ? 0 : 1
    if (state.tool === 'eraser') value = 1 - value
    if (state.tool === 'text') {
      const t = textBitmap()
      if (t.w) change(old => (B.stampOn(old, t, p.x, p.y, value), old))
      return
    }
    histories[state.mode].record(snapshot())
    const b = current()
    stroke = { from: p, last: p, value, base: B.clone(b) }
    if (state.tool === 'pen' || state.tool === 'eraser') B.stamp(b, p.x, p.y, state.pen, value)
    else if (state.tool === 'fill') B.floodFill(b, p.x, p.y, value)
    else shape(p)
    refresh({ light: true })
  },
  onMove(p) {
    if (!stroke || (p.x === stroke.last.x && p.y === stroke.last.y)) return
    if (state.tool === 'pen' || state.tool === 'eraser') B.line(current(), stroke.last.x, stroke.last.y, p.x, p.y, stroke.value, state.pen)
    else if (state.tool !== 'fill') shape(p)
    stroke.last = p
    refresh({ light: true })
  },
  onEnd() {
    stroke = null
    refresh()
  },
  onHover(p) {
    const b = current()
    const inside = p && B.inside(b, p.x, p.y)
    const moved = state.tool === 'text' && (inside ? p.x !== hover?.x || p.y !== hover?.y : hover)
    hover = inside ? p : null
    if (moved) refresh({ light: true })
    $('status').textContent = [inside ? `${p.x}, ${p.y}` : '', `${b.w}×${b.h}`].filter(Boolean).join('   ')
  },
})

function shape(p) {
  const b = B.clone(stroke.base)
  const { from, value } = stroke
  if (state.tool === 'line') B.line(b, from.x, from.y, p.x, p.y, value, state.pen)
  else B.rect(b, from.x, from.y, p.x, p.y, value, state.tool === 'rectFill')
  setCurrent(b)
}

// ---------- rendering ----------

let pending = 0

// light: only the canvas, during a stroke; the code and the preview wait for its end
// Lines that mean something on the hardware: MAX7219 module borders, or the 8-row pages a
// vertical layout packs into one byte per column; the note under the canvas names them
function guides(b) {
  if (state.mode !== 'bitmap') return {}
  const f = format()
  if (f.modules && (b.w > f.modules || b.h > f.modules))
    return { x: f.modules, y: f.modules, note: `pink lines: ${f.modules}×${f.modules} MAX7219 modules` }
  const l = f.layout
  if (l.kind === 'packed' && l.axis === 'y' && b.h > l.bits)
    return { y: l.bits, note: `pink lines: pages of ${l.bits} rows, one byte per column` }
  return {}
}

function refresh({ light = false, controls = false } = {}) {
  const b = current()
  const g = guides(b)
  const ghost = state.tool === 'text' && hover && !stroke ? { bitmap: textBitmap(), ...hover } : undefined
  editor.render(b, { guides: g, ghost })
  $('guide-note').textContent = g.note ?? ''
  $('status').textContent = `${b.w}×${b.h}`
  $('undo').disabled = !histories[state.mode].canUndo()
  $('redo').disabled = !histories[state.mode].canRedo()
  if (light) return
  if (controls) buildControls()
  cancelAnimationFrame(pending)
  pending = requestAnimationFrame(() => {
    renderCode()
    renderPreview()
    renderSlots()
    remember()
  })
}

function renderCode() {
  const message = $('format-note')
  if (state.mode === 'chars') {
    const { declaration, usage } = emitChars(usedSlots(), { name: state.charsName })
    $('code').textContent = declaration
    $('usage').textContent = usage
    message.textContent = lcd.note
    return
  }
  const f = format()
  message.classList.remove('error')
  message.textContent = f.note
  try {
    const { declaration, usage } = emit(state.bitmap, f, { name: state.name, radix: state.radix, opts: formatOptions() })
    $('code').textContent = declaration
    $('usage').textContent = usage
  } catch (e) {
    message.classList.add('error')
    message.textContent = `${f.lib} needs ${ruleText(f)}; this picture is ${state.bitmap.w}×${state.bitmap.h}`
    $('code').textContent = ''
    $('usage').textContent = ''
  }
}

function renderPreview() {
  if (state.mode === 'chars') {
    renderCharsPreview($('preview'), state.slots)
    $('preview-caption').textContent = '16×2 character LCD'
    return
  }
  const d = displays.find(x => x.id === state.display)
  renderBitmapPreview($('preview'), state.bitmap, d?.kind ?? 'oled')
  $('preview-caption').textContent = d ? d.label : `${state.bitmap.w}×${state.bitmap.h}`
}

function renderSlots() {
  const box = $('slots')
  box.hidden = state.mode !== 'chars'
  if (box.hidden) return
  if (box.children.length !== SLOTS) {
    box.replaceChildren()
    for (let i = 0; i < SLOTS; i++) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'slot'
      button.setAttribute('role', 'radio')
      button.title = `Character ${i} (key ${i + 1})`
      const c = document.createElement('canvas')
      c.width = 5
      c.height = 8
      button.append(c, String(i))
      button.addEventListener('click', () => selectSlot(i))
      box.append(button)
    }
  }
  const off = color('--cell-off')
  const on = color('--cell-on')
  ;[...box.children].forEach((button, i) => {
    button.setAttribute('aria-checked', String(i === state.slot))
    const ctx = button.querySelector('canvas').getContext('2d')
    ctx.fillStyle = off
    ctx.fillRect(0, 0, 5, 8)
    ctx.fillStyle = on
    const s = state.slots[i]
    for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) if (s.data[y * 5 + x]) ctx.fillRect(x, y, 1, 1)
  })
}

function selectSlot(i) {
  state.slot = i
  refresh()
}

// ---------- controls ----------

function buildControls() {
  document.body.classList.toggle('noob', state.noob)
  $('noob').checked = state.noob
  const chars = state.mode === 'chars'
  for (const tab of document.querySelectorAll('[role=tab]')) tab.setAttribute('aria-selected', String(tab.dataset.mode === state.mode))
  $('size-card').hidden = chars
  $('format').closest('.field').hidden = chars
  $('format-options').hidden = chars
  document.querySelector('.segmented').closest('.field').hidden = chars
  $('name').value = chars ? state.charsName : state.name
  $('rotate').disabled = chars

  // tools
  const shownTools = visibleTools(state.noob)
  if (!shownTools.some(t => t.id === state.tool)) state.tool = 'pen'
  const toolBox = $('tool-buttons')
  toolBox.replaceChildren(
    ...shownTools.map(t => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'tool'
      b.dataset.tool = t.id
      b.setAttribute('role', 'radio')
      b.setAttribute('aria-checked', String(t.id === state.tool))
      b.title = `${t.label} (${t.key})`
      b.textContent = t.short
      b.addEventListener('click', () => selectTool(t.id))
      return b
    }),
  )
  $('text-options').hidden = state.tool !== 'text'
  if (!$('text-font').options.length) $('text-font').replaceChildren(...fonts.map(f => new Option(f.label, f.id)))
  $('text-font').value = state.text.font
  $('text-size').value = String(state.text.size)
  $('text-input').value = state.text.value

  // displays
  const shownDisplays = visibleDisplays(state.noob)
  const select = $('display')
  select.replaceChildren(...shownDisplays.map(d => new Option(d.label, d.id)))
  if (!state.noob) select.add(new Option('custom size', 'custom'))
  // Keep the chosen display while it matches the size, else the first one that does
  const sized = shownDisplays.filter(d => d.w === state.bitmap.w && d.h === state.bitmap.h)
  const match = sized.find(d => d.id === state.display) ?? sized[0]
  state.display = match ? match.id : 'custom'
  select.value = state.display
  $('width').value = state.bitmap.w
  $('height').value = state.bitmap.h

  // formats, grouped
  const list = visibleFormats(state.noob, state.bitmap.w, state.bitmap.h)
  const formatSelect = $('format')
  formatSelect.replaceChildren()
  const groups = new Map()
  for (const f of list) {
    if (!groups.has(f.group)) {
      const g = document.createElement('optgroup')
      g.label = f.group
      groups.set(f.group, g)
      formatSelect.append(g)
    }
    groups.get(f.group).append(new Option(f.label, f.id))
  }
  if (!list.some(f => f.id === state.format)) state.format = list[0]?.id ?? state.format
  formatSelect.value = state.format

  // preset options
  const box = $('format-options')
  box.replaceChildren()
  const opts = formatOptions()
  for (const o of format().options ?? []) {
    const label = document.createElement('label')
    let input
    if (o.type === 'bool') {
      label.className = 'check'
      input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = opts[o.id]
      label.append(input, ` ${o.label}`)
    } else {
      label.className = 'field'
      const span = document.createElement('span')
      span.textContent = o.label
      if (o.type === 'color') {
        input = document.createElement('input')
        input.type = 'color'
        input.value = '#' + opts[o.id].toString(16).padStart(6, '0')
      } else {
        input = document.createElement('select')
        for (const c of o.choices) input.add(new Option(String(c), String(c)))
        input.value = String(opts[o.id])
      }
      label.append(span, input)
    }
    input.addEventListener('input', () => {
      const v = o.type === 'bool' ? input.checked : o.type === 'color' ? parseInt(input.value.slice(1), 16) : +input.value
      state.options[state.format] = { ...state.options[state.format], [o.id]: v }
      refresh()
    })
    box.append(label)
  }

  for (const b of document.querySelectorAll('[data-radix]')) b.setAttribute('aria-pressed', String(b.dataset.radix === state.radix))
}

function selectTool(id) {
  if (!visibleTools(state.noob).some(t => t.id === id)) return
  state.tool = id
  for (const b of $('tool-buttons').children) b.setAttribute('aria-checked', String(b.dataset.tool === id))
  $('text-options').hidden = id !== 'text'
  refresh({ light: true })
}

// ---------- text ----------

let hover = null
const glyphs = {}
let textCache = { key: '', bitmap: B.create(0, 0) }

// The text as a bitmap in the chosen font and size, rendered again only when one changes
function textBitmap() {
  const { value, font, size } = state.text
  const f = fonts.find(x => x.id === font) ?? fonts[0]
  const key = `${f.id}|${size}|${Object.keys(glyphs).length}|${value}`
  if (textCache.key !== key)
    textCache = { key, bitmap: f.file ? renderFont(value, glyphs[f.id] ?? [], size, f.index) : renderDeparture(value, size) }
  return textCache.bitmap
}

async function loadFonts() {
  const files = fonts.filter(f => f.file)
  const [sources] = await Promise.all([Promise.all(files.map(f => fetch(f.file).then(r => r.text()))), loadDeparture()])
  files.forEach((f, i) => (glyphs[f.id] = loadFont(sources[i])))
}

function resizeTo(w, h, label) {
  const b = state.bitmap
  if (b.w === w && b.h === h) return
  const was = state.mode
  state.mode = 'bitmap'
  change(old => B.resize(old, w, h))
  state.mode = was
  if (label) toast(label)
}

function setNoob(on) {
  state.noob = on
  if (on && !NOOB_SIZES.some(([w, h]) => w === state.bitmap.w && h === state.bitmap.h)) {
    const side = Math.max(state.bitmap.w, state.bitmap.h) > 8 ? 16 : 8
    resizeTo(side, side, `cropped to ${side}×${side}, Ctrl+Z brings it back`)
  }
  refresh({ controls: true })
}

// ---------- import, export, share ----------

function toast(text) {
  const t = $('toast')
  t.textContent = text
  t.hidden = false
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => (t.hidden = true), 3200)
}

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text)
    toast(`${what} copied`)
  } catch {
    toast('the clipboard is not available here')
  }
}

function importMessage(text, error) {
  const m = $('import-message')
  m.textContent = text
  m.classList.toggle('error', Boolean(error))
}

function chooseSize(candidates, count) {
  const dialog = $('size-dialog')
  $('size-text').textContent = `${count} values fit several sizes. Pick one:`
  const box = $('size-candidates')
  box.replaceChildren(
    ...candidates.slice(0, 24).map(([w, h]) => {
      const b = document.createElement('button')
      b.type = 'submit'
      b.className = 'button'
      b.value = `${w}x${h}`
      b.textContent = `${w}×${h}`
      return b
    }),
  )
  dialog.showModal()
  return new Promise(resolve =>
    dialog.addEventListener('close', () => resolve(dialog.returnValue.match(/^(\d+)x(\d+)$/)?.slice(1).map(Number)), { once: true }),
  )
}

async function importCode() {
  const text = $('import-text').value
  try {
    const parsed = parse(text)
    if (state.mode === 'chars') {
      const values = parsed.arrays.flatMap(a => a.values)
      const count = Math.min(SLOTS, Math.ceil(values.length / 8))
      edit(() => {
        for (let i = 0; i < count; i++) state.slots[i] = decode({ values: values.slice(i * 8, i * 8 + 8) }, lcd, 5, 8)
      })
      importMessage(`${count} character${count === 1 ? '' : 's'} imported`)
      return
    }
    const array = parsed.arrays[0]
    const f = format()
    let { size, candidates } = inferSize(parsed, array, f, [state.bitmap.w, state.bitmap.h])
    if (!size && candidates?.length) size = await chooseSize(candidates, array.values.length)
    if (!size) return importMessage(`${array.values.length} values do not fit ${f.lib}: choose the library the code was made for`, true)
    const [w, h] = size
    if (state.noob && !NOOB_SIZES.some(s => s[0] === w && s[1] === h)) {
      state.noob = false
      toast(`noob mode off: the picture is ${w}×${h}`)
    }
    if (array.name) state.name = array.name
    change(() => decode(array, f, w, h))
    refresh({ controls: true })
    importMessage(`${w}×${h} imported as ${f.lib}`)
  } catch (e) {
    importMessage(e instanceof ParseError ? e.message : `could not read that: ${e.message}`, true)
  }
}

async function importImage(blob) {
  if (state.noob) return toast('turn noob mode off to import images')
  let image
  try {
    image = await createImageBitmap(blob)
  } catch {
    return toast('that file is not an image the browser can read')
  }
  const b = current()
  const result = await openImageDialog($('image-dialog'), image, b.w, b.h)
  if (result) change(() => result)
}

function shareLink() {
  const hash = state.mode === 'chars' ? encodeChars(usedSlots()) : encodeBitmap(state.bitmap, state.format)
  history.replaceState(null, '', `#${hash}`)
  copy(location.href, 'link')
}

function openHash() {
  const d = decodeHash(location.hash)
  if (!d) return false
  if (d.kind === 'chars') {
    state.mode = 'chars'
    d.slots.forEach((s, i) => (state.slots[i] = s))
  } else {
    state.mode = 'bitmap'
    state.bitmap = d.bitmap
    state.format = d.format
    if (!NOOB_SIZES.some(([w, h]) => w === d.bitmap.w && h === d.bitmap.h) || !byId(d.format).noob) state.noob = false
  }
  return true
}

function remember() {
  save({
    noob: state.noob,
    mode: state.mode,
    bitmap: encodeBitmap(state.bitmap, state.format),
    chars: encodeChars(state.slots),
    display: state.display,
    options: state.options,
    name: state.name,
    charsName: state.charsName,
    radix: state.radix,
    pen: state.pen,
    text: state.text,
  })
}

function restoreSaved() {
  const b = saved.bitmap && decodeHash(saved.bitmap)
  if (b?.kind === 'bitmap') {
    state.bitmap = b.bitmap
    state.format = b.format
  }
  const c = saved.chars && decodeHash(saved.chars)
  if (c?.kind === 'chars') c.slots.forEach((s, i) => (state.slots[i] = s))
  for (const k of ['mode', 'display', 'options', 'name', 'charsName', 'radix', 'pen', 'text']) if (saved[k] !== undefined) state[k] = saved[k]
  $('pen-size').value = state.pen
  $('pen-size-value').value = state.pen
}

// ---------- events ----------

function wire() {
  for (const tab of document.querySelectorAll('[role=tab]'))
    tab.addEventListener('click', () => {
      state.mode = tab.dataset.mode
      refresh({ controls: true })
    })

  $('noob').addEventListener('change', e => setNoob(e.target.checked))

  const textInput = (id, key, read) =>
    $(id).addEventListener('input', e => {
      state.text = { ...state.text, [key]: read(e.target.value) }
      refresh({ light: true })
      remember()
    })
  textInput('text-input', 'value', v => v)
  textInput('text-font', 'font', v => v)
  textInput('text-size', 'size', Number)

  $('pen-size').addEventListener('input', e => {
    state.pen = +e.target.value
    $('pen-size-value').value = state.pen
    remember()
  })

  $('undo').addEventListener('click', undo)
  $('redo').addEventListener('click', redo)
  $('invert').addEventListener('click', () => change(B.invert))
  $('clear').addEventListener('click', () => change(b => B.create(b.w, b.h)))
  $('rotate').addEventListener('click', () => {
    change(B.rotate90)
    refresh({ controls: true })
  })
  $('flip-h').addEventListener('click', () => change(B.flipH))
  $('flip-v').addEventListener('click', () => change(B.flipV))
  for (const b of document.querySelectorAll('[data-shift]')) {
    const [dx, dy] = b.dataset.shift.split(',').map(Number)
    b.addEventListener('click', () => change(old => B.shift(old, dx, dy, $('shift-wrap').checked)))
  }

  $('display').addEventListener('change', e => {
    const d = displays.find(x => x.id === e.target.value)
    state.display = e.target.value
    if (!d) return refresh({ controls: true })
    state.format = d.format
    resizeTo(d.w, d.h)
    refresh({ controls: true })
  })

  const custom = () => {
    const w = Math.max(1, Math.min(256, +$('width').value || 1))
    const h = Math.max(1, Math.min(256, +$('height').value || 1))
    state.display = 'custom'
    resizeTo(w, h)
    refresh({ controls: true })
  }
  $('width').addEventListener('change', custom)
  $('height').addEventListener('change', custom)

  $('format').addEventListener('change', e => {
    state.format = e.target.value
    refresh({ controls: true })
  })

  $('name').addEventListener('input', e => {
    const name = identifier(e.target.value)
    if (state.mode === 'chars') state.charsName = name
    else state.name = name
    refresh()
  })

  for (const b of document.querySelectorAll('[data-radix]'))
    b.addEventListener('click', () => {
      state.radix = b.dataset.radix
      refresh({ controls: true })
    })

  $('copy').addEventListener('click', () => copy($('code').textContent, 'code'))
  $('usage').addEventListener('click', () => copy($('usage').textContent, 'draw call'))
  $('usage').title = 'click to copy'
  $('share').addEventListener('click', shareLink)
  $('import-code').addEventListener('click', importCode)
  $('import-image').addEventListener('click', () => $('image-file').click())
  $('image-file').addEventListener('change', e => {
    const file = e.target.files[0]
    e.target.value = ''
    if (file) importImage(file)
  })

  for (const target of [$('canvas-wrap'), $('import-card')]) {
    target.addEventListener('dragover', e => e.preventDefault())
    target.addEventListener('drop', e => {
      e.preventDefault()
      const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'))
      if (file) importImage(file)
    })
  }

  addEventListener('paste', e => {
    if (e.target.closest?.('input, textarea')) return
    const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'))
    if (item) importImage(item.getAsFile())
  })

  addEventListener('hashchange', () => openHash() && refresh({ controls: true }))

  addEventListener('keydown', e => {
    // Text fields, lists and sliders keep their keys; a focused checkbox or button does not
    if (e.target.closest('input:not([type=checkbox]), textarea, select, dialog')) return
    // e.code names the physical key, so shortcuts work the same on any layout
    const code = e.code
    if (e.ctrlKey || e.metaKey) {
      if (code === 'KeyZ' && e.shiftKey) redo()
      else if (code === 'KeyZ') undo()
      else if (code === 'KeyY') redo()
      else return
      e.preventDefault()
      return
    }
    const tool = tools.find(t => `Key${t.key.replace('Shift+', '')}` === code && t.key.startsWith('Shift+') === e.shiftKey)
    const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
    if (tool) selectTool(tool.id)
    else if (code === 'BracketLeft' || code === 'BracketRight') {
      state.pen = Math.max(1, Math.min(8, state.pen + (code === 'BracketRight' ? 1 : -1)))
      $('pen-size').value = state.pen
      $('pen-size-value').value = state.pen
    } else if (code === 'KeyI') change(B.invert)
    else if (arrows[code] && !state.noob) change(old => B.shift(old, ...arrows[code], $('shift-wrap').checked))
    else if (state.mode === 'chars' && /^Digit[1-8]$/.test(code)) selectSlot(+code.slice(5) - 1)
    else return
    e.preventDefault()
  })
}

// ---------- start ----------

restoreSaved()
openHash()
wire()
const cloud = startCloud($('cloud'))
initTheme($('theme'), $('theme-icon'), () => {
  editor.recolor()
  cloud.recolor()
  refresh()
})
refresh({ controls: true })
loadFonts().then(() => refresh({ light: true }))
