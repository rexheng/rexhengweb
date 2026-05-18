// Pure placement math for FOV-aware project spawning.
// See docs/superpowers/specs/2026-05-15-fov-aware-project-spawn-design.md.
//
// No THREE / DOM dependencies — the raycast wiring lives in system.js and
// feeds plain numbers in here so this stays unit-testable.

const MIN_BAND_HALF = 0.15; // half-width of the fallback centered band

/**
 * Widest clear NDC.x interval given the canvas and (optional) UI panel rects,
 * intersected with a center-biased cap [-cap, +cap].
 *
 * @param {{left:number,width:number}} canvas  renderer canvas client rect
 * @param {{left:number,right:number}|null} panel  UI panel client rect, or null
 * @param {number} cap  center-bias cap (NDC.x), e.g. 0.55
 * @returns {{min:number,max:number}}
 */
export function clearNdcBandX(canvas, panel, cap) {
  const lo = -cap, hi = cap;
  if (!panel || !canvas.width || panel.right <= panel.left) {
    return { min: lo, max: hi };
  }
  const toNdc = (clientX) => ((clientX - canvas.left) / canvas.width) * 2 - 1;
  const pMin = toNdc(panel.left);
  const pMax = toNdc(panel.right);

  // Panel does not overlap the capped region at all.
  if (pMax <= lo || pMin >= hi) return { min: lo, max: hi };

  // Two candidate clear sides; keep the wider, clipped to the cap.
  const leftW = Math.min(pMin, hi) - lo;
  const rightW = hi - Math.max(pMax, lo);
  let band;
  if (rightW >= leftW) band = { min: Math.max(pMax, lo), max: hi };
  else band = { min: lo, max: Math.min(pMin, hi) };

  // Panel swallows the usable width — fall back to a minimum centered band.
  if (band.max - band.min < MIN_BAND_HALF * 2) {
    return { min: -MIN_BAND_HALF, max: MIN_BAND_HALF };
  }
  return band;
}

/**
 * Clamp a ground hit point to the spawn ring while preserving the
 * anchor->hit direction. Degenerate (hit == anchor) uses dirIfDegenerate.
 *
 * @param {{x:number,y:number}} [dirIfDegenerate]  unit vector, default (1,0)
 * @returns {{mjX:number,mjY:number}}
 */
export function clampToRing(anchorX, anchorY, hitX, hitY, ringMin, ringMax,
                            dirIfDegenerate = { x: 1, y: 0 }) {
  let dx = hitX - anchorX;
  let dy = hitY - anchorY;
  let dist = Math.hypot(dx, dy);
  if (dist === 0) {
    dx = dirIfDegenerate.x;
    dy = dirIfDegenerate.y;
    dist = Math.hypot(dx, dy) || 1;
  }
  const clamped = Math.min(ringMax, Math.max(ringMin, dist));
  const ux = dx / dist, uy = dy / dist;
  return { mjX: anchorX + ux * clamped, mjY: anchorY + uy * clamped };
}

/**
 * Quaternion (about MJ z-up) that yaws a body to face (toX, toY) from
 * (fromX, fromY). Returns components for qpos[+3..+6] order (w, x, y, z).
 *
 * @returns {{qw:number,qx:number,qy:number,qz:number}}
 */
export function yawQuatFacing(fromX, fromY, toX, toY) {
  const yaw = Math.atan2(toY - fromY, toX - fromX);
  return { qw: Math.cos(yaw / 2), qx: 0, qy: 0, qz: Math.sin(yaw / 2) };
}
