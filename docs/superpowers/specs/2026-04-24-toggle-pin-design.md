# Toggle-pin (persistent freeze) — design spec

## Problem

Current `F`-freeze behavior is tied to the active grab. Press `F` while
holding left-click → body is momentarily locked in space; release left-click
→ body falls again (`onUp` resets `this.frozen = false` and zeroes
`xfrc_applied`). This is not what the user wants.

The desired behavior is a **persistent per-body pin**: press `F` → that
specific body (not the whole ragdoll) stays locked in world space even after
the mouse is released. The rest of the articulated system continues to
physicalize off the pinned anchor, so pinning one limb lets the rest dangle
or swing from it.

## Goals

1. `F` while grabbing a body → pin that body in place; mouse release leaves
   it pinned.
2. Articulated limbs pin correctly — pinning the right forearm holds the
   forearm and lets the shoulder, hand, legs, etc. swing from it naturally.
3. Freejoint bodies (project props, full-humanoid root) pin correctly.
4. Multiple independent pins can exist simultaneously.
5. Unpin by click-dragging the pinned body past a small cursor threshold.
6. `F` while hovering a pinned body (no active grab) also unpins it.
7. Pinned bodies have a clear visual signal (cyan tint) distinct from
   hover/grab highlighting.

## Non-goals

- Pinning the world-body (bodyID 0) or the floor.
- Persisting pins across scene switches. `switchScene` clears all pins.
- Rotational pinning separate from positional — pin locks both linear and
  angular motion of the target body.
- Sub-body attachment points. The pin locks the body's CoM frame at
  whatever world pose it had at the moment of pinning.

## Architecture

### New module: `PinSystem` (owned by `App`)

A small class in `src/pinSystem.js` with the single responsibility of
tracking pinned bodies and enforcing their frozen pose every physics tick.

```
class PinSystem {
  constructor(app) {
    this.app = app;
    // Map<bodyID, { pos: Vector3 (MJ world), quat: Quaternion (MJ world),
    //               originalMaterials: Map<mesh, Material> }>
    this.pins = new Map();
    this._mjPos = new Float32Array(3);
    this._mjQuat = new Float32Array(4);
  }

  pin(bodyID) { ... }          // Capture current world pose, tint meshes, register.
  unpin(bodyID) { ... }        // Remove pin, restore mesh material, clear velocities.
  togglePin(bodyID) { ... }    // pin() if not pinned, else unpin().
  isPinned(bodyID) { ... }
  apply() { ... }              // Called every frame before stepPhysics.
  clearAll() { ... }           // Called on scene switch.
}
```

### Per-frame enforcement

In `PinSystem.apply()`, for each pinned bodyID:

**Freejoint bodies (jnt_type === 0):** Write the captured pose back into
`data.qpos[dofQposAdr..]` (3 pos + 4 quat) and zero `data.qvel[dofAdr..]`
(6 DoF). This is the same mechanism `grabber.toggleFreeze` already uses,
just per-frame and persistent.

**Articulated limbs (other jnt types, or bodies at deeper nesting):** We
cannot directly set the world pose of an articulated body — its position is
derived from parent joints. Instead, apply a stiff spring force via
`data.xfrc_applied` that pulls the body's CoM back toward the captured
world pose, and damp its linear velocity aggressively. This mirrors the
"frozen" logic already in `grabber.apply()` but runs unconditionally for
pinned bodies:

```
const dx = target.x - comWorld.x;
// ... with critically-damped spring: ω=25, ζ=1.0 (stiffer than grab so
// even fast impacts against the pinned limb don't dislodge it)
```

Rotational pinning for articulated limbs uses a torque proportional to
quaternion-error against the captured orientation; same stiff-damped
recipe.

### Visual indicator

When `pin()` is called, walk `app.bodies[bodyID]`'s children and for each
`isMesh` replace/tint the material. Simplest approach: store the original
material per mesh, then assign a clone with `emissive = cyan,
emissiveIntensity = 0.4`. `unpin()` restores the original materials.

No extra scene objects, no icons — just a tint. The cyan emissive matches
the current freeze grab-dot colour (`0x66ccff`), which preserves visual
continuity with the old behavior.

### Grabber changes

Rip out the old transient freeze logic:

- `this.frozen` boolean: **removed**.
- `toggleFreeze()`: **removed**.
- The `if (this.frozen) { ... }` block inside `apply()`: **removed**.
- `onUp` no longer needs to reset `frozen = false`.

Replace with:

- New field `this.pinArmed = false` — set true on `pointerdown` if the
  clicked body is already pinned. Cleared whenever the drag ends or when
  movement passes the unpin threshold.
- New field `this.downX, this.downY` — pointer position on mousedown
  (screen coords).
