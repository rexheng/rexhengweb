# FOV-Aware Project Spawn Placement

**Date:** 2026-05-15
**Status:** Design — awaiting user review
**Scope:** `src/projects/system.js` only

## Problem

`ProjectSystem.spawn()` places a newly added project at a uniformly random
polar offset around the humanoid torso:

```js
// src/projects/system.js:311–314
const ang = Math.random() * Math.PI * 2;          // full 360°
const r   = SPAWN_RING_MIN + Math.random() * (SPAWN_RING_MAX - SPAWN_RING_MIN);
const mjX = anchorX + Math.cos(ang) * r;
const mjY = anchorY + Math.sin(ang) * r;
```

The angle has no relationship to the camera. Consequences:

- Projects spawn behind the camera (not visible at all).
- Projects spawn on the left, under the `#rex-controls` panel.
- The fixed 1.2–2.4 MJ ring is a world distance; when zoomed in the spawn
  point can fall outside the frustum or be occluded by the avatar itself.

## Goals

Derived from brainstorming with the user:

1. **In front, at walking distance.** The project appears ahead along the
   camera's viewing azimuth, a believable distance from the avatar, reading
   as "arriving toward" the viewer.
2. **Adapt to zoom.** Spawn distance is derived from the live camera frustum
   so the project is always comfortably framed at any zoom level.
3. **Bias away from panels.** Lateral placement avoids the on-screen UI
   footprint (`#rex-controls`); some lateral variety is kept, but the spawn
   point is never under the GUI.

Non-goals: changing slot pooling, hitbox derivation, physics settling, or
any spawn behavior other than the `(x, y)` ground position and facing yaw.

## Approach (revised during implementation — see Implementation Notes)

