// Manusman — stacked briefing cards + a live-call overlay panel.
//
// Silhouette:
//   1. Three cream briefing cards, slightly fanned, sitting as a stack.
//   2. A darker overlay slab in front (Google Meet-style PiP), with a thin
//      amber status bar along the top edge.

export const D = 0.26;

export const SIZES = {
  cardW:      1.40 * D,
  cardH:      1.80 * D,
  cardD:      0.06 * D,
  cardFanX:   0.16 * D,
  cardFanZ:   0.10 * D,
  cardLift:   0.08 * D,
  stackBaseY: -0.90 * D,

  overlayW:   1.10 * D,
  overlayH:   0.72 * D,
  overlayD:   0.08 * D,
  overlayY:   0.55 * D,
  overlayZ:   0.42 * D,

  barH:       0.10 * D,
};

export const COLOURS = {
  card:     "#f3ead6",
  cardRule: "#c9b48a",
  overlay:  "#2a241c",
  bar:      "#c17a3a",
};
