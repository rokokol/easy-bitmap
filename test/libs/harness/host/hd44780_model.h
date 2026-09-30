// An HD44780 controller as the datasheet defines it, enough to keep CGRAM: after reset the
// bus is 8 bits wide until a function set clears DL, then every byte takes two strobes,
// high nibble first; 0x40 | address points data writes at CGRAM, 0x80 | address at DDRAM.
// Two adapters feed it: the pins a parallel library drives, and the PCF8574 byte an I2C
// backpack receives
#ifndef HOST_HD44780_MODEL_H
#define HOST_HD44780_MODEL_H

#include <stdint.h>
#include <string.h>
#include "Wire.h"

struct Hd44780 {
  uint8_t cgram[64];
  bool fourBit = false, haveHigh = false, toCgram = false;
  uint8_t high = 0, address = 0;

  Hd44780() { memset(cgram, 0, sizeof cgram); }

  // One enable strobe carrying D7..D4 in the low bits of `nibble`
  void strobe(bool rs, uint8_t nibble) {
    if (!fourBit) return byte(rs, nibble << 4);
    if (!haveHigh) {
      high = nibble;
      haveHigh = true;
      return;
    }
    haveHigh = false;
    byte(rs, (high << 4) | nibble);
  }

  void byte(bool rs, uint8_t b) {
    if (rs) {
      if (toCgram) cgram[address] = b & 0x1F, address = (address + 1) & 63;
    } else if (b & 0x80) {
      toCgram = false;
    } else if (b & 0x40) {
      toCgram = true, address = b & 0x3F;
    } else if (b & 0x20) {
      fourBit = !(b & 0x10);
    }
  }

  // Character c, row y, column x: bit 4 is the left column
  bool pixel(int c, int x, int y) { return cgram[c * 8 + y] >> (4 - x) & 1; }
};

// Parallel wiring in 4-bit mode: data is latched on the falling edge of E
struct Hd44780Pins {
  Hd44780 &lcd;
  uint8_t rs, en, d[4];
  uint8_t level[64] = {};

  void write(uint8_t pin, uint8_t value) {
    const bool falling = pin == en && level[en] && !value;
    if (pin < 64) level[pin] = value;
    if (!falling) return;
    uint8_t nibble = 0;
    for (int i = 0; i < 4; i++) nibble |= (level[d[i]] ? 1 : 0) << i;
    lcd.strobe(level[rs], nibble);
  }
};

// A PCF8574 backpack: every byte on the bus is the expander port, P0 = RS, P2 = E,
// P4..P7 = D4..D7, the wiring LiquidCrystal_I2C declares as Rs, En and the data shift
inline void replayPcf8574(Hd44780 &lcd, TwoWire &wire) {
  static uint8_t last = 0;
  for (const Transmission &t : wire.log)
    for (uint8_t port : t.bytes) {
      if ((last & 0x04) && !(port & 0x04)) lcd.strobe(last & 0x01, last >> 4);
      last = port;
    }
  wire.log.clear();
}

#endif
