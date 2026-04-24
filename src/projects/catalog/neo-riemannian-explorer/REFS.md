# Neo-Riemannian Explorer — references

## Status

Reference image files are NOT in `refs/` — this environment cannot
download image binaries. URLs below document what a future image-
capable pass should mirror.

## Refs

| # | Filename (intended) | Source URL | What it shows | Notes |
|---|---|---|---|---|
| 1 | `refs/piano-octave.jpg` | https://commons.wikimedia.org/wiki/File:Piano_keyboard.svg | One octave of a piano keyboard, flat diagram, 7 white + 5 black keys. | Canonical reference — key spacing and black-key positions. |
| 2 | `refs/app-screenshot.png` | https://neoriemannian.vercel.app/ | Rex's live app — shows the actual UI colour palette and the keyboard affordance in context. | Accent hint for the card colour. |

## Dimensions (standard piano key geometry)

- White key: 23.5mm wide × 150mm long × ~10mm thick.
- Black key: 13.7mm wide × 100mm long × ~15mm thick (sits higher).
- Octave (7 white keys) = 164.5mm wide.
- Black keys cluster 2-3-2-3 within the octave.

At D=0.26m slot scale we shrink a real octave ~6× to make the sprite
comfortable to spawn near the humanoid without dominating the scene.
