# Assets and third-party content

[LICENSE](LICENSE) (MIT) covers the site's own code. It does not cover the font, the colours, the DDLC web kit or the libraries the tests draw with, listed below

## Fonts

| File | Font | Author | Licence |
| --- | --- | --- | --- |
| `assets/DepartureMono-Regular.woff2` | Departure Mono 1.500 | Helena Zhang | [SIL OFL 1.1](assets/DepartureMono-LICENSE.txt) |
| `assets/font5x8.h` | the 5x8 font of [GyverGFX](https://github.com/GyverLibs/GyverGFX), which the text tool draws with | AlexGyver | [MIT](assets/GyverGFX-LICENSE) |
| `assets/glcdfont.c` | the classic 5x7 font of [Adafruit GFX](https://github.com/adafruit/Adafruit-GFX-Library), the text tool's second library font | Adafruit Industries | [BSD](assets/Adafruit-GFX-license.txt) |

These fonts and their licences are unmodified copies, kept byte-equal to their sources by `vendor-sync.sh`; Departure Mono comes through ddlc-themes, which vendors it from its upstream

## Doki Doki Literature Club colours

`assets/ddlc-ui.css`, `assets/ddlc-theme.js` and `assets/ddlc-cloud.js` are copies of the web kit of [ddlc-themes](https://github.com/rokokol/ddlc-themes) (MIT), and the colours in them come from [ddlc-palette](https://github.com/rokokol/ddlc-palette), which measures them off [ddlc.moe](https://ddlc.moe/). Doki Doki Literature Club is the property of [Team Salvato](https://teamsalvato.com/); this project is unaffiliated with and not endorsed by Team Salvato, uses no official artwork, and follows [their IP guidelines](https://teamsalvato.com/ip-guidelines) as non-commercial fan content

## Libraries in the tests

`test/libs/vendor/` holds unmodified files of the libraries the tests compile, each with its own licence file beside it, kept byte-equal to their sources by `vendor-sync.sh` (see `.github/vendor.lock`). None of them is part of the site

| Directory | Source | Licence file |
| --- | --- | --- |
| `EpoxyDuino` | [bxparks/EpoxyDuino](https://github.com/bxparks/EpoxyDuino) | `LICENSE` |
| `GyverGFX`, `GyverMAX7219`, `GyverOLED`, `microLED` | [GyverLibs](https://github.com/GyverLibs) | `LICENSE` |
| `Adafruit-GFX-Library`, `Adafruit_BusIO`, `Adafruit_SSD1306`, `Adafruit_LED_Backpack` | [adafruit](https://github.com/adafruit) | `license.txt`, `LICENSE` |
| `u8g2` | [olikraus/u8g2](https://github.com/olikraus/u8g2) | `LICENSE` |
| `TFT_eSPI` | [Bodmer/TFT_eSPI](https://github.com/Bodmer/TFT_eSPI) | `license.txt` |
| `LedControl` | [wayoda/LedControl](https://github.com/wayoda/LedControl) | `LICENSE` |
| `MD_MAX72XX` | [MajicDesigns/MD_MAX72XX](https://github.com/MajicDesigns/MD_MAX72XX) | `LICENSE` |
| `LiquidCrystal` | [arduino-libraries/LiquidCrystal](https://github.com/arduino-libraries/LiquidCrystal) | `LICENSE.txt` |
| `hd44780` | [duinoWitchery/hd44780](https://github.com/duinoWitchery/hd44780) | `license.txt` |

LiquidCrystal_I2C carries no licence, so it is not copied here; the tests fetch it, see [WORKAROUNDS.md](WORKAROUNDS.md)
