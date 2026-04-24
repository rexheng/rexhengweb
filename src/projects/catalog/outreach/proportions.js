// Outreach — LSOA choropleth tile.
//
// A flat square base tile gridded into 4×4 sub-tiles with varying Z-height.
// Sub-tile heights are driven by a deterministic hash of (gx, gy) so every
// rebuild produces the same pattern — reads as a mini LSOA heat-map.
//
// Silhouette:
//   1. Base slab — 1.80×D × 1.80×D × 0.05×D.
//   2. 4×4 sub-tiles — each (0.45×D × 0.45×D × variable-height). The
//      hashed heights span [0.04, 0.18]×D.
//
// Palette: a cool mental-health blue gradient, from a dim base to a bright
// top on the tallest tile.

export const D = 0.26;

const GRID = 4;

export const SIZES = {
  baseW:          1.80 * D,
  baseDepth:      1.80 * D,
  baseH:          0.05 * D,
  baseY:         -0.60 * D, // base slab sits low on the slot capsule

  gridN:          GRID,
  subW:           (1.80 / GRID) * D,  // 0.45×D per sub-tile
  subDepth:       (1.80 / GRID) * D,
  hMin:           0.04 * D,
  hMax:           0.18 * D,
};

export const COLOURS = {
  base:        "#2c3e50",
  subLow:      "#7fa5cc",
  subMid:      "#4a90d9",
  subHigh:     "#2767b3",
};

// Deterministic hash → [0,1]. Keep dependency-free so proportions.js stays
// a pure data module.
export function hashCell(gx, gy) {
  const n = gx * 73856093 ^ gy * 19349663;
  const u = (n >>> 0) / 0xffffffff;
  // Slight bias toward lower values so most cells are short — reads as
  // sparse "hotspots", which matches a choropleth of mental-health need.
  return Math.pow(u, 1.4);
}
