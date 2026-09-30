// Per-browser memory: the last picture and settings. Storage can be missing or throw
// (private windows, blocked site data), and the page works the same without it
const KEY = 'easy-bitmap:state'

export function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

let timer = 0

export function save(state) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {}
  }, 300)
}