- `onMove`: if `pinArmed && !this.active`... wait, no. Simpler: if
  `pinArmed`, check movement delta. If `hypot(dx, dy) > THRESHOLD_PX` (say
  6px), call `app.pinSystem.unpin(this.bodyID)`, clear `pinArmed`, and let
  the grab proceed normally. Until then, the body stays pinned and the
  spring from `grabber.apply()` wrestles against the pin's spring (which is
  stiffer, so the body doesn't move).
- `onKey` handler for `F`:
  - If grabber is active → `app.pinSystem.togglePin(this.bodyID)`.
  - Else → raycast from crosshair; if a pinned body is hit,
    `app.pinSystem.unpin(hitBodyID)`.
- `onUp` no longer clears `xfrc_applied` for pinned bodies — only for the
  body that was actively grabbed AND is NOT pinned. Otherwise the pin's
  per-frame spring gets clobbered for one frame.

### App integration

- `App.init()`: after `this.grabber = new Grabber(this)`, add
  `this.pinSystem = new PinSystem(this)`.
- `App.animate()`: call `this.pinSystem.apply()` just before
  `this.stepPhysics()` so pin forces land in the same frame as the physics
  step.
- `App.switchScene()`: call `this.pinSystem.clearAll()` before loading the
  new scene (pins reference old bodyIDs that won't exist after reload).

## Data flow per frame

```
animate() {
  updateCamTween + orbit + controls
  applyWind
  grabber.apply()        // spring forces from active drag
  pinSystem.apply()      // pin forces + velocity zeroing
  stepPhysics            // mj_step reads xfrc_applied & qvel
  syncMeshes
  ...
}
```

Order matters: pin forces must be written **after** grabber so the pin's
stiffer spring wins when a pinned body is also being grabbed (during the
"armed, below threshold" window).

## Edge cases

- **Grabbing a non-pinned body while another body is pinned.** No
  interaction. The pin keeps enforcing; the grab operates on a different
  body.
- **Pinning a body that's already pinned.** `togglePin` unpins it.
- **Pinning a freejoint body mid-flight.** `pin()` captures current
  world pose; the body stops instantly in place. Same as current freeze
  behavior.
- **Pinning the humanoid torso while its limbs are moving.** Torso's pin
  spring holds torso still; articulated limbs continue to swing via their
  joints. Exactly the desired ragdoll-hang-from-one-point behavior.
- **Scene reset (Reset button).** `resetSim` does `mj_resetData` which
  puts the model back to its keyframe. Pins referencing valid bodies would
  immediately snap those bodies back to the pin's captured pose, which is
  wrong after reset. Fix: `App.resetSim` calls `pinSystem.clearAll()`
  first.
- **Replay.** Replay already handles its own qpos/qvel playback. When
  replay starts, we should suspend pin enforcement (pin's spring would
  fight replay's direct qpos writes). Simplest: `PinSystem.apply()` early-
  returns if `this.app.replay?.active`. Pin state is preserved and resumes
  when replay exits.

## Files touched

- `src/pinSystem.js` — **new**, ~120 lines.
- `src/grabber.js` — remove `frozen`/`toggleFreeze`, add pin-armed drag
  logic, update F-key binding, update onUp to skip xfrc clear for pinned
  bodies. ~30 lines changed, 20 removed.
- `src/main.js` — import PinSystem, instantiate in init, call `apply()`
  in animate, call `clearAll()` in switchScene and resetSim. ~6 lines
  added.
- `src/main.js` HINT_PRESETS: update `grab` and `frozen` hint text.
  `frozen` preset is no longer meaningful in the drag-only sense — replace
  with hint about "F pin/unpin this part". Current `frozen` key becomes
  irrelevant; remove it. ~5 lines changed.

## Testing

Manual verification checklist:

1. Grab torso → press F → release mouse → torso hangs in air with limbs
   dangling.
2. Press F again on hovering the torso (no grab) → torso unpins and falls.
3. Grab right hand of hanging ragdoll → press F → release → now torso AND
   hand are both pinned. Rest of ragdoll hangs between them.
4. Grab a pinned body and click-drag across the screen. Small jitter
   mouse: pin holds. Drag past threshold: pin releases, body follows
   mouse.
5. Pin amogus project prop, hit Reset → scene resets cleanly, no pin
   leftover on phantom body.
6. Pin a limb, enter replay (`R`) → replay plays unimpeded → exit replay
   → limb is pinned at its post-replay position (acceptable) or at its
   pre-replay pin pose (ideal). Decision: pin holds its **original**
   captured pose; replay's qpos writes will fight it for one frame and
   then pin wins. Document this as acceptable.
7. Pin five different limbs simultaneously → each unpins independently
   via drag or F-hover-tap.

## Rollback

If the spring-based articulated pin feels wrong (e.g. limbs vibrate, pin
slips under heavy load), fall back to writing `data.qpos` for the entire
joint chain above the pinned body. This requires walking up the kinematic
tree which is more invasive; start with the spring approach and measure.
