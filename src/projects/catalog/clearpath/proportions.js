// ClearPath — NHS plus + clock on top of centre.
//
// Silhouette:
//   1. NHS-blue cross slab — two overlapping boxes forming a plus sign.
//   2. Clock face disc — a thin cylinder on top of the centre with
//      12 tick marks around the rim.

export const D = 0.26;

export const SIZES = {
  // Cross — arms 1.2×D long, 0.36×D wide, 0.24×D deep.
  armLength:    1.20 * D,
  armWidth:     0.36 * D,
  armDepth:     0.24 * D,
  crossY:       0.00,       // vertically centred on origin

  // Clock disc — sits on top of the centre (y = armDepth/2).
  clockR:       0.30 * D,
  clockH:       0.05 * D,

  // Tick marks — 12 small boxes arranged around the clock rim.
  tickCount:    12,
  tickR:        0.26 * D,   // tick ring radius (slightly inside clockR)
  tickW:        0.025 * D,
  tickH:        0.04 * D,
  tickDepth:    0.02 * D,
};

export const COLOURS = {
  cross:   "#005eb8",   // NHS corporate blue
  clock:   "#ffffff",
  ticks:   "#003065",
};
