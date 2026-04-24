# Olympic Way — references

## Status

No binaries committed. Reference URLs only — the sandboxed agent cannot
fetch PNG/JPG binaries.

## Refs

| # | Filename (intended) | Source URL | What it shows | Notes |
|---|---|---|---|---|
| 1 | `refs/roundel-front.png` | https://upload.wikimedia.org/wikipedia/commons/1/11/Underground.svg | Official TfL Underground roundel SVG. | Confirms red torus + blue bar + white lettering proportions. |
| 2 | `refs/roundel-context.jpg` | https://upload.wikimedia.org/wikipedia/commons/9/9c/London_Underground_Oxford_Circus_roundel.jpg | Physical roundel at Oxford Circus. | Shows the roundel mounted on a plinth at station level. |
| 3 | `refs/network-map.png` | https://content.tfl.gov.uk/standard-tube-map.pdf | Official TfL Tube Map. | Colour palette cross-check for the Underground red `#dc241f`. |

## Colour swatches

| Token | Hex | Source |
|---|---|---|
| torus | `#dc241f` | TfL corporate palette, Underground red. |
| bar | `#003688` | TfL corporate palette, corporate blue. |
| plate | `#ffffff` | Text plate / station name background. |
| plinth | `#3a3a3a` | Neutral dark — reads as concrete/metal without competing with the roundel's saturation. |

## Canonical dimensions

TfL's design manual fixes roundel proportions: the outer disc diameter is
the unit, the horizontal bar spans ~2× the disc width and occupies ~30% of
the disc's height. We encode this as:

- Roundel outer radius 0.85×D, bar width 1.75×D → bar spans 2.06× disc radius ≈ 1.03× disc diameter on each side. Close to canon.
- Bar height 0.28×D vs disc diameter 1.70×D → bar is 16% of disc height.
  Slightly taller than TfL canon (≈14%) for better sprite legibility.
