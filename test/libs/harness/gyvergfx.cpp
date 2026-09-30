// GyverGFX: dot() is the virtual every drawing call ends in
#include <GyverGFX.h>

static uint8_t px[256][256];

struct Canvas : GyverGFX {
  Canvas() : GyverGFX(256, 256) {}
  void dot(int x, int y, uint8_t fill = GFX_FILL) override {
    if (x >= 0 && y >= 0 && x < 256 && y < 256) px[y][x] = fill != 0;
  }
};

Canvas gfx;

static void reset() { memset(px, 0, sizeof px); }
static int pixel(int x, int y, int, int) { return px[y][x]; }

#include "gen.h"
#include "main.h"