**As built:** anchor placement on the camera's *look point* (the orbit
target's ground projection), not the avatar. The orbit target is screen
centre by construction, so a point at the look point's depth is always
visible and scales with zoom for free. Place the project at the look point,
nudged slightly past it along the camera→look-point ground direction (so the
avatar and the new project don't perfectly overlap), with a lateral offset
biased away from the UI panel. The avatar/torso is used only for a small
anti-overlap nudge.

This was a deliberate pivot away from the originally specified screen-space
raycast (kept below for the record). Empirically, the scene camera orbits
the avatar roughly *horizontally*, so a screen-point→ground raycast grazes
the horizon and is numerically unstable — hits land behind the camera or
metres off to the side. Raycast-to-ground is only stable for a camera
looking *down* at terrain. The camera-look-point method is deterministic and
never grazes the horizon.

### Originally specified (abandoned): screen-space raycast

Reuse the screen-space → world raycast idiom already present in this file
(`raycaster.setFromCamera(ndc, camera)`). Pick a target point in NDC,
raycast from the camera through it to the ground plane, spawn where it hits.
Zoom, "in front," and GUI-bias collapse into one NDC sampling step. Rejected
in implementation: unstable for a near-horizontal orbit camera (validated by
a 270-config browser sweep — 70% on-screen vs 100% for the look-point
method).

### Frame conventions (must hold in the implementation)

- MJ is z-up; THREE is y-up. Mapping used elsewhere in this file:
  THREE `(x, y, z)` → MJ `(x, −z, y)`; MJ `(x, y, z)` → THREE `(x, z, −y)`.
- MJ floor is `z = 0`, so the THREE ground plane is `y = 0`.
- The camera and renderer are `this.app.camera` / `this.app.renderer`.

## Component: `pickSpawnPoint(...)`

A single self-contained helper added to `system.js` (module-private function
or private method — implementer's choice, no behavior difference).

**Signature (conceptual):**
`pickSpawnPoint(app, anchorX, anchorY) → { mjX, mjY, faceYawQuat } | null`

**Inputs:** `app.camera`, `app.renderer.domElement` (for the canvas rect),
the document's `#rex-controls` element (for the panel footprint), and the
torso anchor in MJ `(anchorX, anchorY)`.

**Algorithm:**

1. **Compute the clear NDC.x band.**
   - Canvas rect = `renderer.domElement.getBoundingClientRect()`.
   - If `#rex-controls` exists and is visible, read its
     `getBoundingClientRect()`; convert its horizontal extent to canvas NDC.
     The clear band is the widest contiguous NDC.x interval *not* overlapping
     the panel, intersected with a center-biased cap of roughly
     `[−0.55, +0.55]` (keeps it away from frame edges).
   - If no panel (e.g., hidden), the clear band is the center-biased cap.
   - Querying the panel rect at spawn time (rather than hardcoding "left")
     keeps this correct if the panel moves or the layout differs on mobile.

2. **Sample the NDC target.**
   - `ndcX` = uniform sample within the clear band.
   - `ndcY` = small negative value with minor jitter (e.g., around
     `−0.15 ± 0.1`) so the ray meets the ground in the lower frame.

3. **Raycast to the ground plane.**
   - `raycaster.setFromCamera({x: ndcX, y: ndcY}, camera)`.
   - Intersect the THREE plane `y = 0` (normal `(0,1,0)`, constant `0`).
   - If no intersection, or the intersection is behind the camera, return
     `null` (caller uses the fallback).

4. **Convert + distance-clamp.**
   - THREE hit `(hx, hy, hz)` → MJ `(hx, −hz)` on the ground.
   - `dx = mjX − anchorX`, `dy = mjY − anchorY`; `dist = hypot(dx, dy)`.
   - If `dist < SPAWN_RING_MIN` or `dist > SPAWN_RING_MAX`, rescale the
     offset vector to the nearest band edge (clamp `dist`, keep direction):
     `mjX = anchorX + dx/dist * clampedDist`, similarly for `mjY`.
   - Guard `dist === 0` (degenerate) by treating it as below-min and using
     the camera-azimuth direction at `SPAWN_RING_MIN`.

5. **Facing yaw.**
   - Compute the MJ yaw so the project faces the camera (or equivalently the
     anchor-to-camera direction projected to the ground), replacing the
     existing `ang * 0.5` quaternion. This makes it read as arriving toward
     the viewer. Yaw → quaternion about MJ z, same qpos slots `[+3..+6]`.

**Output:** the final `mjX`, `mjY`, and the facing quaternion components.

## Fallback

If `pickSpawnPoint` returns `null` (camera at/above the horizon so the ray
never meets the ground):

- Project the camera-forward vector onto the THREE ground plane, convert to
  an MJ azimuth `θ`.
- `ang = θ + (Math.random() − 0.5) * SPREAD` where `SPREAD` is a modest cone
  (e.g., ~50°) shifted off the panel side using the same clear-band sign.
- `r = (SPAWN_RING_MIN + SPAWN_RING_MAX) / 2`.
- Facing yaw faces the anchor/camera as in step 5.

This preserves "in front" and GUI-bias even in the degenerate case; only the
zoom-perfect framing is approximate, which is acceptable for a rare path.

## Call-site change

In `spawn()`, replace lines 311–314 (the `ang`/`r`/`mjX`/`mjY` block) and
the yaw quaternion assignment at lines 326–330 with:

```js
const placement = pickSpawnPoint(this.app, anchorX, anchorY)
                ?? spawnFallback(this.app, anchorX, anchorY);
const { mjX, mjY, qw, qx, qy, qz } = placement;
// ... data.qpos[qposAdr+0..1] = mjX, mjY (qpos+2 = SPAWN_HEIGHT unchanged)
// ... data.qpos[qposAdr+3..6] = qw, qx, qy, qz
```

`SPAWN_HEIGHT`, the qpos/qvel wiring, `mj_forward`, collision setup, and
everything after remain untouched.

## Edge cases

- **No camera/renderer yet:** `pickSpawnPoint` returns `null`; fallback also
  needs the camera, so if `app.camera` is absent, use the *original*
  full-circle random placement as a last resort (preserves today's behavior
  rather than failing to spawn).
- **Panel covers the entire usable width** (extreme narrow viewport): clamp
  the clear band to a minimum width centered on screen; accept that on a
  very small screen the project may partially overlap the panel — better
  than no valid band.
- **Multiple rapid spawns:** each call samples independently; lateral jitter
  in step 2 keeps them from perfectly stacking. No anti-overlap logic added
  (out of scope; physics separates them on landing as today).
- **Camera exactly top-down:** ray meets ground reliably; distance clamp
  keeps it in the ring. No special handling needed.

## Testing

- **Manual, dev server `http://localhost:8765`:** spawn each catalog project
  while (a) zoomed out, (b) zoomed in close, (c) orbited 90°/180°, (d) with
  the controls panel open. In every case the project must appear inside the
  frame and clear of `#rex-controls`. Capture before/after screenshots.
- **Unit-ish:** if a lightweight harness fits the existing
  `slotParking.test.mjs` style, add a test for the distance-clamp math
  (given a hit point and anchor, asserts the result lies on the
  anchor→hit ray and within `[RING_MIN, RING_MAX]`). Pure function, no
  THREE/DOM needed if the clamp is extracted.
- **Regression:** confirm hitbox derivation, floor settling, and label
  tracking are unchanged (spawn several, verify they stand on the floor and
  labels follow).

## Implementation Notes

- **Approach pivot.** The raycast method was implemented first, then
  empirically falsified by a browser sweep across camera distance/azimuth/
  elevation. Replaced with the camera-look-point azimuth method. Pure helpers
  (`clearNdcBandX`, `clampToRing`, `yawQuatFacing`) live in
  `src/projects/spawnPlacement.mjs` with unit tests; `clampToRing` is no
  longer used by `system.js` but is retained (tested, generally useful).
- **Dev-server cache bug found and fixed.** `SimpleHTTPRequestHandler`
  answered `If-Modified-Since` with `304`, so the browser kept stale ES
  modules even though `dev_server.py` sent `Cache-Control: no-store`. Every
  browser verification silently tested the *old* code until this was caught
  by reading `ps.spawn.toString()` live. Fixed by stripping conditional
  request headers in `dev_server.py` so every request is a fresh `200`.
- **Verification.** 270 configurations (distances 1.2–9, all azimuths
  including behind-camera, elevations 0.12–0.5, 3 random samples each):
  100% on-screen for the look-point method. Visual screenshot at a
  zoomed-in/orbited camera confirms in-frame, panel-clear placement.

## Risks

- Raycast-to-plane requires the camera matrices to be current. `spawn()`
  runs on user action, well after first render, so matrices are fresh; no
  explicit `updateMatrixWorld` needed (the existing click raycaster at
  line 106 makes the same assumption and works).
- The "face the camera" yaw is a behavior change from random yaw. It is
  intended (reads as arriving toward viewer) and was confirmed in
  brainstorming.
