// What a board core declares and EpoxyDuino does not, force-included into every C++ unit.
// ArduinoCore-API names the SPI bit order BitOrder, which Adafruit_BusIO needs; binary.h,
// the B01010101 constants, is written into the build directory by libs.test.js. The AVR
// port registers are what microLED and TFT_eSPI store for fast pin writes; here they are
// one dummy byte, since the host has no pins
#ifndef HOST_H
#define HOST_H

#include <Arduino.h>
#include <binary.h>

typedef uint8_t BitOrder;

inline volatile uint8_t SREG, host_port;
#define digitalPinToBitMask(pin) ((uint8_t)1)
#define digitalPinToPort(pin) (0)
#define portOutputRegister(port) (&host_port)
#define portModeRegister(port) (&host_port)
#define cli()
#define sei()

#endif
