// Simulacra — central hub + 5 low-poly bee satellites.
//
// Silhouette:
//   1. Hub sphere — radius 0.30×D, emissive glow.
//   2. Five low-poly bees — striped ellipsoid bodies with translucent wings
//      on a ring of radius 0.78×D around the hub.

export const D = 0.26;

export const SIZES = {
  hubR:           0.30 * D,
  hubY:           0.00,

  beeBodyR:       0.085 * D,
  beeBodyLength:  0.32 * D,
  beeStripeW:     0.035 * D,
  beeWingW:       0.055 * D,
  beeWingL:       0.13 * D,
  satRingR:       0.78 * D,
  satCount:       5,
};

export const COLOURS = {
  hub:           "#ff7138",   // Mistral orange
  hubEmissive:   "#ffa266",   // warmer glow
  beeBody:       "#f5b82e",   // warm yellow body
  beeStripe:     "#2a1d14",   // dark bands + stinger
  beeHead:       "#20140f",   // dark head
  beeWing:       "#d9f4ff",   // pale translucent wings
};
