// The site as a visitor meets it: every test starts from a clean browser and fails on any
// console error. Picture state is read from what the page hands out, the code and the link
import { test, expect } from '@playwright/test'

let errors

test.beforeEach(async ({ page }) => {
  errors = []
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/')
})

test.afterEach(() => expect(errors).toEqual([]))

// Clicks cell (x, y) of the editor, with the right button when `erase`
async function tap(page, x, y, w, h, erase = false) {
  const r = await page.locator('#editor').boundingBox()
  await page.mouse.click(r.x + ((x + 0.5) * r.width) / w, r.y + ((y + 0.5) * r.height) / h, {
    button: erase ? 'right' : 'left',
  })
}

const code = page => page.locator('#code')

test('the header draws the heart from favicon.svg', async ({ page }) => {
  const width = () => page.evaluate(() => document.querySelector('.brand-mark use').getBBox().width)
  await expect.poll(width).toBeGreaterThan(0)
})

test('noob mode is on by default and offers LED matrices with pen and eraser only', async ({ page }) => {
  await expect(page.locator('#noob')).toBeChecked()
  await expect(page.locator('#tool-buttons .tool')).toHaveText(['pen', 'eraser'])
  await expect(page.locator('#display option')).toHaveCount(2)
  const groups = await page.locator('#format optgroup').evaluateAll(gs => gs.map(g => g.label))
  expect(groups).toEqual(['LED matrix'])
  await expect(page.locator('#import-image')).toBeHidden()
})

test('a drawn pixel shows up in the exported bytes, MSB first for GyverMAX7219', async ({ page }) => {
  await tap(page, 1, 0, 8, 8)
  await tap(page, 7, 2, 8, 8)
  await expect(code(page)).toContainText('const uint8_t bitmap[] PROGMEM = {')
  const bytes = async () => (await code(page).textContent()).match(/0x[0-9A-F]{2}/g)
  await expect.poll(bytes).toEqual(['0x40', '0x00', '0x01', '0x00', '0x00', '0x00', '0x00', '0x00'])
  await tap(page, 1, 0, 8, 8, true)
  await expect(code(page)).toContainText('0x00,\n  0x00,\n  0x01,')
})

test('undo and redo walk every change back and forth', async ({ page }) => {
  await tap(page, 0, 0, 8, 8)
  await page.click('#invert')
  await expect(code(page)).toContainText('0x7F')
  await page.keyboard.press('Control+z')
  await expect(code(page)).toContainText('0x80')
  await page.keyboard.press('Control+Shift+z')
  await expect(code(page)).toContainText('0x7F')
})

// A key event as a Russian layout sends it: the letter differs, the physical key does not
async function pressOnRussianLayout(page, code, key, modifiers = {}) {
  await page.evaluate(
    ([code, key, modifiers]) =>
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true, ...modifiers })),
    [code, key, modifiers],
  )
}

test('shortcuts follow the physical key on any keyboard layout', async ({ page }) => {
  await tap(page, 0, 0, 8, 8)
  await expect(code(page)).toContainText('0x80')
  await pressOnRussianLayout(page, 'KeyZ', 'я', { ctrlKey: true })
  await expect(code(page)).not.toContainText('0x80')
  await pressOnRussianLayout(page, 'KeyZ', 'Я', { ctrlKey: true, shiftKey: true })
  await expect(code(page)).toContainText('0x80')
  await pressOnRussianLayout(page, 'KeyE', 'у')
  await expect(page.locator('[data-tool=eraser]')).toHaveAttribute('aria-checked', 'true')
  await pressOnRussianLayout(page, 'KeyI', 'ш')
  await expect(code(page)).toContainText('0x7F')
})

test('the exported code imports back to the same picture', async ({ page }) => {
  for (const [x, y] of [[0, 0], [3, 4], [7, 7], [5, 1]]) await tap(page, x, y, 8, 8)
  await expect(code(page)).toContainText('0x80')
  const exported = await code(page).textContent()
  await page.click('#clear')
  await expect(code(page)).not.toContainText('0x80')
  await page.fill('#import-text', exported)
  await page.click('#import-code')
  await expect(code(page)).toHaveText(exported)
})

test('the pink lines are named: MAX7219 modules, OLED pages, none on a single module', async ({ page }) => {
  await expect(page.locator('#guide-note')).toHaveText('')
  await page.selectOption('#display', 'led16')
  await expect(page.locator('#guide-note')).toHaveText('pink lines: 8×8 MAX7219 modules')
  await page.click('.switch')
  await page.selectOption('#display', 'oled128x64')
  await expect(page.locator('#guide-note')).toHaveText('pink lines: pages of 8 rows, one byte per column')
  await page.selectOption('#format', 'u8g2')
  await expect(page.locator('#guide-note')).toHaveText('')
})

test('importing a 16x16 array switches the display to the 16x16 matrix', async ({ page }) => {
  const rows = Array.from({ length: 16 }, () => '0xFF, 0x00').join(',\n')
  await page.fill('#import-text', `// 16x16\nuint8_t m[] = {\n${rows}\n};`)
  await page.click('#import-code')
  await expect(code(page)).toContainText('#define M_W 16')
  await expect(page.locator('#display')).toHaveValue('led16')
  await expect(page.locator('#preview-caption')).toHaveText('LED matrix 16×16')
})

