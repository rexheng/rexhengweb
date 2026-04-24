// Peel — stack of 3 open produce crates with a coin on top.
//
// Silhouette:
//   1. Three slatted crates stacked, each 1.0×D × 0.35×D × 1.0×D.
//   2. A small leaf-stamped coin centred on the top crate — flat disc +
//      a tiny leaf emblem.

export const D = 0.26;

export const SIZES = {
  crateW:      1.00 * D,
  crateDepth:  1.00 * D,
  crateH:      0.35 * D,
  crateCount:  3,
  crateGap:    0.02 * D,   // small stacking gap for realism

  baseY:      -0.80 * D,   // bottom of the lowest crate

  // Coin on top.
  coinR:       0.22 * D,
  coinH:       0.05 * D,

  // Leaf on the coin — a stretched sphere.
  leafR:       0.11 * D,
  leafYOffset: 0.02 * D,
};

export const COLOURS = {
  crateWood:  "#8a5a2b",       // warm slatted pine
  crateShadow: "#5a3815",      // darker shadow recess
  coin:        "#d4a84a",      // gold coin
  leaf:        "#2e8b3e",      // food-waste green
};
