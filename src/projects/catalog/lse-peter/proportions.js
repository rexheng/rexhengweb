// LSE Peter — palette + emblem tuning for the shared peterAvatar.
//
// Every Peter sprite uses the same silhouette (shared peterAvatar
// primitive) and differs only in palette + the emblem above the head.
// Emblem for LSE Peter: a small stack of 3 books, reading as "academic".

export const D = 0.26;

export const SIZES = {
  // Book stack geometry — 3 books of descending size.
  book1W: 0.42 * D, book1H: 0.07 * D, book1D: 0.30 * D,
  book2W: 0.38 * D, book2H: 0.06 * D, book2D: 0.27 * D,
  book3W: 0.34 * D, book3H: 0.05 * D, book3D: 0.24 * D,
  bookLift: 0.12 * D, // gap between head top and first book
};

export const COLOURS = {
  body:       "#6b1f5f",
  accentTrim: "#8a2f7f",
  headSkin:   "#e8c4a2",
  bookColour: "#2b1f16",
  bookGilt:   "#d4a84a",
};
