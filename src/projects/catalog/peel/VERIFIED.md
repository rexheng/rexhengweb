# Peel — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Crate stack | 3 slatted boxes, 1.0×D × 0.35×D × 1.0×D each | `crateW`, `crateDepth`, `crateH`, `crateCount=3` | Loop builds three via `primitives.produceCrate` with 3 slats per face. |
| 2 | Coin | Gold disc, 0.22×D radius × 0.05×D thick | `coinR=0.22*D`, `coinH=0.05*D` | Cylinder on top of the stack. |
| 3 | Leaf stamp | Stretched green sphere on coin | `leafR=0.11*D`, scale (1.2, 0.35, 0.6) | Flattened ellipsoid reads as a leaf at sprite scale. |

## Colour checks

| Target | Hex |
|---|---|
| crateWood | `#8a5a2b` |
| coin | `#d4a84a` |
| leaf | `#2e8b3e` |

## Wiring

- `accent: "#2e8b3e"`.
- No ability.
