# Outreach — silhouette check

| # | Feature | Target | Constants | Pass reasoning |
|---|---|---|---|---|
| 1 | Base slab | 1.80×D × 1.80×D × 0.05×D | `baseW=1.80*D`, `baseDepth=1.80*D`, `baseH=0.05*D` | Tile footprint matches brief exactly. |
| 2 | 4×4 grid | 16 sub-tiles | `gridN=4` drives nested loop in `build.js` | 16 boxes; each `subW = baseW/4 = 0.45×D`. |
| 3 | Variable height | [0.04, 0.18]×D per cell | `hashCell(gx, gy)` → `[0,1]`; height = `hMin + (hMax-hMin) * u` | Deterministic per-cell height, biased low to read as sparse hotspots. |
| 4 | Colour ramp | Low / mid / high blue | Three materials picked by `u < 0.33 / 0.66 / else` | Three-stop gradient approximates a choropleth legend. |

## Ability check

| Ability | Expected | Verified |
|---|---|---|
| (none) | Static prop | `ability: null` in `index.js`. |

## Wiring

- `accent: "#4a90d9"` — mental-health blue.
- Live link → https://outreach-london.vercel.app.
- Copy references "4,994 London LSOAs" and "solo build".
