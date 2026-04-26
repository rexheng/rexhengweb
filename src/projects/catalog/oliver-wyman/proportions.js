// Oliver Wyman — extruded brand mark on backing plate. See spec §3.7.

export const D = 0.26;

export const SIZES = {
  // Pedestal beneath the plate.
  pedestalR:       1.00 * D,
  pedestalH:       0.08 * D,
  pedestalBaseY:  -0.85 * D,

  // Backing plate behind the logo.
  plateW:          1.40 * D,
  plateH:          1.00 * D,
  plateD:          0.05 * D,

  // Extrude depth for the logo.
  logoExtrude:     0.04,
};

export const COLOURS = {
  logo:     "#002554",   // OW navy
  plate:    "#f5f3ee",   // off-white
  pedestal: "#4a4a4a",
};
