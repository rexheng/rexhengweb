# Manusman — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Card stack | 3 fanned boxes | `cardW`, `cardH`, `cardCount=3` via fans array | Three BoxGeometry cards. |
| 2 | Overlay | Dark PiP slab in front | `overlayW/H/D`, `overlayZ` | Box in front of the stack. |
| 3 | Status bar | Thin amber strip | `barH` | Emissive bar on overlay top. |

## Colour checks

| Target | Hex |
|---|---|
| card | `#f3ead6` |
| overlay | `#2a241c` |
| bar | `#c17a3a` |

## Wiring

- `accent: "#c17a3a"`.
- `ability: "launch"`.
