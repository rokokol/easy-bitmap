# Deviations

Permanent, deliberate departures from the obvious route in this repository, and what going back would break. Stopgaps with a removal condition are in [WORKAROUNDS.md](WORKAROUNDS.md)

---

## FastLED is checked against EpoxyDuino's mock

**Where:** the `fastled` entry of `test/libs/targets.mjs` and `test/libs/harness/fastled.cpp`, which build on `test/libs/vendor/EpoxyDuino/libraries/EpoxyMockFastLED`

**Why it differs from the obvious route:** every other preset is drawn by its real library. FastLED's source is tens of megabytes of platform code, and the exported FastLED code touches only `CRGB`, a `CRGB` array and `FastLED.show()`; the logic under test, the bit mask and the `XY()` mapping, is the site's own. EpoxyDuino ships a mock of exactly that public surface for host builds

**What returning to the obvious route breaks:** vendoring FastLED would add its whole source tree to the repository and to every weekly update, for two names

**Enforcement:** the harness's oracle is the strip wiring itself, not the emitted `XY()`, so a wrong serpentine mapping fails it; `tests/defects-libs.sh` plants one (`fastled-straight`)

---

## The library harness reads buses, not internals

**Where:** `test/libs/harness/host/` (a recording `Wire`, the SSD1306 and HD44780 models) and the harnesses for GyverOLED, LedControl, LiquidCrystal, LiquidCrystal_I2C and hd44780

**Why it differs from the obvious route:** reading a library's private buffer is shorter, but it restates that library's internal layout inside the test, and it breaks on the library's next refactor while its output stays right. Where a library has no public getter, the harness decodes what it sends, as the display controller's datasheet defines it, and the linker's `--wrap` catches `digitalWrite` and `shiftOut` without touching the vendored code

**What returning to the obvious route breaks:** a weekly update that renames a private member would turn the harness red with nothing wrong in the export
