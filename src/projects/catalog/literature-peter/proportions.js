// Literature Peter — palette + quill emblem.

export const D = 0.26;

export const SIZES = {
  // Inkwell — small squat cylinder.
  wellR: 0.10 * D, wellH: 0.10 * D,
  // Quill shaft — thin cylinder angled upward.
  shaftR: 0.018 * D, shaftLen: 0.52 * D,
  shaftAngle: 0.45,   // radians from vertical
  // Feather — elongated flat slab wrapping the shaft top.
  featherW: 0.06 * D, featherH: 0.04 * D, featherD: 0.36 * D,
  emblemLift: 0.08 * D,
};

export const COLOURS = {
  body:       "#6e1f2e",
  accentTrim: "#4a1520",
  headSkin:   "#e8c4a2",
  inkDark:    "#101016",
  quillIvory: "#f5ebd4",
  quillEdge:  "#c9b58a",
};
