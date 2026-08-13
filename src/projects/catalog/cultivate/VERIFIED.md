# Cultivate — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Plate | Square token 1.4×D | `plateW`, `plateH`, `plateD` | BoxGeometry plate. |
| 2 | QR grid | 3×3 cubies, centre open | `cell`, `cellGap` | Eight cubies, skip (1,1). |
| 3 | Graph nodes | 4 spheres on a ring | `nodeCount=4`, `nodeRingR` | SphereGeometry nodes. |

## Colour checks

| Target | Hex |
|---|---|
| plate | `#1c2a38` |
| cell | `#e8f0f4` |
| node | `#3d8a9e` |

## Wiring

- `accent: "#3d8a9e"`.
- `ability: "pulse"`.
