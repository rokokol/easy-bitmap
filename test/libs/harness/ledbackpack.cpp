// Adafruit LED Backpack, the 16x8 matrix turned landscape. Its drawBitmap is Adafruit GFX's;
// drawPixel is caught in GFX coordinates, before the class maps them to the board's wiring,
// which is the board's concern and not the export's
#include <Adafruit_LEDBackpack.h>

static uint8_t px[8][16];

struct Matrix : Adafruit_8x16matrix {
  void drawPixel(int16_t x, int16_t y, uint16_t color) override {
    if (x >= 0 && y >= 0 && x < 16 && y < 8) px[y][x] = color == LED_ON;
  }
};

Matrix matrix;
static bool started;

static void reset() {
  if (!started) matrix.begin(0x70), matrix.setRotation(1), started = true;
  memset(px, 0, sizeof px);
}

static int pixel(int x, int y, int, int) { return px[y][x]; }

#include "gen.h"
#include "main.h"
