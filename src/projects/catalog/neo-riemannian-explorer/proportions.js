// Neo-Riemannian Explorer — piano-keyboard sprite proportions.
//
// Silhouette decomposition:
//
//   ▓▓▓ ▓▓ ▓▓▓ ▓▓     — 5 black keys sitting proud of the white surface
//   ▓▓▓▓▓▓▓▓▓▓▓▓▓     — 7 white keys, continuous across the octave
//   ────────────       — back-lip of the keyboard frame, dark wood
//
// Base unit D = 0.26 (slot capsule radius). An octave spans 1.76×D wide
// (seven white keys at 0.252×D each), keyboard depth 0.58×D (key length).
// Width dominates — the sprite reads as a desk-bound prop in top-down
// views.

export const D = 0.26;

export const WHITE_KEYS = 7;
export const BLACK_KEY_OFFSETS = [0.5, 1.5, 3.5, 4.5, 5.5]; // indexed from leftmost C
// (C# between C–D, D# between D–E, F# between F–G, G# between G–A, A# between A–B)

export const SIZES = {
  // Keyboard base (the wooden frame the keys sit on).
  baseWidth:       WHITE_KEYS * 0.252 * D + 0.08 * D, // 7 keys + small margin
  baseDepth:       0.70 * D,
  baseHeight:      0.10 * D,
  baseY:          -0.30 * D, // flat bottom below slot origin

  // White keys — each sits on top of the base.
  whiteKeyWidth:   0.25 * D,
  whiteKeyDepth:   0.58 * D,
  whiteKeyHeight:  0.14 * D,
  whiteKeyGap:     0.005 * D, // narrow black gap between keys

  // Black keys — proud of the white surface, set back from the front edge.
  blackKeyWidth:   0.14 * D,
  blackKeyDepth:   0.36 * D,
  blackKeyHeight:  0.20 * D,
  blackKeyZOffset: 0.10 * D,  // inset from the back of the white keys

  // Brand logo area — a small plate on the front-left of the base.
  logoWidth:       0.20 * D,
  logoHeight:      0.06 * D,
  logoDepth:       0.01 * D,
};

export const COLOURS = {
  wood:           "#2b1f16",   // dark walnut frame
  woodHighlight:  "#4a372a",
  whiteKey:       "#f0ebe0",
  whiteKeyShadow: "#c9c3b4",
  blackKey:       "#151515",
  logoPlate:      "#8a6bbf",   // muted purple — card accent
};
