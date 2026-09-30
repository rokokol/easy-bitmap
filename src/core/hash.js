// The share link: the whole picture packed into the URL fragment.
//   1.b.<w>.<h>.<preset>.<base64url of rows, MSB = left>   a bitmap
//   1.c.<n>.<base64url of n x 8 character rows>           LCD characters
import { layouts, pack, unpack, byId } from './formats.js'

const MAX_SIDE = 256

function toBase64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return undefined
  try {
    return Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  } catch {
    return undefined
  }
}

export function encodeBitmap(b, format) {
  return ['1', 'b', b.w, b.h, format, toBase64url(pack(b, layouts.rowsMsb))].join('.')
}

export function encodeChars(slots) {
  return ['1', 'c', slots.length, toBase64url(slots.flatMap(s => pack(s, layouts.char5)))].join('.')
}

const side = t => (/^\d+$/.test(t) && +t >= 1 && +t <= MAX_SIDE ? +t : undefined)

export function decodeHash(text) {
  const parts = String(text).replace(/^#/, '').split('.')
  if (parts[0] !== '1') return undefined
  if (parts[1] === 'b' && parts.length === 6) {
    const [w, h] = [side(parts[2]), side(parts[3])]
    const bytes = fromBase64url(parts[5])
    if (!w || !h || !byId(parts[4]) || !bytes || bytes.length !== Math.ceil(w / 8) * h) return undefined
    return { kind: 'bitmap', format: parts[4], bitmap: unpack(bytes, w, h, layouts.rowsMsb) }
  }
  if (parts[1] === 'c' && parts.length === 4) {
    const n = /^[1-8]$/.test(parts[2]) ? +parts[2] : 0
    const bytes = fromBase64url(parts[3])
    if (!n || !bytes || bytes.length !== n * 8 || bytes.some(v => v > 31)) return undefined
    const slots = []
    for (let i = 0; i < n; i++) slots.push(unpack(bytes.slice(i * 8, i * 8 + 8), 5, 8, layouts.char5))
    return { kind: 'chars', slots }
  }
  return undefined
}
