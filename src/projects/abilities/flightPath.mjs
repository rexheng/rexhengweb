// Flight planner for the Cultivate "fly" ability — pure math, MuJoCo frame
// (z-up, metres), no THREE import so it runs under node:test.
//
// The plane flies one smooth circuit and lands where it took off (or a short
// way off, see the landing offset below):
//
//   prep    glide/settle from the current pose and velocity onto the runway
//           heading (props spool up). From rest this is a gentle swivel in
//           place; when re-triggered mid-flight (or fired while falling) the
//           plane carries its velocity into a minimum-jerk glide down to a
//           runway point a little ahead of it, so nothing jumps
//   flight  takeoff roll → climb-out → banked elliptical circuit → descent
//           → zero-sink touchdown → rollout to a stop, all along one closed
//           ellipse that starts and ends at the runway point with the same
//           heading. An optional landing offset is blended in while the
//           plane is at altitude, so it can touch down on a clear patch of
//           floor a short way from where it took off
//   settle  hold level on the ground while the props spin down
//
// Smoothness is by construction rather than by filtering:
//   - the ground track is an ellipse re-parametrised by arc length, so the
//     plane flies at a steady speed and curvature varies smoothly;
//   - speed along the track uses smootherstep ramps (velocity is C2), so it
//     eases out of the start and into the stop;
//   - altitude is a smootherstep climb minus a smootherstep descent, so the
//     sink rate is exactly zero at touchdown (no bounce);
//   - pitch follows the analytic climb slope, bank follows the coordinated-
//     turn angle from the ground track's signed curvature, and both are faded
//     by height so the plane is level whenever it touches the ground.
//
// Body frame convention (matches the GLB mesh after the MJ↔THREE swizzle):
// nose = body −Y, up = body +Z, so body +X is the LEFT wing (X = Y × Z).

const TAU = Math.PI * 2;
const G = 9.81;

export const FLIGHT_DEFAULTS = Object.freeze({
  prepSec: 0.8,      // prep length from rest on the ground...
  maxPrepSec: 1.8,   // ...stretched for height, speed and swivel, up to this
  prepLead: 0.4,     // runway sits v0 · prep · prepLead ahead (no backtracking)
  maxLead: 1.5,      // ...but never more than this (m); a shorter, firmer stop instead
  maxStartSpeed: 4,  // clamp on the carried-in velocity (m/s)
  flightSec: 4.5,
  settleSec: 0.35,
  a: 1.5,            // ellipse semi-axis along the runway heading (m)
  b: 1.05,           // ellipse semi-axis to the turn side (m)
  cruiseAlt: 0.95,   // cruise height of the body centre above its rest height (m)
  liftS: 0.06,       // arc-length fraction where the wheels/skids leave the ground
  topS: 0.38,        // ...where the climb tops out
  descS: 0.52,       // ...where the descent starts
  touchS: 0.9,       // ...where it touches down (sink rate is zero here)
  accelFrac: 0.26,   // fraction of flight time spent accelerating from rest
  decelFrac: 0.24,   // fraction of flight time spent braking to rest
  pitchGain: 0.75,   // attitude follows 75% of the flight-path angle
  aoa: 0.07,         // extra nose-up when airborne (rad, ~4°)
  maxBank: 0.55,     // rad (~32°): a gentle, Flyer-like bank, not aerobatics
  bankHeight: 0.35,  // full bank allowed only above this height (m)
  aoaHeight: 0.25,   // full angle of attack only above this height (m)
  landBlendS0: 0.4,  // landing offset blends in over this arc-fraction window,
  landBlendS1: 0.8,  // ...entirely while airborne (liftS < S0, S1 < touchS)
  maxLandOffset: 1.2, // (m)
});

