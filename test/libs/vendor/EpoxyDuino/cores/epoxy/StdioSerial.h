/*
 * Copyright (c) 2019 Brian T. Park
 * MIT License
 */

#ifndef EPOXY_DUINO_STDIO_SERIAL_H
#define EPOXY_DUINO_STDIO_SERIAL_H

#include <unistd.h> // STDOUT_FILENO
#include "Print.h"
#include "Stream.h"

#ifndef SERIAL_OUTPUT_FILENO
// Default output file number used by `StdioSerial` class, and therefore, the
// `Serial` instance. Normally this is `STDOUT_FILENO` but can be overridden on
// the command line. For example, recompiling with `-D SERIAL_OUTPUT_FILENO=2`
// will configure `Serial` to print to `STDERR` instead.
#define SERIAL_OUTPUT_FILENO STDOUT_FILENO
#endif

/**
 * A version of Serial that reads from STDIN and sends output to STDOUT on
 * Linux or MacOS.
 */
class StdioSerial: public Stream {
  public:
    /**
     * Construct an instance. The default output file descriptor is
     * STDOUT_FILENO, but STDERR_FILENO is another option. POSIX.1-2017 defines
     * these values in <unistd.h> (see
     * https://unix.stackexchange.com/questions/437602), so works under Linux
     * and MacOS (and assumed to work under FreeBSD, but not explicitly tested).
     *
     * The default file descriptor can be overridden by defining the
     * `SERIAL_OUTPUT_FILENO={n}` macro on the command line when compiling.
     */
    StdioSerial(int fd = SERIAL_OUTPUT_FILENO) : outputFd(fd) { }

    /**
     * Override the output file descriptor. Two common values are expected to be
     * STDOUT_FILENO and STDERR_FILENO.
     */
    void setOutputFileDescriptor(int fd) { outputFd = fd; }

    void begin(unsigned long /*baud*/) { bufch = -1; }

    size_t write(uint8_t c) override;

    // Pull in all other overloaded versions of the write() function from the
    // Print parent class. This is required because when we override one version
    // of write() above, C++ performs a static binding to the write() function
    // in the current class and doesn't bother searching the parent classes for
    // any other overloaded function that it could bind to. (30 years of C++ and
    // I still get shot with C++ footguns like this. I have no idea what happens
    // if the Stream class overloaded the write() function.)
    using Print::write;

    operator bool() { return true; }

    int available() override;

    int read() override;

    int peek() override;

  private:
    int outputFd;
    int bufch;
};

extern StdioSerial Serial;

#define SERIAL_PORT_MONITOR Serial

#endif
