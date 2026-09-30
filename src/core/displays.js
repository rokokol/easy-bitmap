// Display presets and drawing tools, with the noob-mode filter over them and over the
// export presets. Noob mode is for LED matrices: 8x8 and 16x16, pen and eraser only
import { formats, fits } from './formats.js'

export const NOOB_SIZES = [[8, 8], [16, 16]]

// kind drives the preview: 'led' round dots, 'oled' lit pixels, 'lcd' a grey panel
export const displays = [
  { id: 'led8', label: 'LED matrix 8×8', w: 8, h: 8, kind: 'led', format: 'gyvermax7219', noob: true },
  { id: 'led16', label: 'LED matrix 16×16', w: 16, h: 16, kind: 'led', format: 'gyvermax7219', noob: true },
  { id: 'max32x8', label: 'MAX7219 4-in-1, 32×8', w: 32, h: 8, kind: 'led', format: 'gyvermax7219' },
  { id: 'ht16k33', label: 'HT16K33 backpack, 16×8', w: 16, h: 8, kind: 'led', format: 'ledbackpack' },
  { id: 'oled128x64', label: 'OLED 128×64 (SSD1306, SH1106)', w: 128, h: 64, kind: 'oled', format: 'gyveroled' },
  { id: 'oled128x32', label: 'OLED 128×32 (SSD1306)', w: 128, h: 32, kind: 'oled', format: 'gyveroled' },
  { id: 'oled72x40', label: 'OLED 0.42″ 72×40', w: 72, h: 40, kind: 'oled', format: 'u8g2' },
  { id: 'nokia5110', label: 'Nokia 5110, 84×48 (PCD8544)', w: 84, h: 48, kind: 'lcd', format: 'adafruit' },
]

// `short` is the button text, `label` its tooltip
export const tools = [
  { id: 'pen', short: 'pen', label: 'Pen', key: 'D', noob: true },
  { id: 'eraser', short: 'eraser', label: 'Eraser', key: 'E', noob: true },
  { id: 'line', short: 'line', label: 'Line', key: 'L' },
  { id: 'rect', short: 'rect', label: 'Rectangle', key: 'R' },
  { id: 'rectFill', short: 'box', label: 'Filled rectangle', key: 'Shift+R' },
  { id: 'fill', short: 'fill', label: 'Fill', key: 'F' },
]

export function visibleDisplays(noob) {
  return noob ? displays.filter(d => d.noob) : displays
}

export function visibleTools(noob) {
  return noob ? tools.filter(t => t.noob) : tools
}

// LCD characters have their own tab, so the bitmap list never shows them
export function visibleFormats(noob, w, h) {
  return formats.filter(f => f.group !== 'LCD' && (!noob || f.noob) && fits(f, w, h))
}
