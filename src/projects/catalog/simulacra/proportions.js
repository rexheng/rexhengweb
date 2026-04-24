// Simulacra — central hub + 5 satellite markers.
//
// Silhouette:
//   1. Hub sphere — radius 0.30×D, emissive glow.
//   2. Five satellite capsules — each a short capsule (0.10×D radius,
//      0.30×D tall) on a ring of radius 0.75×D around the hub.

export const D = 0.26;

export const SIZES = {
  hubR:           0.30 * D,
  hubY:           0.00,

  satR:           0.10 * D,
  satHeight:      0.30 * D,
  satRingR:       0.75 * D,
  satCount:       5,
};

export const COLOURS = {
  hub:           "#ff7138",   // Mistral orange
  hubEmissive:   "#ffa266",   // warmer glow
  satellite:     "#b64a12",   // darker rust for persona markers
  satelliteHead: "#ffcfa0",   // warm tan head
};
