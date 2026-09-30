// A Wire that records every I2C transmission instead of sending it, so a harness can decode
// what a library put on the bus. It replaces EpoxyDuino's stub Wire, whose API it keeps
#ifndef CAPTURE_WIRE_H
#define CAPTURE_WIRE_H

#include <Arduino.h>
#include <Stream.h>
#include <vector>

struct Transmission {
  uint8_t address;
  std::vector<uint8_t> bytes;
};

class TwoWire : public Stream {
 public:
  std::vector<Transmission> log;

  void begin() {}
  void begin(uint8_t) {}
  void begin(int, int) {}
  void end() {}
  void setClock(uint32_t) {}
  void beginTransmission(uint8_t address) { current = Transmission{address, {}}; }
  void beginTransmission(int address) { beginTransmission((uint8_t)address); }
  uint8_t endTransmission(bool = true) {
    log.push_back(current);
    return 0;
  }
  size_t write(uint8_t b) override {
    current.bytes.push_back(b);
    return 1;
  }
  size_t write(const uint8_t *data, size_t n) override {
    for (size_t i = 0; i < n; i++) write(data[i]);
    return n;
  }
  using Print::write;
  uint8_t requestFrom(uint8_t, uint8_t n, uint8_t = true) { return n; }
  uint8_t requestFrom(int, int n, int = true) { return n; }
  int available() override { return 0; }
  int read() override { return 0; }
  int peek() override { return 0; }
  void flush() override {}

 private:
  Transmission current;
};

extern TwoWire Wire;

#endif
