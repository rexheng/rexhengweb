# Arrow — silhouette check

| # | Feature | Target | Constants | Pass |
|---|---|---|---|---|
| 1 | Shaft | Tapered cylinder, 1.8×D tall | `shaftH=1.80*D`, `shaftRBottom=0.18*D`, `shaftRTop=0.22*D` | Cylinder with top > bottom for subtle taper. |
| 2 | Head | 4-sided pyramid, 0.45×D × 0.45×D | `headRBase=0.45*D`, `headH=0.45*D` | `ConeGeometry(radial=4)` gives a square-base pyramid. |
| 3 | Glow | Emissive purple material | `MeshStandardMaterial.emissiveIntensity=0.4` | Arrow reads as confident ascending sprite rather than plastic cone. |

## Colour checks

| Target | Hex |
|---|---|
| arrow | `#8a6ad9` (Phala purple) |
| arrowEmissive | `#b49cff` |

## Wiring

- `accent: "#8a6ad9"`.
- No ability.
