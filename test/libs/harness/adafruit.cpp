// Adafruit GFX on an Adafruit_SSD1306 128x64, read back with its public getPixel()
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);
static bool started;

static void reset() {
  if (!started) display.begin(SSD1306_SWITCHCAPVCC, 0x3C), started = true;
  display.clearDisplay();
}

static int pixel(int x, int y, int, int) { return display.getPixel(x, y); }

#include "gen.h"
#include "main.h"
