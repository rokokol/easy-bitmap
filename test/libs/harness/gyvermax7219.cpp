// GyverMAX7219: a chain of 4x4 modules, read back with the public get(x, y)
#include <GyverMAX7219.h>

MAX7219<4, 4, 5> mtrx;

static void reset() { mtrx.clear(); }
static int pixel(int x, int y, int, int) { return mtrx.get(x, y); }

#include "gen.h"
#include "main.h"
