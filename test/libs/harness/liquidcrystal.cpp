// LiquidCrystal in 4-bit mode, heard on its pins through -Wl,--wrap=digitalWrite and fed
// to the HD44780 model; a picture is n characters side by side, 5n x 8
#include <LiquidCrystal.h>
#include "hd44780_model.h"

enum { LCD_RS = 7, LCD_EN = 6, LCD_D4 = 5, LCD_D5 = 4, LCD_D6 = 3, LCD_D7 = 2 };

static Hd44780 chip;
static Hd44780Pins bus{chip, LCD_RS, LCD_EN, {LCD_D4, LCD_D5, LCD_D6, LCD_D7}};

extern "C" void __real_digitalWrite(uint8_t pin, uint8_t value);
extern "C" void __wrap_digitalWrite(uint8_t pin, uint8_t value) {
  __real_digitalWrite(pin, value);
  bus.write(pin, value);
}

LiquidCrystal lcd(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
static bool started;

static void reset() {
  if (!started) lcd.begin(16, 2), started = true;
}

static int pixel(int x, int y, int, int) { return chip.pixel(x / 5, x % 5, y); }

#include "gen.h"
#include "main.h"
