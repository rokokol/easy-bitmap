// microLED on a 16x16 matrix. COLOR_DEBTH and the exported colour EXPECTED_RGB come from
// the build; the lit colour is built by microLED's own mergeRGBraw, not by the site's
// encoder. microLED's y axis points up, and drawBitmap puts the first array row on top
#define MLED_USE_SPI
#include <microLED.h>

using Strip = microLED<256, 2, MLED_NO_CLOCK, LED_WS2812, ORDER_GRB, CLI_OFF>;

// show() bit-bangs the strip in AVR assembly that no host compiler takes, and it only sends
// the frame out; hiding it keeps drawBitmap and get() the library's own
struct Leds : Strip {
  using Strip::Strip;
  void show() {}
};

Leds leds(16, 16, ZIGZAG, LEFT_BOTTOM, DIR_RIGHT);

static void reset() { leds.clear(); }

static int pixel(int x, int y, int, int h) {
  const mData c = leds.get(x, h - 1 - y);
  if (c == mData(0)) return 0;
  const mData want = mergeRGBraw((EXPECTED_RGB >> 16) & 0xFF, (EXPECTED_RGB >> 8) & 0xFF, EXPECTED_RGB & 0xFF);
  return c == want ? 1 : 2;
}

#include "gen.h"
#include "main.h"
