// GyverOLED in buffer mode over I2C. It has no public pixel getter, so the harness rebuilds
// the display RAM from what update() sends, and reads the pixels the panel would show
#include <GyverOLED.h>
#include "ssd1306.h"

GyverOLED<SSD1306_128x64, OLED_BUFFER> oled;
static Ssd1306 panel;
static bool started;

static void reset() {
  if (!started) oled.init(), started = true;
  oled.clear();
  oled.update();
  panel.replay(Wire);
}

static int pixel(int x, int y, int, int) {
  panel.replay(Wire);
  return panel.pixel(x, y);
}

#include "gen.h"
#include "main.h"
