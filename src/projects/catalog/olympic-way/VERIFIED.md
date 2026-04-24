# Olympic Way — silhouette check

| # | Feature | Canon target | Constant(s) in `proportions.js` | Pass reasoning |
|---|---|---|---|---|
| 1 | Red torus | Outer 0.85×D, tube 0.12×D | `roundelOuterR=0.85*D`, `roundelTubeR=0.12*D` | Matches canonical TfL roundel proportions: thick ring (~14% of outer radius). |
| 2 | Horizontal bar | 1.75×D × 0.28×D × 0.10×D | `barW=1.75*D`, `barH=0.28*D`, `barD=0.10*D` | Bar extends ~0.45×D past the torus on each side, the canonical "overhang" of a roundel. |
| 3 | Text plate | White slab, 42% of bar width | `plateInsetFrac=0.42` consumed by `primitives.roundel` | Centre plate reads as the station-name plaque without the need for letter extrusion. |
| 4 | Plinth | 1.0×D × 0.20×D cylinder | `plinthR=1.00*D`, `plinthH=0.20*D` | Keeps the roundel lifted above the ground; visually grounds the sprite. |

## Ability check

| Ability | Expected behaviour | Verified by |
|---|---|---|
| `pulse` | 3–4 small red spheres radiate outward from the sprite origin over ~2s, then fade and clean up. | `abilities/pulse.js` tick loop ends at `DURATION_MS=2000`, disposes geometries + material. |

## Colour checks

| Target | Hex | Why |
|---|---|---|
| torus | `#dc241f` | TfL Underground red. |
| bar | `#003688` | TfL corporate blue. |
| plate | `#ffffff` | Plaque white. |
| plinth | `#3a3a3a` | Neutral base. |

## Wiring

- `ability: "pulse"` — resolves via `ABILITIES.pulse`.
- `abilityLabel: "Pulse!"` — card button copy.
- `accent: "#dc241f"` — label tick + card accent.
- Links point at https://github.com/rexheng/london_lsoa_map.
