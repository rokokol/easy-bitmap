// U8g2 on its own memory device, U8G2_BITMAP, read back with u8x8_GetBitmapPixel; both
// come with the library (sys/bitmap/common/u8x8_d_bitmap.c)
#include <U8g2lib.h>

U8G2_BITMAP u8g2(128, 64, U8G2_R0);
static bool started;

static void reset() {
  if (!started) u8g2.begin(), started = true;
  u8g2.clearBuffer();
  u8g2.sendBuffer();
}

static int pixel(int x, int y, int, int) { return u8x8_GetBitmapPixel(u8g2.getU8x8(), x, y) != 0; }

#include "gen.h"
#include "main.h"
