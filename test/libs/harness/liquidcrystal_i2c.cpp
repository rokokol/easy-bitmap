// LiquidCrystal_I2C on a PCF8574 backpack, heard on the recording Wire and fed to the
// HD44780 model; a picture is n characters side by side, 5n x 8
#include <LiquidCrystal_I2C.h>
#include "hd44780_model.h"

static Hd44780 chip;

LiquidCrystal_I2C lcd(0x27, 16, 2);
static bool started;

static void reset() {
  if (!started) lcd.init(), started = true;
  replayPcf8574(chip, Wire);
}

static int pixel(int x, int y, int, int) {
  replayPcf8574(chip, Wire);
  return chip.pixel(x / 5, x % 5, y);
}

#include "gen.h"
#include "main.h"