test('the text tool stamps the 5x8 font and Departure Mono, and is not in noob mode', async ({ page }) => {
  await expect(page.locator('[data-tool=text]')).toHaveCount(0)
  await page.click('.switch')
  await page.selectOption('#display', 'oled128x32')
  await page.click('[data-tool=text]')
  await expect(page.locator('#text-options')).toBeVisible()
  await page.fill('#text-input', 'Ж')
  await tap(page, 0, 0, 128, 32)
  // Ж in the 5x8 font: columns 77 08 7F 08 77, so the first page reads them as bytes
  await expect(code(page)).toContainText('0x77, 0x08, 0x7F, 0x08, 0x77, 0x00')
  await page.click('#clear')
  // "A" in glcdfont.c: 7C 12 11 12 7C
  await page.selectOption('#text-font', 'adafruit5x7')
  await page.fill('#text-input', 'A')
  await tap(page, 0, 0, 128, 32)
  await expect(code(page)).toContainText('0x7C, 0x12, 0x11, 0x12, 0x7C, 0x00')
  await page.click('#clear')
  await page.selectOption('#text-font', 'departure')
  await tap(page, 0, 0, 128, 32)
  await expect(code(page)).not.toContainText('0x77, 0x08, 0x7F')
  await expect.poll(async () => ((await code(page).textContent()).match(/0x[1-9A-F][0-9A-F]|0x0[1-9A-F]/g) ?? []).length).toBeGreaterThan(3)
  await tap(page, 0, 0, 128, 32, true)
  await expect.poll(async () => ((await code(page).textContent()).match(/0x[1-9A-F][0-9A-F]|0x0[1-9A-F]/g) ?? []).length).toBe(0)
})

test('noob mode off reveals every tool and display; back on crops, and undo restores', async ({ page }) => {
  await page.click('.switch')
  await expect(page.locator('#tool-buttons .tool')).toHaveCount(7)
  await expect(page.locator('#import-image')).toBeVisible()
  await page.selectOption('#display', 'oled128x64')
  await expect(code(page)).toContainText('#define BITMAP_W 128')
  await expect(page.locator('#format')).toHaveValue('gyveroled')
  await page.click('.switch')
  await expect(page.locator('#toast')).toContainText('16×16')
  await expect(code(page)).toContainText('#define BITMAP_W 16')
  // Focus stays on the switch, as it does for a visitor who follows the toast
  await page.keyboard.press('Control+z')
  await expect(code(page)).toContainText('#define BITMAP_W 128')
})

test('rotate turns a 16x8 picture into 8x16, and undo turns it back', async ({ page }) => {
  await page.click('.switch')
  await page.selectOption('#display', 'ht16k33')
  await expect(code(page)).toContainText('#define BITMAP_W 16')
  await page.click('#rotate')
  await expect(code(page)).toContainText('#define BITMAP_W 8')
  await expect(code(page)).toContainText('#define BITMAP_H 16')
  await page.click('#undo')
  await expect(code(page)).toContainText('#define BITMAP_W 16')
})

test('LCD characters: each slot is 5x8 and the export grows with the slots used', async ({ page }) => {
  await page.click('#tab-chars')
  await expect(page.locator('#slots .slot')).toHaveCount(8)
  await tap(page, 0, 0, 5, 8)
  await expect(code(page)).toContainText('byte chars[1][8] = {')
  await expect(code(page)).toContainText('{ 0b10000, 0b00000,')
  await page.keyboard.press('3')
  await tap(page, 4, 7, 5, 8)
  await expect(code(page)).toContainText('byte chars[3][8] = {')
  await expect(page.locator('#usage')).toContainText('i < 3; i++) lcd.createChar(i, chars[i]);')
})

test('a shared link opens the same picture in a fresh page', async ({ page, context, browserName }) => {
  await page.click('.switch')
  await page.selectOption('#display', 'max32x8')
  await tap(page, 31, 7, 32, 8)
  await tap(page, 9, 3, 32, 8)
  await expect(code(page)).toContainText('0x40')
  const exported = await code(page).textContent()
  // Only Chromium lets a test grant the clipboard; elsewhere the page says it could not copy,
  // and the link is in the address bar all the same
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.click('#share')
  await expect(page).toHaveURL(/#1\.b\.32\.8\./)
  if (browserName === 'chromium') await expect(page.locator('#toast')).toHaveText('link copied')
  const other = await context.newPage()
  await other.goto(page.url())
  await expect(other.locator('#code')).toHaveText(exported)
})

test('the picture survives a reload', async ({ page }) => {
  await tap(page, 2, 2, 8, 8)
  await expect(code(page)).toContainText('0x20')
  await page.waitForTimeout(400)
  await page.reload()
  await expect(code(page)).toContainText('0x20')
})

test('an image imports through the dialog, and one undo removes it', async ({ page }) => {
  await page.click('.switch')
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 32, 32)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 16, 32)
    return c.toDataURL('image/png').split(',')[1]
  })
  await page.setInputFiles('#image-file', { name: 'half.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await expect(page.locator('#image-dialog')).toBeVisible()
  await page.click('#image-apply')
  await expect(page.locator('#image-dialog')).toBeHidden()
  // An 8x8 picture whose left half is dark: every row reads 0xF0
  await expect(code(page)).toContainText('0xF0,\n  0xF0,')
  await page.click('#undo')
  await expect(code(page)).not.toContainText('0xF0')
})

test('the theme button cycles system, light and dark, and the page follows', async ({ page }) => {
  const ground = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
  await expect(page.locator('#theme')).toHaveAttribute('aria-label', 'Theme: system')
  await page.click('#theme')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await ground()).toBe('rgb(255, 255, 255)')
  await page.click('#theme')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await ground()).toBe('rgb(34, 34, 34)')
  await page.click('#theme')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./)
})

test('a phone-width page has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.click('.switch')
  await page.selectOption('#display', 'oled128x64')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBe(0)
})
