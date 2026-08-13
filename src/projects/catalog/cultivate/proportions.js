// Cultivate — QR capture plate with a small connection graph in front.
//
// Silhouette:
//   1. Square plate standing as a token, with a 3×3 QR-like cubie grid.
//   2. Four small node spheres on a ring around the plate (who you met).

export const D = 0.26;

export const SIZES = {
  plateW:     1.40 * D,
  plateH:     1.40 * D,
  plateD:     0.12 * D,
  plateBaseY: -0.70 * D,

  cell:       0.22 * D,
  cellGap:    0.08 * D,
  cellD:      0.08 * D,

  nodeR:      0.12 * D,
  nodeRingR:  1.05 * D,
  nodeCount:  4,
};

export const COLOURS = {
  plate: "#1c2a38",
  cell:  "#e8f0f4",
  node:  "#3d8a9e",
};
