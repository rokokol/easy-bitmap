// Image import: the knob table below builds both the dialog's controls and the pipeline
// input. Order of work: fit the image into w x h, read lightness, apply tone, dither
import { luminance, adjust, dither, algorithms } from '../core/dither.js'
import { color } from './colors.js'

const knobs = [
  { id: 'fit', label: 'fit', type: 'select', options: { contain: 'contain', cover: 'cover', stretch: 'stretch' }, value: 'contain' },
  { id: 'scale', label: 'scale %', type: 'range', min: 10, max: 400, step: 5, value: 100 },
  { id: 'offsetX', label: 'offset x %', type: 'range', min: -100, max: 100, step: 1, value: 0 },
  { id: 'offsetY', label: 'offset y %', type: 'range', min: -100, max: 100, step: 1, value: 0 },
  { id: 'smooth', label: 'smooth scaling', hint: 'On for photos; off keeps pixel art sharp', type: 'bool', value: true },
  { id: 'background', label: 'transparent as', type: 'select', options: { white: 'white', black: 'black' }, value: 'white' },
  { id: 'brightness', label: 'brightness', type: 'range', min: -100, max: 100, step: 1, value: 0 },
  { id: 'contrast', label: 'contrast', type: 'range', min: -100, max: 100, step: 1, value: 0 },
  { id: 'gamma', label: 'gamma', type: 'range', min: 20, max: 300, step: 5, value: 100 },
  { id: 'invert', label: 'invert', hint: 'Light pixels of the image become lit', type: 'bool', value: false },
  { id: 'algorithm', label: 'dithering', type: 'select', options: algorithms, value: 'floyd' },
  { id: 'threshold', label: 'threshold', type: 'range', min: 0, max: 100, step: 1, value: 50 },
  { id: 'serpentine', label: 'serpentine scan', type: 'bool', value: true },
]

function buildControls(container, values, onInput) {
  container.replaceChildren()
  for (const k of knobs) {
    const label = document.createElement('label')
    label.className = k.type === 'bool' ? 'check' : 'field'
    if (k.hint) label.title = k.hint
    const text = document.createElement('span')
    text.textContent = k.label
    let input
    if (k.type === 'select') {
      input = document.createElement('select')
      for (const [value, name] of Object.entries(k.options)) input.add(new Option(name, value))
      input.value = values[k.id]
    } else if (k.type === 'bool') {
      input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = values[k.id]
    } else {
      input = document.createElement('input')
      input.type = 'range'
      Object.assign(input, { min: k.min, max: k.max, step: k.step, value: values[k.id] })
      const out = document.createElement('output')
      out.value = values[k.id]
      text.append(' ', out)
      input.addEventListener('input', () => (out.value = input.value))
    }
    input.addEventListener('input', () => {
      values[k.id] = k.type === 'bool' ? input.checked : k.type === 'range' ? +input.value : input.value
      onInput()
    })
    if (k.type === 'bool') label.append(input, text)
    else label.append(text, input)
    container.append(label)
  }
}

function convert(image, w, h, v) {
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = v.smooth
  ctx.imageSmoothingQuality = 'high'
  let sx = w / image.width
  let sy = h / image.height
  if (v.fit === 'contain') sx = sy = Math.min(sx, sy)
  if (v.fit === 'cover') sx = sy = Math.max(sx, sy)
  const dw = image.width * sx * (v.scale / 100)
  const dh = image.height * sy * (v.scale / 100)
  const dx = (w - dw) / 2 + (v.offsetX / 100) * w
  const dy = (h - dh) / 2 + (v.offsetY / 100) * h
  ctx.drawImage(image, dx, dy, dw, dh)
  const lum = luminance(ctx.getImageData(0, 0, w, h).data, w, h, v.background)
  const toned = adjust(lum, {
    brightness: v.brightness / 100,
    contrast: v.contrast / 100,
    gamma: v.gamma / 100,
    invert: v.invert,
  })
  return dither(toned, w, h, { algorithm: v.algorithm, threshold: v.threshold / 100, serpentine: v.serpentine })
}

function drawResult(canvas, b) {
  const s = Math.max(1, Math.floor(Math.min(480 / b.w, 360 / b.h)))
  canvas.width = b.w * s
  canvas.height = b.h * s
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color('--cell-off')
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color('--cell-on')
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.data[y * b.w + x]) ctx.fillRect(x * s, y * s, s, s)
}

// Shows the dialog for an image and resolves to the bitmap, or undefined on cancel
export function openImageDialog(dialog, image, w, h) {
  const values = Object.fromEntries(knobs.map(k => [k.id, k.value]))
  const preview = dialog.querySelector('#image-preview')
  let result
  let pending = 0
  const update = () => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => {
      result = convert(image, w, h, values)
      drawResult(preview, result)
    })
  }
  buildControls(dialog.querySelector('#image-knobs'), values, update)
  update()
  dialog.showModal()
  return new Promise(resolve => {
    dialog.addEventListener(
      'close',
      () => resolve(dialog.returnValue === 'apply' ? result ?? convert(image, w, h, values) : undefined),
      { once: true },
    )
  })
}
