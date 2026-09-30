// FastLED, built on EpoxyDuino's mock of its public API (CRGB, FastLED.show), since the
// real source is 39 MB of platform code around the same two names. The oracle is the strip
// wiring itself: LEDs run row by row, and with SERPENTINE every odd row runs right to left
#include <FastLED.h>

CRGB leds[256];

static void reset() {
  for (CRGB &c : leds) c = CRGB(0, 0, 0);
}

static int pixel(int x, int y, int w, int) {
  const int led = SERPENTINE && (y & 1) ? y * w + (w - 1 - x) : y * w + x;
  const CRGB c = leds[led];
  if (!c.r && !c.g && !c.b) return 0;
  const CRGB want(EXPECTED_RGB);
  return c.r == want.r && c.g == want.g && c.b == want.b ? 1 : 2;
}

#include "gen.h"
#include "main.h"
