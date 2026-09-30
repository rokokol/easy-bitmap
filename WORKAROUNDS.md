# Workarounds

Arrangements in the library harness (`test/libs`) that exist only because something outside this repository leaves no cleaner route. Each entry says how to tell when it can go. Choices that stay for good are in [DEVIATIONS.md](DEVIATIONS.md)

---

## Adafruit NeoMatrix has no harness

**Where:** `test/libs/targets.mjs` has no `neomatrix` entry; the preset in `src/core/formats.js` is checked by the unit vectors only

**Symptom it prevents:** the harness build stops at Adafruit NeoPixel, which NeoMatrix needs for its pixel store: `Adafruit_NeoPixel.cpp: #error Architecture not supported`

**Why it happens:** `Adafruit_NeoPixel::show()` has an assembly or HAL routine per supported CPU and an `#error` for every other one, the host included, with no build switch that leaves it out

**Why this works:** the preset's `drawBitmap` is Adafruit GFX's, which the `adafruit` target draws with the real library, so the bytes are checked; what stays unchecked is NeoMatrix's own mapping from GFX coordinates to strip positions, which the export does not decide

**Rejected alternative:** a stand-in NeoPixel written for the harness, which would test that stand-in rather than the library

**Removal check:**

```sh
git clone -q --depth 1 https://github.com/adafruit/Adafruit_NeoPixel /tmp/neopixel
g++ -std=gnu++17 -w -DARDUINO=100 -DEPOXY_DUINO -DEPOXY_CORE_AVR -include test/libs/harness/host/host.h \
  -I test/libs/.build/host -I test/libs/vendor/EpoxyDuino/cores/epoxy -c /tmp/neopixel/Adafruit_NeoPixel.cpp -o /dev/null
```

Stops at `#error Architecture not supported` -> keep it. Compiles -> vendor NeoPixel and NeoMatrix and add a `neomatrix` target

**Upstream:** not reported yet

---

## LiquidCrystal_I2C is fetched, not vendored

**Where:** the `liquidcrystal_i2c` entry of `test/libs/targets.mjs` (`fetch:`), and `root()` in `test/libs/libs.test.js`, which clones it into `test/libs/.build/fetched`

**Symptom it prevents:** a copy of code nobody licensed in a public repository

**Why it happens:** [johnrickman/LiquidCrystal_I2C](https://github.com/johnrickman/LiquidCrystal_I2C) carries no licence file and no licence statement, and GitHub reports none, so redistributing a copy is not permitted

**Why this works:** the harness fetches the pinned commit at test time, so the repository holds only its address; the weekly vendor-sync cascade does not move it, and it moves by hand

**Removal check:**

```sh
gh api repos/johnrickman/LiquidCrystal_I2C --jq .license
```

Prints nothing -> no licence, keep it. A licence that allows redistribution -> take the files with `vendor-sync.sh add` and drop `fetch:`

**Upstream:** not reported yet
