// LedControl has no getter, so the harness listens on its pins, linked with
// -Wl,--wrap=shiftOut,--wrap=digitalWrite, and decodes the MAX7219 protocol from the
// datasheet: while LOAD (CS) is low, 16-bit words shift through the chain, so the first
// word sent lands in the last device; registers 1..8 are rows. LedControl's own convention
// (setLed, setRow) puts column 0 at bit 7
#include <LedControl.h>
#include <vector>

enum { DATA = 12, CLOCK = 11, LOAD = 10, DEVICES = 4 };

static uint8_t rows[DEVICES][8];
static std::vector<uint8_t> frame;

extern "C" void __real_digitalWrite(uint8_t pin, uint8_t value);

extern "C" void __wrap_shiftOut(uint8_t, uint8_t, uint8_t, uint8_t value) { frame.push_back(value); }

extern "C" void __wrap_digitalWrite(uint8_t pin, uint8_t value) {
  __real_digitalWrite(pin, value);
  if (pin != LOAD) return;
  if (value == LOW) {
    frame.clear();
    return;
  }
  const size_t words = frame.size() / 2;
  for (size_t j = 0; j < words && j < DEVICES; j++) {
    const uint8_t reg = frame[2 * j] & 0x0F, data = frame[2 * j + 1];
    if (reg >= 1 && reg <= 8) rows[words - 1 - j][reg - 1] = data;
  }
}

LedControl lc(DATA, CLOCK, LOAD, DEVICES);

static void reset() { memset(rows, 0, sizeof rows); }

// Module m shows picture columns 8 * (m % cols) and rows 8 * (m / cols) onwards
static int pixel(int x, int y, int w, int) {
  const int m = (y / 8) * (w / 8) + x / 8;
  return rows[m][y % 8] >> (7 - x % 8) & 1;
}

#include "gen.h"
#include "main.h"
