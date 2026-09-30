// MD_MAX72xx, four modules in a row, read back with the public getPoint(row, column). Its
// column 0 is the rightmost one, so picture column x is library column count - 1 - x
#include <MD_MAX72xx.h>

MD_MAX72XX mx(MD_MAX72XX::FC16_HW, 10, 4);
static bool started;

static void reset() {
  if (!started) mx.begin(), started = true;
  mx.clear();
}

static int pixel(int x, int y, int, int) { return mx.getPoint(y, mx.getColumnCount() - 1 - x); }

#include "gen.h"
#include "main.h"
