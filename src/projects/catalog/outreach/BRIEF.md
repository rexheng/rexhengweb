# Outreach — sprite brief

**Project:** Outreach — Claude Hackathon @ Imperial, Top 8 of 130. Solo build.
**Sprite role:** data-viz prop. A flat 4×4 choropleth tile that reads as a
London heat-map at a glance.

## Why this sprite

Outreach is fundamentally a spatial-data tool: 4,994 LSOAs, one mental-health
need score per LSOA, rendered as a choropleth. A miniature 4×4 heat-map
tile is the cleanest possible 3D shorthand. The gradient from dim to
bright blue reads as "low to high need" without text.

## Silhouette targets

1. Base slab — 1.80×D × 1.80×D × 0.05×D, dark slate.
2. 4×4 sub-tile grid — each 0.45×D × 0.45×D footprint.
3. Sub-tile heights in [0.04, 0.18]×D, driven by a deterministic hash so
   the pattern is stable across rebuilds.

## No ability

Outreach is a policy tool, not a combat sprite. The tile is a static prop
that reads correctly when held, tipped, or parked.
