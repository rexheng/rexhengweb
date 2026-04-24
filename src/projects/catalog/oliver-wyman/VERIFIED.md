# Oliver Wyman — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Oval track | 1.5×D × 0.9×D, tube 0.08×D | `trackOuterW`, `trackOuterD`, `trackTubeR` | `primitives.stadiumTrack` assembles two straight cylinders + two half-torus caps. |
| 2 | Pedestal | 1.0×D × 0.08×D cylinder | `pedestalR`, `pedestalH` | Short disc beneath the track. |
| 3 | Scatter dots | 7 spheres rising LtoR | `dotCount=7` loop in build.js | t-parameterised x, gently curving z, colour ramp low→high. |

## Colour checks

| Target | Hex |
|---|---|
| track | `#e6372a` (OW red) |
| pedestal | `#4a4a4a` |
| dotLow | `#f6a49d` |
| dotHigh | `#b0221a` |

## Wiring

- `accent: "#e6372a"`.
- No ability.
