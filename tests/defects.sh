#!/usr/bin/env bash
# The defect list for this repository, read by `t.sh falsify` from the tests skill
# (https://github.com/rokokol/skills). Each entry breaks one guarantee of src/core for one
# run and requires the unit suite to notice:
#
#   t.sh falsify -- node --test 'test/unit/*.test.js'
#
# Needs bash 3.2, since falsify sources it wherever t.sh runs

# shellcheck disable=SC2016 # a $ in single quotes here is text to find, not an expansion

defect rows-lsb-first src/core/formats.js \
  "rowsMsb: { id: 'rowsMsb', kind: 'packed', axis: 'x', msbFirst: true, bits: 8 }" \
  "rowsMsb: { id: 'rowsMsb', kind: 'packed', axis: 'x', msbFirst: false, bits: 8 }" \
  'GyverGFX, Adafruit drawBitmap and every MSB preset mirror each group of 8 pixels'

defect pages-msb-first src/core/formats.js \
  "pagesLsb: { id: 'pagesLsb', kind: 'packed', axis: 'y', msbFirst: false, bits: 8 }" \
  "pagesLsb: { id: 'pagesLsb', kind: 'packed', axis: 'y', msbFirst: true, bits: 8 }" \
  'GyverOLED pictures come out with every 8-row page upside down'

defect char-eight-bits src/core/formats.js \
  "char5: { id: 'char5', kind: 'packed', axis: 'x', msbFirst: true, bits: 5 }" \
  "char5: { id: 'char5', kind: 'packed', axis: 'x', msbFirst: true, bits: 8 }" \
  'LCD characters shift three pixels left and lose their left columns'

defect pages-columns-outer src/core/formats.js \
  'visit(Math.floor(y / n) * w + x,' \
  'visit(x * Math.ceil(h / n) + Math.floor(y / n),' \
  'pictures taller than 8 rows scramble on GyverOLED: pages come out interleaved'

defect pixels-ignore-colour src/core/formats.js \
  '(v ? opts.on ?? 1 : 0)' \
  '(v ? 1 : 0)' \
  'microLED draws every lit pixel as colour 1, a near-black blue'

defect ram-const src/core/cemit.js \
  "const qualifier = format.progmem ? 'const ' : ''" \
  "const qualifier = 'const '" \
  'the MD_MAX72xx export does not compile: setBuffer refuses a const array'

defect md-any-height src/core/formats.js \
  "include: '#include <MD_MAX72xx.h>',
    rule: { step: 8, height: 8 }," \
  "include: '#include <MD_MAX72xx.h>',
    rule: { step: 8 }," \
  'MD_MAX72xx is offered for 16x16, which one chain of modules cannot show'

defect microled-depth1 src/core/formats.js \
  'if (depth === 1) return (r & 0xc0)' \
  'if (depth === 1) return (r & 0xe0)' \
  'red bleeds into green at COLOR_DEBTH 1'

defect fits-no-step src/core/formats.js \
  'if (r.step && (w % r.step || h % r.step)) return false' \
  '' \
  'LedControl exports a 12x8 picture that no module layout can show'

defect no-progmem src/core/cemit.js \
  "const storage = format.progmem ? ' PROGMEM' : ''" \
  "const storage = ''" \
  'the array lands in RAM while the library reads flash with pgm_read_byte: garbage on AVR, the original bug'

defect parse-b-binary src/core/cparse.js \
  'if (/^B/.test(t)) return parseInt(t.slice(1), 2)' \
  'if (/^B/.test(t)) return parseInt(t.slice(1), 10)' \
  'Arduino B10101010 literals import as the wrong bytes'

defect parse-unclosed src/core/cparse.js \
  "throw new ParseError('a { has no matching }')" \
  'return code.length' \
  'a truncated paste imports half a picture without a word'

defect parse-no-hint src/core/cparse.js \
  '  tries.push(...parsed.hints)' \
  '' \
  'a 16x8 comment is ignored and the import asks for a size it was told'

defect hash-no-length src/core/hash.js \
  '|| bytes.length !== Math.ceil(w / 8) * h' \
  '' \
  'a cut share link opens as a half-empty picture instead of being refused'

defect dither-no-serpentine src/core/dither.js \
  'const back = serpentine && y % 2 === 1' \
  'const back = false' \
  'the serpentine knob does nothing'

defect dither-bayer-bias src/core/dither.js \
  'return bayer(n).map(row => row.map(v => (v + 0.5) / (n * n)))' \
  'return bayer(n).map(row => row.map(v => v / (n * n)))' \
  'ordered dithering darkens every grey by half a step'

defect gamma-inverted src/core/dither.js \
  't = Math.pow(t, 1 / gamma)' \
  't = Math.pow(t, gamma)' \
  'the gamma knob works backwards'

defect history-unbounded src/core/history.js \
  '      if (past.length > limit) past.shift()' \
  '' \
  'history grows without limit and eats memory on a long session'

defect rotate-anticlockwise src/core/bitmap.js \
  'return map(b, b.h, b.w, (x, y) => get(b, y, b.h - 1 - x))' \
  'return map(b, b.h, b.w, (x, y) => get(b, b.w - 1 - y, x))' \
  'rotate turns the picture the wrong way'

defect fill-wraps-rows src/core/bitmap.js \
  'if (cx > 0) stack.push(i - 1)' \
  'if (i > 0) stack.push(i - 1)' \
  'fill leaks from the left edge of one row into the end of the row above'

defect noob-shows-all src/core/displays.js \
  "(!noob || f.noob)" \
  'true' \
  'noob mode lists OLED and raw presets next to the LED matrices'

defect noob-all-tools src/core/displays.js \
  'return noob ? tools.filter(t => t.noob) : tools' \
  'return tools' \
  'noob mode shows line, rectangle and fill'