// ── scalar helpers ────────────────────────────────────────────────────────
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Smootherstep: C2, zero 1st and 2nd derivative at both ends. */
export function smoother(x) {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function smootherD(x) {
  if (x <= 0 || x >= 1) return 0;
  return 30 * x * x * (x - 1) * (x - 1);
}
// Quintic Hermite basis for a unit initial velocity: zero position at both
// ends, slope 1 at 0, zero slope at 1, zero curvature at both ends. Adding
// T·v0·hermiteV0(t/T) to a smootherstep blend carries an initial velocity v0
// into a C2 stop.
function hermiteV0(x) {
  const t = clamp01(x);
  return t - 6 * t ** 3 + 8 * t ** 4 - 3 * t ** 5;
}
// ∫0^x smoother(u) du for x in [0,1].
function smootherInt(x) {
  const t = clamp01(x);
  return t ** 6 - 3 * t ** 5 + 2.5 * t ** 4;
}

// ── quaternion helpers (MuJoCo order: [w, x, y, z]) ───────────────────────
export function quatFromBasis(r, y, z) {
  // Columns of the rotation matrix are the body axes in world coordinates.
  const m00 = r[0], m01 = y[0], m02 = z[0];
  const m10 = r[1], m11 = y[1], m12 = z[1];
  const m20 = r[2], m21 = y[2], m22 = z[2];
  const tr = m00 + m11 + m22;
  let w, x, yy, zz;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = 0.25 * s; x = (m21 - m12) / s; yy = (m02 - m20) / s; zz = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s; x = 0.25 * s; yy = (m01 + m10) / s; zz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s; x = (m01 + m10) / s; yy = 0.25 * s; zz = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s; x = (m02 + m20) / s; yy = (m12 + m21) / s; zz = 0.25 * s;
  }
  return quatNormalize([w, x, yy, zz]);
}
export function quatNormalize(q) {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
function quatMul(a, b) {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}
const quatConj = (q) => [q[0], -q[1], -q[2], -q[3]];
/** Rotation angle between two unit quaternions (rad, 0..π). */
export function quatAngle(a, b) {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d));
}
export function quatSlerp(a, b, t) {
  let bx = b;
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { bx = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
  if (d > 0.9995) {
    return quatNormalize(a.map((v, i) => v + (bx[i] - v) * t));
  }
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return quatNormalize(a.map((v, i) => v * wa + bx[i] * wb));
}
/** Rotate vector v by unit quaternion q. */
export function quatRotate(q, v) {
  const p = quatMul(quatMul(q, [0, v[0], v[1], v[2]]), quatConj(q));
  return [p[1], p[2], p[3]];
}
/** Heading (yaw of the nose, radians from +X) of a body quaternion. */
export function noseHeading(q) {
  const nose = quatRotate(q, [0, -1, 0]);
  return Math.atan2(nose[1], nose[0]);
}

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/**
 * Body quaternion for a nose direction given by heading ψ (horizontal),
 * pitch θ (nose up +) and bank φ (+ = left wing down, i.e. a left turn).
 */
export function attitudeQuat(heading, pitch, bank) {
  const ch = Math.cos(heading), sh = Math.sin(heading);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const f = [cp * ch, cp * sh, sp];                 // nose
  const u0 = [-sp * ch, -sp * sh, cp];              // wings-level up
  const l0 = cross(u0, f);                          // left wing
  const cb = Math.cos(bank), sb = Math.sin(bank);
  const up = norm3([u0[0] * cb + l0[0] * sb, u0[1] * cb + l0[1] * sb, u0[2] * cb + l0[2] * sb]);
  const leftWing = cross(up, f);                    // body +X
  return quatFromBasis(leftWing, [-f[0], -f[1], -f[2]], up);
}

// ── ellipse arc-length table ─────────────────────────────────────────────
// The planner scores ~100 candidate circuits per launch, but only a few sizes;
// cache tables by semi-axes so each size is integrated once.
const arcCache = new Map();
function arcTable(a, b) {
  const key = `${a}:${b}`;
  let tab = arcCache.get(key);
  if (!tab) {
    if (arcCache.size > 32) arcCache.clear();
    tab = buildArcTable(a, b);
    arcCache.set(key, tab);
  }
  return tab;
}
function buildArcTable(a, b, n = 2048) {
  const L = new Float64Array(n + 1);
  const speed = (phi) => Math.hypot(a * Math.cos(phi), b * Math.sin(phi));
  let acc = 0;
  const h = TAU / n;
  for (let i = 1; i <= n; i++) {
    const p0 = (i - 1) * h, p1 = i * h;
    // Simpson on each cell.
    acc += (h / 6) * (speed(p0) + 4 * speed((p0 + p1) / 2) + speed(p1));
    L[i] = acc;
  }
  return { L, total: acc, n, h };
}
function phiAtFraction(tab, s) {
  const target = clamp01(s) * tab.total;
  let lo = 0, hi = tab.n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tab.L[mid] < target) lo = mid; else hi = mid;
  }
  const span = tab.L[hi] - tab.L[lo] || 1;
  return (lo + (target - tab.L[lo]) / span) * tab.h;
}

