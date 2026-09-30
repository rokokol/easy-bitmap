// One entry per library a preset is checked against. The key names the preset unless
// `format` does; `include` and `sources` are paths under the vendor directory; `sizes` are
// the pictures the preset is drawn at, `chars` draws LCD glyph strips instead; `variants`
// run the same harness again with other export options and build defines. A preset
// missing here is checked by the unit vectors only, and README says why
const colour = 0xc060a0

const lcdPins = { link: ['-Wl,--wrap=digitalWrite'], format: 'hd44780', chars: true }

// The u8g2 C files the bitmap device links against, found by linking until nothing is
// undefined; the fonts, 40 MB of them, are never referenced
const u8g2Sources = [
  'u8g2_bitmap', 'u8g2_buffer', 'u8g2_cleardisplay', 'u8g2_font', 'u8g2_hvline', 'u8g2_intersection',
  'u8g2_kerning', 'u8g2_ll_hvline', 'u8g2_setup', 'u8x8_8x8', 'u8x8_byte', 'u8x8_cad', 'u8x8_capture',
  'u8x8_display', 'u8x8_gpio', 'u8x8_setup', 'u8x8_u16toa',
].map(f => `u8g2/csrc/${f}.c`)

// `covers` names presets whose drawing call is this library's, checked here in their place
const adafruitSsd1306 = {
  harness: 'adafruit.cpp',
  covers: ['neomatrix'],
  include: ['Adafruit-GFX-Library', 'Adafruit_BusIO', 'Adafruit_SSD1306'],
  sources: [
    'Adafruit-GFX-Library/Adafruit_GFX.cpp',
    'Adafruit_BusIO/Adafruit_I2CDevice.cpp',
    'Adafruit_BusIO/Adafruit_SPIDevice.cpp',
    'Adafruit_SSD1306/Adafruit_SSD1306.cpp',
  ],
  sizes: [[8, 8], [13, 11], [16, 16], [40, 24], [128, 64]],
}

export const targets = {
  fastled: {
    lib: 'FastLED (EpoxyDuino mock)',
    harness: 'fastled.cpp',
    include: ['EpoxyDuino/libraries/EpoxyMockFastLED'],
    sources: ['EpoxyDuino/libraries/EpoxyMockFastLED/FastLED.cpp'],
    sizes: [[8, 8], [13, 11], [16, 16]],
    variants: [true, false].map(serpentine => ({
      name: serpentine ? 'serpentine' : 'progressive',
      opts: { serpentine, color: colour },
      defines: [`-DSERPENTINE=${serpentine ? 1 : 0}`, `-DEXPECTED_RGB=${colour}`],
    })),
  },
  adafruit: adafruitSsd1306,
  adafruit_xbm: adafruitSsd1306,
  ledbackpack: {
    harness: 'ledbackpack.cpp',
    include: ['Adafruit-GFX-Library', 'Adafruit_BusIO', 'Adafruit_LED_Backpack'],
    sources: [
      'Adafruit-GFX-Library/Adafruit_GFX.cpp',
      'Adafruit_BusIO/Adafruit_I2CDevice.cpp',
      'Adafruit_LED_Backpack/Adafruit_LEDBackpack.cpp',
    ],
    sizes: [[8, 8], [16, 8]],
  },
  ledcontrol: {
    harness: 'ledcontrol.cpp',
    include: ['LedControl/src'],
    sources: ['LedControl/src/LedControl.cpp'],
    link: ['-Wl,--wrap=shiftOut,--wrap=digitalWrite'],
    sizes: [[8, 8], [16, 8], [16, 16]],
  },
  u8g2: {
    harness: 'u8g2.cpp',
    include: ['u8g2/csrc', 'u8g2/cppsrc'],
    sources: [...u8g2Sources, 'u8g2/sys/bitmap/common/u8x8_d_bitmap.c'],
    sizes: [[8, 8], [13, 11], [16, 16], [40, 24], [128, 64]],
  },
  tft_espi: {
    harness: 'tft_espi.cpp',
    include: ['TFT_eSPI'],
    sources: ['TFT_eSPI/TFT_eSPI.cpp'],
    sizes: [[8, 8], [13, 11], [16, 16], [40, 24], [128, 64]],
  },
  liquidcrystal: {
    ...lcdPins,
    lib: 'LiquidCrystal',
    harness: 'liquidcrystal.cpp',
    include: ['LiquidCrystal/src'],
    sources: ['LiquidCrystal/src/LiquidCrystal.cpp'],
  },
  // No licence, so no copy in this repository: fetched into the build directory at a
  // pinned commit instead, and never updated by the weekly cascade
  liquidcrystal_i2c: {
    fetch: { repo: 'johnrickman/LiquidCrystal_I2C', commit: '738765e388816fb2a687d40436cd2604febce1b1' },
    format: 'hd44780',
    chars: true,
    lib: 'LiquidCrystal_I2C',
    harness: 'liquidcrystal_i2c.cpp',
    include: ['LiquidCrystal_I2C'],
    sources: ['LiquidCrystal_I2C/LiquidCrystal_I2C.cpp'],
  },
  hd44780: {
    ...lcdPins,
    lib: 'hd44780',
    harness: 'hd44780.cpp',
    include: ['hd44780'],
    sources: ['hd44780/hd44780.cpp'],
  },
  md_max72xx: {
    harness: 'md_max72xx.cpp',
    include: ['MD_MAX72XX/src'],
    sources: ['MD_MAX72xx.cpp', 'MD_MAX72xx_buf.cpp', 'MD_MAX72xx_pix.cpp', 'MD_MAX72xx_font.cpp'].map(f => 'MD_MAX72XX/src/' + f),
    sizes: [[8, 8], [16, 8], [32, 8]],
  },
  microled: {
    harness: 'microled.cpp',
    include: ['microLED/src'],
    sources: ['microLED/src/color_utility.cpp'],
    sizes: [[8, 8], [13, 11], [16, 16]],
    variants: [1, 2, 3].map(depth => ({
      name: `COLOR_DEBTH ${depth}`,
      opts: { depth, color: colour },
      defines: [`-DCOLOR_DEBTH=${depth}`, `-DEXPECTED_RGB=${colour}`],
    })),
  },
  gyvergfx: {
    harness: 'gyvergfx.cpp',
    include: ['GyverGFX/src'],
    sources: [],
    sizes: [[8, 8], [13, 11], [16, 16], [40, 24]],
  },
  gyvermax7219: {
    harness: 'gyvermax7219.cpp',
    include: ['GyverGFX/src', 'GyverMAX7219/src'],
    sources: [],
    sizes: [[8, 8], [13, 11], [16, 16], [32, 32]],
  },
  gyveroled: {
    harness: 'gyveroled.cpp',
    include: ['GyverOLED/src'],
    sources: [],
    sizes: [[8, 8], [13, 11], [16, 16], [40, 24], [128, 64]],
  },
}
