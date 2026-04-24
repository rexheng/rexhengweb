// Musicity — city skyline + floating music note.
//
// Silhouette:
//   1. Three rectangular city blocks of different heights (1.6×D, 1.1×D,
//      0.8×D) and 0.30×D × 0.30×D footprints.
//   2. A floating 3D music note above the tallest block.

export const D = 0.26;

export const SIZES = {
  blockW:    0.30 * D,
  blockDepth: 0.30 * D,
  block1H:   1.60 * D,
  block2H:   1.10 * D,
  block3H:   0.80 * D,

  // Spacing between blocks along x.
  blockSpacing: 0.40 * D,
  blockBaseY:  -0.80 * D,

  // Music note above the tallest block.
  noteHeadR:    0.16 * D,
  stemLength:   0.55 * D,
  stemR:        0.04 * D,
  noteFloatY:   0.28 * D, // gap above the tallest block
};

export const COLOURS = {
  block:        "#d4a05a",
  blockShadow:  "#8b6a3a",
  note:         "#f3d27a",
  noteEmissive: "#ffdb88",
};
