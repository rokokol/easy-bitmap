// Resolves a CSS colour role, or any CSS colour expression, to rgb() for the canvases.
// getComputedStyle returns a custom property as written, light-dark() and all, so the value
// is applied to a probe and read back resolved
let probe

export function color(value) {
  if (!probe) {
    probe = document.createElement('span')
    probe.hidden = true
    document.body.append(probe)
  }
  probe.style.color = value.startsWith('--') ? `var(${value})` : value
  return getComputedStyle(probe).color
}
