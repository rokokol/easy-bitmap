#!/usr/bin/env bash
# The defect list for the library harness, read by `t.sh falsify` from the tests skill
# (https://github.com/rokokol/skills). Each entry breaks what one preset says about its
# library and requires the real library, drawing the emitted code, to notice:
#
#   t.sh falsify -d tests/defects-libs.sh -- node --test test/libs/libs.test.js
#
# Needs bash 3.2, since falsify sources it wherever t.sh runs

# shellcheck disable=SC2016 # a $ in single quotes here is text to find, not an expansion

defect gyveroled-msb src/core/formats.js \
  "label: 'GyverOLED (SSD1306, SH1106)',
    group: 'Display',
    layout: layouts.pagesLsb," \
  "label: 'GyverOLED (SSD1306, SH1106)',
    group: 'Display',
    layout: layouts.pagesMsb," \
  'GyverOLED pictures come out with every page upside down'

defect gyvermax7219-lsb src/core/formats.js \
  "noob: true,
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <GyverMAX7219.h>'," \
  "noob: true,
    layout: layouts.rowsLsb,
    progmem: true,
    include: '#include <GyverMAX7219.h>'," \
  'GyverMAX7219 mirrors every group of 8 columns'

defect u8g2-msb src/core/formats.js \
  "label: 'U8g2 drawXBMP',
    group: 'Display',
    layout: layouts.rowsLsb," \
  "label: 'U8g2 drawXBMP',
    group: 'Display',
    layout: layouts.rowsMsb," \
  'U8g2 mirrors every group of 8 columns'

defect adafruit-xbm-msb src/core/formats.js \
  "label: 'Adafruit GFX drawXBitmap',
    group: 'Display',
    layout: layouts.rowsLsb," \
  "label: 'Adafruit GFX drawXBitmap',
    group: 'Display',
    layout: layouts.rowsMsb," \
  'drawXBitmap mirrors every group of 8 columns'

defect tft-lsb src/core/formats.js \
  "label: 'TFT_eSPI drawBitmap',
    group: 'Display',
    layout: layouts.rowsMsb," \
  "label: 'TFT_eSPI drawBitmap',
    group: 'Display',
    layout: layouts.rowsLsb," \
  'TFT_eSPI mirrors every group of 8 columns'

defect backpack-lsb src/core/formats.js \
  "noob: true,
    layout: layouts.rowsMsb,
    progmem: true,
    include: '#include <Adafruit_LEDBackpack.h>'," \
  "noob: true,
    layout: layouts.rowsLsb,
    progmem: true,
    include: '#include <Adafruit_LEDBackpack.h>'," \
  'the HT16K33 backpack shows every row mirrored'

defect md-right-edge src/core/formats.js \
  'mx.setBuffer(mx.getColumnCount() - 1, ${W}, ${name});' \
  'mx.setBuffer(${W} - 1, ${W}, ${name});' \
  'the picture lands at the right end of the chain instead of the left'

defect md-const src/core/cemit.js \
  "const qualifier = format.progmem ? 'const ' : ''" \
  "const qualifier = 'const '" \
  'the MD_MAX72xx export no longer compiles'

defect ledcontrol-modules src/core/formats.js \
  '${name}[((m / ${cols}) * 8 + r) * ${cols} + m % ${cols}]' \
  '${name}[((m % ${cols}) * 8 + r) * ${cols} + m / ${cols}]' \
  'a 16x16 chain shows its four modules in the wrong places'

defect microled-element src/core/formats.js \
  'leds.drawBitmap${[8, 16, 32][(opts.depth ?? 3) - 1]}' \
  'leds.drawBitmap32' \
  'COLOR_DEBTH 1 and 2 read the array with the wrong element size'

defect microled-rgb565 src/core/formats.js \
  '((g & 0xfc) << 3)' \
  '((g & 0xfc) << 2)' \
  'green bleeds into red at COLOR_DEBTH 2'

defect fastled-straight src/core/formats.js \
  '? `  return (y & 1) ? y * ${W} + (${W} - 1 - x) : y * ${W} + x;`' \
  '? `  return y * ${W} + x;`' \
  'every odd row of a serpentine matrix runs backwards'

defect lcd-high-bits src/core/cemit.js \
  "const bytes = pack(s, lcd.layout).map(v =>" \
  "const bytes = pack(s, lcd.layout).map(v => v << 3).map(v =>" \
  'LCD characters lose their three left columns'
