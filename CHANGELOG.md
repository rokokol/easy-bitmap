# Changelog

The site has no versions: what is live at [bitmap.rokokol.art](https://bitmap.rokokol.art) is the newest entry below

## 2026-10-09

### Changed

- Checkboxes are pixel squares like the noob mode switch, instead of the browser's rounded boxes

## 2026-10-08

### Changed

- The page is drawn with the DDLC web kit of [ddlc-themes](https://github.com/rokokol/ddlc-themes), shared with the other DDLC pages, so captions and notes are a darker grey that reads on white
- The background cloud's pixels have a slightly wider gap, the same lattice as the other DDLC pages

## 2026-10-05

### Fixed

- Copy code, copy link and the draw call copy again on a page opened over plain HTTP, where a phone browser gives no Clipboard API

## 2026-09-30

### Added

- Export presets for GyverMAX7219, LedControl, MD_MAX72xx, microLED, FastLED, Adafruit NeoMatrix, Adafruit LED Backpack, GyverOLED, GyverGFX, Adafruit GFX (`drawBitmap` and `drawXBitmap`), U8g2, TFT_eSPI and raw layouts, each with its declaration and the call that draws it
- Pictures of any width and height, and presets for common displays and matrices
- An LCD characters mode: eight 5×8 slots for HD44780 displays, exported with the `createChar` loop
- Noob mode, on by default: 8×8 and 16×16 LED matrices with pen and eraser only
- Image import with fit, scale, offset, brightness, contrast, gamma, inversion and a choice of dithering
- Line, rectangle, filled rectangle, fill and shift tools; undo and redo for every change
- A text tool outside noob mode: GyverGFX's 5×8 font with Cyrillic or Adafruit GFX's classic 5×7, each drawn exactly as its `print()` does, or Departure Mono, at 1× to 4×
- A preview on the target display, a share link that holds the picture, and the last picture kept in the browser
- Light, dark and system themes in the Doki Doki Literature Club colours, and the Departure Mono font

### Changed

- The site is at bitmap.rokokol.art, and the repository is `rokokol/easy-bitmap`
- Bitmaps are exported as `const` `PROGMEM` arrays where the library reads flash; before, every export was a plain `uint8_t` array in RAM, which libraries reading flash drew as garbage
- Import reads hex, binary, Arduino `B` and decimal literals, and takes the size from the code where it can
- The page is in English only

### Fixed

- GyverOLED, U8g2 and MD_MAX72xx pictures no longer come out scrambled: each preset writes the byte layout its library reads
- The grid no longer breaks rows apart on narrow windows
- The editor refits to a new window width without a layout loop, which Safari reported as an error

### Removed

- The YouTube link and the Russian version of the page
