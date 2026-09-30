// TFT_eSPI: drawBitmap ends in the virtual drawPixel, caught here instead of reaching a panel
#include <TFT_eSPI.h>

static uint8_t px[64][128];

struct Screen : TFT_eSPI {
  Screen() : TFT_eSPI(128, 64) {}
  void drawPixel(int32_t x, int32_t y, uint32_t color) override {
    if (x >= 0 && y >= 0 && x < 128 && y < 64) px[y][x] = color == TFT_WHITE;
  }
};

Screen tft;

static void reset() { memset(px, 0, sizeof px); }
static int pixel(int x, int y, int, int) { return px[y][x]; }

#include "gen.h"
#include "main.h"
