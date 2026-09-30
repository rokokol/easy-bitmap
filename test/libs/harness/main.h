// Shared tail of every harness. The harness defines the library objects the usage lines
// name, reset() and pixel(x, y, w, h) for a picture of w x h: 1 lit, 0 unlit, any other
// value lit in a colour that was not exported, printed as '?'. gen.h, written by
// libs.test.js, holds the emitted pictures
#include <stdio.h>

// EpoxyDuino's Arduino.h declares this signature
int main(int, char **) {
  for (int i = 0; i < pic_count; i++) {
    reset();
    pics[i].draw();
    printf("pic %d\n", i);
    for (int y = 0; y < pics[i].h; y++) {
      for (int x = 0; x < pics[i].w; x++) {
        const int v = pixel(x, y, pics[i].w, pics[i].h);
        putchar(v == 1 ? '#' : v == 0 ? '.' : '?');
      }
      putchar('\n');
    }
  }
  return 0;
}