/**
 * Build a flight plan.
 *
 * @param {object} p
 * @param {number[]} p.startPos   current body position [x, y, z]
 * @param {number[]} p.startQuat  current body quaternion [w, x, y, z]
 * @param {number[]} [p.startVel] current linear velocity [vx, vy, vz] (m/s)
 * @param {number}   [p.startPropRate=0] prop speed (0..1) carried in
 * @param {number}   p.groundZ    body-centre height when resting level on the floor
 * @param {number}   p.heading    runway heading (radians from +X)
 * @param {number}   p.side       +1 = circuit turns left, −1 = turns right
 * @param {number}   [p.scale=1]  uniform size of the circuit
 * @param {number[]} [p.landOffset=[0,0]] touch down this far (x, y) from the
 *                                 takeoff point; clamped to maxLandOffset
 * @param {object}   [p.opts]     overrides for FLIGHT_DEFAULTS
 */
export function createFlightPlan({
  startPos, startQuat, startVel = [0, 0, 0], startPropRate = 0,
  groundZ, heading, side = 1, scale = 1, landOffset = [0, 0], opts = {},
}) {
  const o = { ...FLIGHT_DEFAULTS, ...opts };
  const a = o.a * scale, b = o.b * scale, H = o.cruiseAlt * scale;
  const flightSec = o.flightSec * (0.65 + 0.35 * scale);
  const tab = arcTable(a, b);
  const pathLen = tab.total;
  const sgn = side >= 0 ? 1 : -1;
  const fx = Math.cos(heading), fy = Math.sin(heading);
  const lx = -fy * sgn, ly = fx * sgn;                 // toward the turn side
  // Prep: stretch for height and carried-in speed, and put the runway a
  // little ahead along the horizontal velocity so the glide never backtracks
  // (prepLead ≥ ~0.39 keeps the minimum-jerk stop monotonic).
  let v0 = [startVel[0] || 0, startVel[1] || 0, startVel[2] || 0];
  const sp0 = Math.hypot(v0[0], v0[1], v0[2]);
  if (sp0 > o.maxStartSpeed) v0 = v0.map((v) => (v * o.maxStartSpeed) / sp0);
  const h0 = Math.max(0, startPos[2] - groundZ);
  const runwayQuat = attitudeQuat(heading, 0, 0);
  const swivel = quatAngle(startQuat, runwayQuat);   // rad, 0..π
  let prepSec = Math.min(
    o.maxPrepSec,
    o.prepSec + 0.45 * h0 + 0.12 * Math.min(sp0, o.maxStartSpeed) + 0.4 * (swivel / Math.PI),
  );
  const vh = Math.hypot(v0[0], v0[1]);
  if (vh * prepSec * o.prepLead > o.maxLead) {
    // Too fast to stop within maxLead at this pace: stop sooner instead of
    // overshooting and backing up.
    prepSec = Math.max(o.prepSec * 0.75, o.maxLead / (vh * o.prepLead));
  }
  let leadX = v0[0] * prepSec * o.prepLead, leadY = v0[1] * prepSec * o.prepLead;
  const leadLen = Math.hypot(leadX, leadY);
  if (leadLen > o.maxLead) { leadX *= o.maxLead / leadLen; leadY *= o.maxLead / leadLen; }
  const runway = [startPos[0] + leadX, startPos[1] + leadY, groundZ];
  let landX = landOffset[0] || 0, landY = landOffset[1] || 0;
  const landLen = Math.hypot(landX, landY);
  if (landLen > o.maxLandOffset) { landX *= o.maxLandOffset / landLen; landY *= o.maxLandOffset / landLen; }
  const landing = [runway[0] + landX, runway[1] + landY, groundZ];
  const LB0 = o.landBlendS0, LBW = o.landBlendS1 - o.landBlendS0;
  const prop0 = Math.min(1, Math.max(0, startPropRate));
  const A = o.accelFrac, D = o.decelFrac;
  const warpTotal = 1 - (A + D) / 2;
  const cruiseSpeed = pathLen / (flightSec * warpTotal);  // m/s
  const t0 = prepSec, t1 = prepSec + flightSec, duration = t1 + o.settleSec;

  // Normalised flight time τ∈[0,1] → arc fraction s, and ds/dτ.
  function warp(tau) {
    const t = clamp01(tau);
    let F, v;
    if (t < A) { F = A * smootherInt(t / A); v = smoother(t / A); }
    else if (t <= 1 - D) { F = A * 0.5 + (t - A); v = 1; }
    else {
      const x = (1 - t) / D;
      F = A * 0.5 + (1 - D - A) + D * (0.5 - smootherInt(x));
      v = smoother(x);
    }
    return { s: F / warpTotal, dsdtau: v / warpTotal };
  }
  function height(s) {
    const up = (s - o.liftS) / (o.topS - o.liftS);
    const dn = (s - o.descS) / (o.touchS - o.descS);
    const h = H * (smoother(up) - smoother(dn));
    const dhds = H * (smootherD(up) / (o.topS - o.liftS) - smootherD(dn) / (o.touchS - o.descS));
    return { h, dhds };
  }

  // Ground track at arc fraction s: position and its derivative d/ds (m per
  // unit s, analytic, so the heading is defined even at rest).
  function track(s) {
    const phi = phiAtFraction(tab, s);
    const cphi = Math.cos(phi), sphi = Math.sin(phi);
    const dphids = pathLen / (Math.hypot(a * cphi, b * sphi) || 1e-9);
    const u = (s - LB0) / LBW;
    const blend = smoother(u), dblend = smootherD(u) / LBW;
    const along = a * sphi, lateral = b * (1 - cphi);
    return {
      x: runway[0] + fx * along + lx * lateral + landX * blend,
      y: runway[1] + fy * along + ly * lateral + landY * blend,
      tx: (fx * a * cphi + lx * b * sphi) * dphids + landX * dblend,
      ty: (fy * a * cphi + ly * b * sphi) * dphids + landY * dblend,
    };
  }
  // Signed curvature of the ground track (1/m, + = turning left).
  function curvature(s, tr) {
    const e = 1e-4;
    const sa = Math.max(0, s - e), sb = Math.min(1, s + e);
    const ta = track(sa), tb = track(sb);
    const dtx = (tb.tx - ta.tx) / (sb - sa), dty = (tb.ty - ta.ty) / (sb - sa);
    const n = Math.hypot(tr.tx, tr.ty) || 1e-9;
    return (tr.tx * dty - tr.ty * dtx) / (n * n * n);
  }

  // Flight-phase pose at flight time tf∈[0, flightSec].
  function flightPose(tf) {
    const { s, dsdtau } = warp(tf / flightSec);
    const tr = track(s);
    const { h, dhds } = height(s);
    const psi = Math.atan2(tr.ty, tr.tx);
    const dArc = Math.hypot(tr.tx, tr.ty);            // m of track per unit s
    // Attitude.
    const slope = dhds / dArc;                        // dh / d(arc length)
    const wAoa = smoother(h / o.aoaHeight);
    const pitch = o.pitchGain * Math.atan(slope) + o.aoa * wAoa;
    const v = (dsdtau / flightSec) * dArc;            // ground speed m/s
    const wBank = smoother(h / o.bankHeight);
    let bank = Math.atan((v * v * curvature(s, tr)) / G) * wBank;
    if (bank > o.maxBank) bank = o.maxBank;
    if (bank < -o.maxBank) bank = -o.maxBank;
    return { pos: [tr.x, tr.y, groundZ + h], quat: attitudeQuat(psi, pitch, bank), h, speed: v, s };
  }

  /** Pose at plan time t (seconds since the ability fired). */
  function pose(t) {
    if (t <= t0) {
      const u = t / prepSec;
      const k = smoother(u), hv = prepSec * hermiteV0(u);
      const pos = [0, 1, 2].map((i) => startPos[i] + (runway[i] - startPos[i]) * k + v0[i] * hv);
      if (pos[2] < groundZ) pos[2] = groundZ;     // a fast sink never digs in
      return {
        pos,
        quat: quatSlerp(startQuat, runwayQuat, k),
        h: pos[2] - groundZ,
        speed: 0,
        s: 0,
        propRate: prop0 + (1 - prop0) * k,
        phase: "prep",
      };
    }
    if (t < t1) {
      const tf = t - t0;
      const p = flightPose(tf);
      const tau = tf / flightSec;
      // Props: full power until braking, then wind down to a tick-over.
      p.propRate = tau < 1 - D ? 1 : 1 - 0.7 * smoother((tau - (1 - D)) / D);
      p.phase = p.h > 1e-4 ? "air" : "ground";
      return p;
    }
    const k = smoother((t - t1) / o.settleSec);
    return { pos: landing.slice(), quat: runwayQuat, h: 0, speed: 0, s: 1, propRate: 0.3 * (1 - k), phase: "settle" };
  }

  /**
   * Full kinematic state at time t: pose plus the freejoint velocities that
   * carry the body along the path until the next write (linear in world
   * frame, angular in body frame — MuJoCo's freejoint qvel convention).
   */
  function state(t, dt = 1 / 120) {
    const p = pose(t);
    const ta = Math.max(0, t - dt), tb = Math.min(duration, t + dt);
    const span = tb - ta;
    if (span <= 0) return { ...p, vel: [0, 0, 0], angVel: [0, 0, 0] };
    const pa = pose(ta), pb = pose(tb);
    const vel = [(pb.pos[0] - pa.pos[0]) / span, (pb.pos[1] - pa.pos[1]) / span, (pb.pos[2] - pa.pos[2]) / span];
    let rel = quatMul(quatConj(pa.quat), pb.quat);
    if (rel[0] < 0) rel = rel.map((v) => -v);
    const ang = 2 * Math.acos(Math.min(1, rel[0]));
    const sn = Math.sqrt(Math.max(0, 1 - rel[0] * rel[0]));
    const angVel = sn < 1e-9 ? [0, 0, 0] : [rel[1] / sn * ang / span, rel[2] / sn * ang / span, rel[3] / sn * ang / span];
    return { ...p, vel, angVel };
  }

  return {
    duration,
    prepSec,
    flightSec,
    pathLen,
    cruiseSpeed,
    cruiseAlt: H,
    runway,
    runwayQuat,
    landing,
    heading,
    side: sgn,
    scale,
    pose,
    state,
  };
}
