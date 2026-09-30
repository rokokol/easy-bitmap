// A 1-bit picture: one byte per pixel, row-major, 1 = lit. Packing into a library's
// byte layout happens only on export, in formats.js

export function create(w, h) {
  return { w, h, data: new Uint8Array(w * h) }
}

export function clone(b) {
  return { w: b.w, h: b.h, data: b.data.slice() }
}

export function equals(a, b) {
  if (a.w !== b.w || a.h !== b.h) return false
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) return false
  return true
}

export function inside(b, x, y) {
  return x >= 0 && y >= 0 && x < b.w && y < b.h
}

export function get(b, x, y) {
  return inside(b, x, y) ? b.data[y * b.w + x] : 0
}

export function set(b, x, y, v) {
  if (inside(b, x, y)) b.data[y * b.w + x] = v ? 1 : 0
}

export function toRows(b) {
  const rows = []
  for (let y = 0; y < b.h; y++) {
    let row = ''
    for (let x = 0; x < b.w; x++) row += get(b, x, y) ? '#' : '.'
    rows.push(row)
  }
  return rows
}

function map(b, w, h, from) {
  const out = create(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.data[y * w + x] = from(x, y)
  return out
}

// Clockwise: the old left column becomes the new top row
export function rotate90(b) {
  return map(b, b.h, b.w, (x, y) => get(b, y, b.h - 1 - x))
}

export function flipH(b) {
  return map(b, b.w, b.h, (x, y) => get(b, b.w - 1 - x, y))
}

export function flipV(b) {
  return map(b, b.w, b.h, (x, y) => get(b, x, b.h - 1 - y))
}

export function invert(b) {
  return map(b, b.w, b.h, (x, y) => 1 - get(b, x, y))
}

const mod = (a, n) => ((a % n) + n) % n

export function shift(b, dx, dy, wrap) {
  return map(b, b.w, b.h, (x, y) =>
    wrap ? get(b, mod(x - dx, b.w), mod(y - dy, b.h)) : get(b, x - dx, y - dy))
}

// Keeps the top-left corner; new space is unlit
export function resize(b, w, h) {
  return map(b, w, h, (x, y) => get(b, x, y))
}

export function scale(b, n) {
  return map(b, b.w * n, b.h * n, (x, y) => get(b, Math.floor(x / n), Math.floor(y / n)))
}

// Sets to v every pixel of b under a lit pixel of src placed at (ox, oy); unlit ones leave
// b alone, so text or a stamp keeps the picture around it
export function stampOn(b, src, ox, oy, v) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) if (src.data[y * src.w + x]) set(b, ox + x, oy + y, v)
}

// Pastes src into dst with its top-left corner at (ox, oy)
export function paste(dst, src, ox, oy) {
  const out = clone(dst)
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) set(out, ox + x, oy + y, get(src, x, y))
  return out
}

// A square pen of the given size; an even size leans towards the top-left
export function stamp(b, x, y, size, v) {
  const lo = -Math.floor((size - 1) / 2)
  for (let dy = lo; dy < lo + size; dy++) for (let dx = lo; dx < lo + size; dx++) set(b, x + dx, y + dy, v)
}

// Bresenham, stamping the pen at every cell
export function line(b, x0, y0, x1, y1, v, size) {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    stamp(b, x0, y0, size, v)
    if (x0 === x1 && y0 === y1) return
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

export function rect(b, x0, y0, x1, y1, v, filled) {
  const [l, r] = [Math.min(x0, x1), Math.max(x0, x1)]
  const [t, d] = [Math.min(y0, y1), Math.max(y0, y1)]
  for (let y = t; y <= d; y++)
    for (let x = l; x <= r; x++) if (filled || x === l || x === r || y === t || y === d) set(b, x, y, v)
}

// Iterative, so a 256x256 empty field does not blow the stack
export function floodFill(b, x, y, v) {
  if (!inside(b, x, y)) return
  const from = get(b, x, y)
  const to = v ? 1 : 0
  if (from === to) return
  const stack = [y * b.w + x]
  while (stack.length) {
    const i = stack.pop()
    if (b.data[i] !== from) continue
    b.data[i] = to
    const cx = i % b.w
    const cy = (i - cx) / b.w
    if (cx > 0) stack.push(i - 1)
    if (cx < b.w - 1) stack.push(i + 1)
    if (cy > 0) stack.push(i - b.w)
    if (cy < b.h - 1) stack.push(i + b.w)
  }
}
