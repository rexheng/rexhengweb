const DEFAULTS = {
  minTime: 0.42,
  maxTime: 0.62,
  desiredHorizontalSpeed: 8.5,
  minHorizontalSpeed: 5.0,
  maxHorizontalSpeed: 14.0,
  minNearContactMs: 120,
  nearContactRadius: 0.34,
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function computeBallisticLunge({
  from,
  to,
  gravityZ = -9.81,
  options = {},
}) {
  const cfg = { ...DEFAULTS, ...options };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const horizontalDist = Math.hypot(dx, dy);

  const speedTime = horizontalDist > 1e-6
    ? horizontalDist / cfg.desiredHorizontalSpeed
    : cfg.minTime;
  const boundedSpeedTime = clamp(
    speedTime,
    horizontalDist > 1e-6 ? horizontalDist / cfg.maxHorizontalSpeed : cfg.minTime,
    horizontalDist > 1e-6 ? horizontalDist / cfg.minHorizontalSpeed : cfg.maxTime,
  );
  const time = clamp(boundedSpeedTime, cfg.minTime, cfg.maxTime);
  const vx = dx / time;
  const vy = dy / time;
  const vz = (dz - 0.5 * gravityZ * time * time) / time;
  const horizontalSpeed = Math.hypot(vx, vy);
  const speed = Math.hypot(vx, vy, vz);

  return {
    vx,
    vy,
    vz,
    speed,
    horizontalSpeed,
    time,
    horizontalDist,
  };
}

export function shouldTriggerNearContact({
  elapsedMs,
  slotPos,
  targetPos,
  options = {},
}) {
  const cfg = { ...DEFAULTS, ...options };
  if (elapsedMs < cfg.minNearContactMs) return false;
  const dist = Math.hypot(
    slotPos.x - targetPos.x,
    slotPos.y - targetPos.y,
    slotPos.z - targetPos.z,
  );
  return dist <= cfg.nearContactRadius;
}
