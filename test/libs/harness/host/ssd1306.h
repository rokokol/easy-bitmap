// SSD1306 display RAM rebuilt from the I2C traffic, as the datasheet defines it: every
// transmission opens with a control byte (0x00 a command stream, 0x80 one command, 0x40
// data), and data lands at the current page and column, which advance by addressing mode
#ifndef CAPTURE_SSD1306_H
#define CAPTURE_SSD1306_H

#include "Wire.h"
#include <string.h>

struct Ssd1306 {
  uint8_t ram[8][128];
  uint8_t mode = 2;  // page addressing after reset
  uint8_t col = 0, colStart = 0, colEnd = 127;
  uint8_t page = 0, pageStart = 0, pageEnd = 7;
  std::vector<uint8_t> pending;  // a command still waiting for its arguments

  Ssd1306() { memset(ram, 0, sizeof ram); }

  static int arguments(uint8_t c) {
    switch (c) {
      case 0x20: case 0x81: case 0x8D: case 0xA8: case 0xD3: case 0xD5: case 0xD9: case 0xDA: case 0xDB: return 1;
      case 0x21: case 0x22: return 2;
      case 0x26: case 0x27: return 6;
      case 0x29: case 0x2A: return 5;
      case 0xA3: return 2;
      default: return 0;
    }
  }

  void command(uint8_t c) {
    pending.push_back(c);
    if ((int)pending.size() <= arguments(pending[0])) return;
    const uint8_t op = pending[0];
    if (op == 0x20) mode = pending[1] & 3;
    else if (op == 0x21) colStart = col = pending[1] & 127, colEnd = pending[2] & 127;
    else if (op == 0x22) pageStart = page = pending[1] & 7, pageEnd = pending[2] & 7;
    else if (op >= 0xB0 && op <= 0xB7) page = op & 7;
    else if (op <= 0x0F) col = (col & 0xF0) | op;
    else if (op >= 0x10 && op <= 0x1F) col = (col & 0x0F) | ((op & 0x0F) << 4);
    pending.clear();
  }

  void data(uint8_t d) {
    ram[page][col] = d;
    if (mode == 0) {
      if (col++ >= colEnd) col = colStart, page = page >= pageEnd ? pageStart : page + 1;
    } else if (mode == 1) {
      if (page++ >= pageEnd) page = pageStart, col = col >= colEnd ? colStart : col + 1;
    } else {
      col = (col + 1) & 127;
    }
  }

  // Consumes what the bus carried since the last call
  void replay(TwoWire &wire) {
    for (const Transmission &t : wire.log) {
      if (t.bytes.empty()) continue;
      const uint8_t control = t.bytes[0];
      for (size_t i = 1; i < t.bytes.size(); i++) (control & 0x40) ? data(t.bytes[i]) : command(t.bytes[i]);
    }
    wire.log.clear();
  }

  bool pixel(int x, int y) { return ram[y >> 3][x] >> (y & 7) & 1; }
};

#endif
