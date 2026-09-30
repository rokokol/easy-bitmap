// The theme button cycles system, light, dark. "system" leaves data-theme unset so CSS
// follows the OS; the choice is kept in localStorage and applied before paint by index.html
const KEY = 'easy-bitmap:theme'
const MODES = ['system', 'light', 'dark']

// 8x8 pixel icons: a monitor, a sun, a moon
const ICONS = {
  system: 'M0 1h8v5H0zM1 2v3h6V2zM3 6h2v1H3zM2 7h4v1H2z',
  light: 'M3 0h2v1H3zM3 7h2v1H3zM0 3h1v2H0zM7 3h1v2H7zM2 2h4v4H2zM1 1h1v1H1zM6 1h1v1H6zM1 6h1v1H1zM6 6h1v1H6z',
  dark: 'M2 0h3v1H2zM1 1h2v1H1zM0 2h2v4H0zM1 6h2v1H1zM2 7h4v1H2zM5 6h2v1H5zM6 5h2v1H6z',
}

function stored() {
  try {
    const t = localStorage.getItem(KEY)
    return MODES.includes(t) ? t : 'system'
  } catch {
    return 'system'
  }
}

export function initTheme(button, icon, onChange) {
  let mode = stored()
  const apply = () => {
    const root = document.documentElement
    if (mode === 'system') delete root.dataset.theme
    else root.dataset.theme = mode
    icon.setAttribute('d', ICONS[mode])
    icon.setAttribute('fill-rule', 'evenodd')
    button.setAttribute('aria-label', `Theme: ${mode}`)
    button.title = `Theme: ${mode}`
    onChange()
  }
  button.addEventListener('click', () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]
    try {
      if (mode === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, mode)
    } catch {}
    apply()
  })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onChange)
  apply()
}
