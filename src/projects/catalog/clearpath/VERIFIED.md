# ClearPath — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Cross slab | Arms 1.20×D long, 0.36×D wide, 0.24×D deep | `armLength`, `armWidth`, `armDepth` | Two overlapping boxes via `primitives.crossSlab`. |
| 2 | Clock disc | Radius 0.30×D | `clockR=0.30*D`, `clockH=0.05*D` | Cylinder on top of centre of cross. |
| 3 | Tick marks | 12 ticks on rim | `tickCount=12` loop in build.js | Ticks oriented radially via `rotation.y = theta`. |

## Colour checks

| Target | Hex | Notes |
|---|---|---|
| cross | `#005eb8` | Official NHS brand blue. |
| clock | `#ffffff` | Standard clock face. |
| ticks | `#003065` | Darker navy for contrast on the white disc. |

## Wiring

- `accent: "#005eb8"`.
- Live site → https://inform-eight.vercel.app.
- No ability.
