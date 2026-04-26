# Projects polish pass — design

Status: brainstorming approved 2026-04-26
Branch: mujoco-portfolio
Owner: Rex
Predecessor specs:
- `2026-04-24-project-sprite-workflow-design.md` (catalog + DI builder pattern)
- `2026-04-24-project-abilities-and-hitboxes-design.md` (ability semantics, slot pool, hitbox overrides)

## 1. Why this exists

Nine discrete fixes and features against the project sprite system, batched
into one spec because they touch overlapping surfaces (`ProjectSystem`, the
ability registry, the catalog, controls panel, and the camera tween). Doing
them as nine separate specs would duplicate context-loading work and miss
the systemic chances — especially the **auto-derived hitbox** change in §10,
which lets us delete every `hitbox: { hx, hy, hz }` line in the catalog
once it's in.

Three of the nine are sprite rebuilds (Musicity, Oliver Wyman, Olympic
Way), three are ability changes (stab calibration + bleed, roomba, dune-worm
train), and three are systemic (label toggle, spawn-focus camera, hold-G
drag-rotate, hitbox auto-derive — the last is bundled with the ability
work). Several are small enough that they'd be one-liners in isolation but
need to be designed together so we don't ship three contradictory hitbox
strategies.

Out of scope: changing the catalog schema, refactoring `materials.js`,
touching the MuJoCo XML, mobile-specific UX (existing mobile shell
unchanged), CV/portfolio overlay.

## 2. Scope of changes

| # | Area                     | Change                                                        |
| - | ------------------------ | ------------------------------------------------------------- |
| 1 | ControlsPanel            | Add "Hide labels" checkbox (Effects section), localStorage    |
| 2 | App / camera             | New `frameSpawnCloseup(slot)` cinematic close-up tween        |
| 3 | `abilities/stab.js`      | Distance-calibrated lunge speed; proportional knockback       |
| 3a| `abilities/stab.js`      | One-shot red blood spray via `Sparks.burst()` on contact      |
| 4 | `catalog/amogus/*`       | Visor rebuilt as concentric partial-sphere shell              |
| 5 | App / OrbitControls      | Hold-G + drag = momentary orbit (yaw + pitch)                 |
| 6 | `catalog/musicity/*`     | Replace mesh: tiny apartment via `InstancedMesh` voxel grid + idle palette cycle |
| 7 | `catalog/oliver-wyman/*` | Replace mesh: extruded OW logo on backing plate; new `roomba` ability |
| 8 | `catalog/olympic-way/*`  | New `dune-worm` train ability (replaces `pulse`)              |
| 9 | `projects/system.js`     | Auto-derive `hitbox` from mesh `Box3` at spawn time           |
| 10| `projects/system.js`     | Sprite mesh raycast → open card (so labels-hidden sprites stay clickable) |

§3 unpacks each row.

## 3. Per-change specs

### 3.1 Hide-labels toggle

**Surface:** `ControlsPanel`, Effects section (alongside Trails / Sparks).
**Persistence:** `localStorage["rex-labels-hidden"] = "1" | "0"`. Read on
panel construction; default `"0"` (labels visible).

**Behaviour:** When checked, every `slot.labelEl` gets `display:none`.
`ProjectSystem.update()` already toggles `display` based on screen-space
visibility — we add a single guard at the top of the per-slot label loop:
if `this._labelsHidden` is true, set `display:none` and `continue`. New
spawns also respect the flag (set `display:none` at append time).

**API:** `ProjectSystem.setLabelsHidden(boolean)`. `ControlsPanel`
constructs the checkbox, reads localStorage, calls
`app.projectSystem.setLabelsHidden(initialValue)` after spawn, and on
toggle calls the setter and writes localStorage.

**Why a setter, not a public field:** the per-frame label update needs
the latest value without `ControlsPanel` reaching into `ProjectSystem`
internals.

### 3.2 Camera close-up on spawn

**Surface:** `App.frameSpawnCloseup(spawnPos, holdMs = 1500)`. Replaces
the call to `frameSpawn()` from the spawn flow (currently invoked from
the catalog action handler in `controlsPanel.js` — confirm at impl time).

**Tween shape:**
1. From current camera state.
2. To: a point ~1.4m from `spawnPos` on the camera's existing horizontal
   bearing, looking at `spawnPos`. Camera Y is `spawnPos.y + 0.4` so the
   sprite isn't shot directly from below.
3. Hold `holdMs` (default 1500ms).
4. Return to default `FRAMING.camPos`/`FRAMING.target` over 900ms (matches
   `frameCamera()`).

**User-interrupt handling:** Existing `camTween` already supports
`returnAt`. Reuse the pattern. If the user touches the orbit controls
during the close-up, drop the tween (existing OrbitControls behaviour will
fight it; we already detect this elsewhere — confirm and reuse).

**Why a new method, not modifying `frameSpawn`:** `frameSpawn` is the old
"include both humanoid and sprite in frame" tween. Keep it for any future
caller; the spawn flow gets a separate, more cinematic helper.

### 3.3 Amogus stab — calibrated lunge + bleed

**Speed calibration.** Replace the hard-coded `SPEED = 22.0` in
`stab.js` with:

```
const dist = sprite→torso distance (Three frame, magnitude only)
const TARGET_TIME = 0.5  // seconds to reach torso
const speed = Math.max(8, Math.min(22, dist / TARGET_TIME))
```

This makes near-spawns less violent and very far spawns hit cap. The
clamp prevents (a) zero-distance edge cases and (b) keeps the upper
bound at the previously-tuned ceiling so we don't get cosmic
ray-through-the-room behaviour.

**Knockback proportional.** Current `KNOCK_SPEED = 7.5` becomes:

```
const KNOCK_SPEED = 3.0 + (speed / 22) * 4.5   // → 3.0..7.5
```

Same upper bound as before for max-range stabs; gentle bumps for short
stabs. The torso angular velocity scaling (`* 6`) stays unchanged —
the spin is character, not impact magnitude.

**Why time-target instead of constant velocity.** Constant velocity makes
near-spawns feel weak (Amogus arrives in 30ms, looks like a teleport).
Constant time keeps the visual moment consistent regardless of distance.

#### 3.3a Blood spray

**Surface:** `Sparks.burst({ pos, color, count, ttl })`. We add this
public method to `Sparks` since the existing class only emits via
contact-spike auto-detection. The new method bypasses the spike check
and spawns particles directly.

**Method signature:**

```js
Sparks.burst({
  pos,        // THREE.Vector3 in scene-world frame
  color = "#c51111",
  count = 18,
  speedMin = 1.4,
  speedMax = 4.0,
  ttlMs = 700,
})
```

Internally: same hemisphere-bias direction as `_spawnHit`, but colour
overrides the warm-spark gradient, and `life` is set from `ttlMs / 1000`.
Particle count is ratio-tuned so an 18-count burst doesn't blow the
512-particle cap when chained with Sparks-from-contact.

**Trigger.** Inside `stab.js`'s contact branch (where `KNOCK_SPEED`
fires), after the qvel writes:

```js
const contactPos = new THREE.Vector3(c.pos[0], c.pos[2], -c.pos[1]);
app.sparks?.burst({ pos: contactPos, color: "#c51111", count: 18, ttlMs: 700 });
```

**Why force the burst even when Sparks is disabled.** The user toggles
"Sparks" to disable the noisy contact-driven sparks (debug visual). Blood
spray is *narrative* — it should fire on the stab regardless of the
Sparks toggle. So: `Sparks.burst()` runs even when `enabled === false`;
it sets `points.visible = true` on first burst and the live-particle
update path advances them regardless of `enabled`. Add a guard so the
contact-spike scan still respects `enabled`.

**Why piggyback on Sparks at all.** Avoids duplicating the SoA buffer +
Points geometry + GPU upload pipeline. One particle system, one render
pass, two trigger paths.

### 3.4 Amogus visor — concentric partial-sphere shell

**Locked design (visualised in the brainstorm mock,
`amogus-visor-mock.html`).**

The visor is a **partial sphere whose centre is concentric with the
helmet dome**, with **radius slightly larger than the body radius**.
Carved with phi/theta to expose only a band on the front face. Because
the visor's inner surface sits *outside* the body's outer surface, it
physically cannot intrude inward — the v1/v2 bug was caused by placing
the visor sphere's centre at the body centre, which made one half of
the carved strip extrude outward and the other half cut inward.

**Geometry (proportions.js values, D = 0.26):**

```
visorCentreY        = bodyDomeCentreY  // = bodyBaseY + bodyCylHeight
bandThetaStart      = 58° (from +Y north pole, in radians)
bandThetaLength     = 40°
bandPhiLength       = 120°
bandPhiStart        = π/2 - bandPhiLength/2     // centres carve on +Z
RIM_R               = bodyRadius + 0.020 * D
GLASS_R             = bodyRadius + 0.028 * D
HL_R                = bodyRadius + 0.035 * D
```

Three meshes, all concentric, all `side: THREE.DoubleSide`:
1. **Rim** — white `#ffffff`, slightly *wider* phi/theta carve than glass
   (extends 6° each side horizontally, 4° each side vertically) so a
   white border frames the cyan glass.
2. **Glass** — `#7fd6e6` (canon Among Us cyan), `emissive #1a4f5a`,
   `emissiveIntensity 0.45`, `roughness 0.18`, `metalness 0.45`.
3. **Highlight** — small white patch (~18% × 32% of glass carve), upper-left,
   `emissive #a9e8f4`, `transparent true`, `opacity 0.85`. Reads as visor
   glint.

Backpack, antenna, legs, body, rim band — **unchanged**. Delete the
existing visor block (`visorWidth`/`visorHeight`/`visorDepth`/`glassInset`
constants in `proportions.js`; the BoxGeometry frame + clipped sphere
glass + plane highlight in `build.js`). Replace with the three new meshes
and the seven new `proportions` constants.

**Why partial sphere over a separate primitive.** A `visor()` primitive
in `primitives.js` is over-fit — only Amogus has this shape and the maths
is six lines. Adding it as a primitive would require parameter-naming
that's hostile to other consumers ("which sphere centre?"). Keep it
inline in `amogus/build.js`.

### 3.5 Hold-G drag-rotate camera

**Behaviour:** Hold G → left-mouse-drag rotates the camera (full yaw +
pitch orbit around the current `controls.target`). Release G → left-mouse
returns to its default (currently null — the grab system uses pointer
events directly, not OrbitControls' LEFT button).

**Implementation:** Use OrbitControls' button mapping:

```js
// On G keydown:
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: null, RIGHT: THREE.MOUSE.ROTATE };

// On G keyup:
controls.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: THREE.MOUSE.ROTATE };
```

Two extra concerns:
- **Grab arbitration.** The grab system handles its own mousedown.
  When G is held we need to suppress grab. Cleanest: `Grabber` checks
  `app._gKeyHeld` (new public flag set by the keydown handler in `main.js`)
  and bails early in its mousedown handler.
- **Input field guard.** Same pattern as the existing arrow-key handlers
  in `main.js` — if the focused element is `input` or `textarea`, don't
  treat G as the modifier (so users can still type "g" in the GUI).

**Why momentary, not modal.** The user's exact phrasing was "hold g and
click to grab; i.e. changing camera view with a dragging function". A
modal toggle requires a state indicator and a second keypress to exit;
momentary matches Blender's middle-mouse muscle memory and avoids the
"why isn't grab working" footgun.

### 3.6 Musicity → tiny apartment voxel grid

**Mesh strategy:** A 10 × 10 × 10 voxel grid built with three
`THREE.InstancedMesh` instances — one per material type:

| `type` | Material | Colour (palette[0])             |
| ------ | -------- | ------------------------------- |
| 1      | wall     | `palette.wall`                  |
| 2      | window   | `palette.window` (transparent)  |
| 3      | balcony  | `palette.balcony`               |

**`generateApartment()`:** Returns a `Uint8Array(10*10*10)` where each
cell is `0` (empty), `1`, `2`, or `3`. Logic:
- Floors at y=0, 3, 6, 9 (4 floors).
- Walls on the perimeter of each floor.
- One door cut on the ground floor (front face, middle).
- Each non-ground floor has 2 windows on each cardinal face.
- A balcony tile (type 3) extrudes one voxel forward from the front face,
  middle of each non-ground floor.

The exact voxel layout lives in a function — not a static array —
because the palette cycle (§ below) needs to re-bind colours to each
`InstancedMesh`'s `material.color`. Geometry stays unchanged across
palette changes; only material colours animate.

**Voxel size:** `voxelSize = 0.06` MJ-units. Total apartment footprint
0.6 × 0.6 × 0.6 MJ-units, height 0.6. This is much smaller than the
current Musicity sprite (1.6×D = 0.42 tall city blocks) but reads as a
denser, more architectural object. Grounded with a `footprintOffset` set
to push the apartment's base flush with the slot floor.

**Per-instance matrix:** For each cell where `voxels[idx] === type`,
compute a `Matrix4` with `setPosition(x*voxelSize, y*voxelSize,
z*voxelSize)` (centred so the apartment sits at the slot's local origin)
and `mesh.setMatrixAt(instanceIndex++, matrix)`. After filling, set
`mesh.instanceMatrix.needsUpdate = true` and `mesh.count = instanceIndex`.

**Palette cycle.** Five palettes:

```js
const PALETTES = [
  { wall: "#d4a05a", window: "#f3d27a", balcony: "#8b6a3a" }, // current Musicity warm
  { wall: "#5a7d8c", window: "#a8d4e0", balcony: "#2c4148" }, // teal
  { wall: "#c97064", window: "#f4c5b8", balcony: "#7a3429" }, // terracotta
  { wall: "#7e6b9e", window: "#cdb8e0", balcony: "#3d2e54" }, // mauve
  { wall: "#6b8e5a", window: "#c5d9b0", balcony: "#3a4d2c" }, // moss
];
```

**Cycle timing:** 2.5s per palette, smooth crossfade between adjacent
palettes. Lives in the `chord` ability? **No** — the cycle is the
sprite's idle animation, runs always once mounted. Implementation:
the def includes an `onSpawn(slot)` hook (new optional field — see
catalog schema impact below) that registers a per-frame tick into
`ProjectSystem._activeAbilities` (same lifecycle as ability ticks but
with no TTL and a `cancel` that removes it on park).

The existing `chord` ability stays intact for the "Play!" button — it
already does a chord-flash on the materials; with the cycle running, we
let `chord` snap to its highlight colour and the cycle resumes after
the chord ends (clean handoff: `chord` records the cycle's current
phase, plays the highlight, then writes the phase back).

**Why InstancedMesh.** 4-floor apartment has ~250 wall voxels alone;
3 floor mesh sets = 750+ Mesh objects per sprite is a draw-call cliff.
InstancedMesh = 3 draw calls regardless of voxel count.

**Why a new optional `onSpawn` field, not piggybacking on an existing
ability.** Idle animation ≠ ability — abilities are user-fired; the cycle
is automatic. Adding `onSpawn(slot)` to the def schema generalises:
future projects could use it for hover bobs, idle particle puffs, etc.
The existing validator in `index.js` should accept (and ignore) defs
without it.

### 3.7 Oliver Wyman → extruded logo + roomba

**Logo geometry:** `THREE.ExtrudeGeometry` from a manually-traced 2D
`THREE.Shape` of the OW infinity-style mark. Trace coordinates derived
from the SVG path of the logo image the user supplied (or the public
brand asset). Extrude depth `0.04` MJ-units. Material:
`MeshStandardMaterial({ color: "#002554" })` (OW navy).

**Backing plate:** Thin white `BoxGeometry`, ~`1.4*D × 1.0*D × 0.05*D`,
positioned behind the extruded logo. The plate gives the logo something
to read against from behind / oblique angles.

**Stand:** Short cylinder pedestal at the base — keep the current
`pedestalR/pedestalH` values from `proportions.js` (the running track and
scatter dots get deleted; pedestal stays as the standee base).

**Tracing the shape.** The OW logo is two lozenges meeting at a centre —
roughly an italic "OW" infinity. We trace it in code with a few
`moveTo`/`lineTo`/`bezierCurveTo` calls. Implementation may iterate to
match the brand mark; the sketch goes in `oliver-wyman/build.js` as a
local helper (`buildOWLogoShape(THREE)`).

**Why ExtrudeGeometry over an SVGLoader fetch.** SVGLoader requires
shipping or fetching an SVG file. Hard-coded shape commands keep the
catalog 100% offline-buildable, matches the rest of the catalog's "all
geometry in build.js" pattern, and the OW logo is simple enough to trace
by hand.

#### 3.7a Roomba ability

**Replaces:** `sprint` (delete `src/projects/abilities/sprint.js`; remove
its export from `abilities/index.js`).

**File:** `src/projects/abilities/roomba.js`.

**Behaviour:** 2.5s ability duration. The sprite drives around the
playground floor at ~1.5 m/s (MJ-x/y plane), changing heading every
~400ms with a sharp turn (skid). Sprite stays grounded — we only write
linear x/y velocities, leaving z to gravity, and a small angular
z-velocity for the skid spin.

**Implementation:**
- On fire, capture `bodyID` and `dofAdr`.
- Internal state: `currentHeading: rad`, `targetHeading: rad`,
  `headingChangeAtMs`, `elapsed`.
- Per tick:
  - If `elapsed - headingChangeAtMs > 400ms`, pick a new
    `targetHeading = Math.random() * 2π`, set `headingChangeAtMs = elapsed`.
  - Lerp `currentHeading` toward `targetHeading` at `0.15` per frame
    (smooth turn, not snap).
  - Write `qvel[dofAdr+0] = cos(currentHeading) * 1.5`,
    `qvel[dofAdr+1] = sin(currentHeading) * 1.5`.
  - Add a tiny upward kick on heading-change events: `qvel[dofAdr+2] = 0.4`
    once per change (the "skid" hop).
  - `qvel[dofAdr+5] = (currentHeading - prevHeading) / dtSec` — angular yaw
    matches the turn.
- After 2.5s, return false. No special cleanup; physics resumes.

**Grab interaction:** Like other ability ticks that write qvel —
if `grabber.active && grabber.bodyID === slot.bodyID`, skip the qvel
writes for that frame (sprite's being grabbed; don't fight the spring).

### 3.8 Olympic Way → dune-worm train

**Replaces:** `pulse` ability (keep the file — `pulse` may be reused
elsewhere; just stop wiring it to Olympic Way's def).

**File:** `src/projects/abilities/dune-worm.js`.

**Train mesh — `TrainEntity` (Group):**
- **Chassis** — `BoxGeometry(0.4, 0.3, 1.6)` (W × H × L). Material: TfL
  red `#dc241f`.
- **Boiler** — `CylinderGeometry(0.18, 0.18, 1.0, 24)` rotated to lie
  along Z, positioned at front of chassis. Material: dark grey `#3a3a3a`.
- **Front cap** — `CapsuleGeometry(0.18, 0.05, 8, 16)` rotated and
  positioned at the front tip of the boiler. Same dark grey.
- **Cabin** — `BoxGeometry(0.4, 0.4, 0.5)` at rear of chassis. Window
  holes cut via `three-bvh-csg` (subtract two small BoxGeometries on each
  side). Material: TfL red.
- **Wheels** — 6× `CylinderGeometry(0.12, 0.12, 0.06, 16)`, rotated 90°
  on the Z-axis (so they sit like wheels). 3 per side, evenly spaced
  along the chassis length. Material: black `#0a0a0a`.

**Dune-worm motion (3.5s total):**
- t=0 → 0.5s: train rises from `y = -1.0` (subterranean) to `y = +0.4`
  at scene edge `(x = -4, z = 0)` (or any edge — randomised at fire
  time). Pitch: nose-up 60° at start, rotating to level by end of phase.
  Position lerp uses an ease-out so the emergence has a "burst" feel.
- t=0.5s → 3.0s: parabolic arc from emergence point through the
  playground origin to opposite edge `(x = +4, z = 0)`. Peak height
  `y = +1.6`. Train's pitch follows the velocity vector (nose tracks
  motion direction).
- t=3.0s → 3.5s: dive nose-down, sinks back below `y = -1.0` at
  opposite edge. Same pitch logic as emergence, mirrored.
- After 3.5s: dispose mesh, materials, geometry. Cancel cleanly.

**Trajectory parented to scene root** (not slot.group) so the train
moves through the world independently of the Olympic Way roundel
sprite. Same pattern as `dispatch.js`.

**Knockback on contact:** Per-frame, walk `data.contact` array. Any
contact between a train geom (we have no MuJoCo bodies for the train —
it's pure Three.js scratch mesh) and a humanoid/sprite geom is
impossible to detect via `data.contact`. Workaround: every frame,
compute the train's bounding box and intersect with each tracked
body's world position. On hit, write a strong qvel impulse to that
body's freejoint:

```
qvel[dofAdr+0] = trainVelocity.x * 0.6
qvel[dofAdr+1] = trainVelocity.y * 0.6
qvel[dofAdr+2] = 6.0  // upward toss
qvel[dofAdr+3..5] = random tumble
```

Hit cooldown: 200ms per body so a body inside the bounding box doesn't
get punched every frame.

**Dependency:** Add `three-bvh-csg` to the importmap in `index.html`.
The library resolves cleanly via `esm.sh`:

```
"three-bvh-csg": "https://esm.sh/three-bvh-csg@0.0.17"
```

Pin the version. Used only inside `dune-worm.js` for the cabin window
cuts; the cabin geometry is computed once at module load and cached, so
the CSG cost is paid once per session, not per fire.

### 3.9 Auto-derived hitbox

**Today:** Each `def` may include `hitbox: { hx, hy, hz }` and
`footprintOffset: number`. Both are hand-tuned per project (see Amogus
def's comment block — the calculation is documented but manual). Drift
risk: any mesh tweak invalidates the hitbox values.

**Replace with:** `ProjectSystem._deriveHitbox(meshGroup)` runs once at
spawn, computes:

```js
const box = new THREE.Box3().setFromObject(meshGroup);
const size = box.getSize(new THREE.Vector3());
const halfExtents = { hx: size.x/2, hy: size.z/2, hz: size.y/2 };
const footprintOffset = -box.min.y;  // mesh feet sit at y=0 after offset
```

Note the axis swizzle: MuJoCo's `geom_size[0,1,2]` is (x, y, z) in
MJ frame, where MJ +z is up. Three's box uses Three frame where +y is
up. The slot loader maps MJ-z → Three-y. So Three's `size.y` becomes
MJ's `hz`, Three's `size.z` becomes MJ's `hy`.

**Override mechanism:** A def may still supply explicit `hitbox` /
`footprintOffset` values. If present, they win. So the migration is
non-breaking: existing values stay until we delete them per-project.

**Cleanup pass:** After the new derive code is in and verified, delete
the explicit `hitbox` / `footprintOffset` lines from all 11 catalog
defs. Sprites that still need a tighter hitbox than the bounding box
(rare — usually a long backpack we don't want in the collider) keep
their explicit override.

**Why now:** Republic, Amogus, Olympic Way and Musicity all show signs
of hitbox drift in the user's QA — labels floating above ground because
`footprintOffset` was tuned against an older mesh. Auto-derive fixes the
cohort; manual fixes would just kick the can.

### 3.10 Sprite mesh raycast → open card

**Why:** With label hiding (§3.1) on, the label pills disappear — but
the sprite mesh has no click handler, so users can't open the card
without un-hiding labels.

**Add:** A click hit-test in the existing pointer-event pipeline.
`HoverHighlight` already raycasts against grabbables and tracks the
hovered body — we extend the existing left-click handler (or add one in
`ProjectSystem`) to:
1. On `mousedown` (left button), if no grab is active and no other UI
   intercepts, raycast against `app.getGrabbables()`.
2. If hit `bodyID` matches any `slot.bodyID` with `slot.project`, open
   that slot's card.
3. Don't suppress grab — clicking the sprite should *both* open the card
   and start grab. If that conflicts in practice, gate card-open behind
   "click without drag" (mouseup within 200ms of mousedown, no movement
   > 4px).

**Edge:** Hide-labels mode + click sprite = card opens. With labels
visible, label-click and sprite-click both open the card; redundant but
harmless.

**Why route through `ProjectSystem`, not `HoverHighlight`:**
HoverHighlight is read-only (paints a colour). Card open is a side
effect on `ProjectSystem`. Cleaner ownership.

## 4. Touched files

| File                                          | Change                                              |
| --------------------------------------------- | --------------------------------------------------- |
| `index.html`                                  | Add `three-bvh-csg` to importmap                    |
| `src/main.js`                                 | New `frameSpawnCloseup`; G-key handling; replace `frameSpawn` call |
| `src/controlsPanel.js`                        | Hide-labels checkbox in Effects section             |
| `src/grabber.js`                              | Bail early when `app._gKeyHeld`                     |
| `src/sparks.js`                               | New public `burst(opts)` method; `enabled` semantics |
| `src/projects/system.js`                      | `_deriveHitbox`, `setLabelsHidden`, `onSpawn` hook, sprite raycast click |
| `src/projects/abilities/index.js`             | Drop `sprint`; add `roomba`, `dune-worm`            |
| `src/projects/abilities/sprint.js`            | DELETE                                              |
| `src/projects/abilities/pulse.js`             | unchanged (just unused by Olympic Way)              |
| `src/projects/abilities/roomba.js`            | NEW                                                 |
| `src/projects/abilities/dune-worm.js`         | NEW                                                 |
| `src/projects/abilities/stab.js`              | Distance-calibrated speed + proportional knockback + blood spray trigger |
| `src/projects/catalog/amogus/proportions.js`  | Replace visor constants                             |
| `src/projects/catalog/amogus/build.js`        | Rebuild visor as concentric shell                   |
| `src/projects/catalog/amogus/index.js`        | Drop explicit `hitbox`/`footprintOffset` (auto-derive) |
| `src/projects/catalog/musicity/proportions.js`| Replace with apartment-grid + palette constants     |
| `src/projects/catalog/musicity/build.js`      | Replace with `generateApartment()` + InstancedMesh + onSpawn cycle |
| `src/projects/catalog/musicity/index.js`      | Add `onSpawn` hook; drop `footprintOffset`          |
| `src/projects/catalog/oliver-wyman/proportions.js`| Replace track/dots with logo + plate constants  |
| `src/projects/catalog/oliver-wyman/build.js`  | Replace track + scatter with extruded logo + plate  |
| `src/projects/catalog/oliver-wyman/index.js`  | `ability: "roomba"`; drop `footprintOffset`         |
| `src/projects/catalog/olympic-way/index.js`   | `ability: "dune-worm"`; drop `footprintOffset`      |

Per-project hitbox/footprintOffset deletions in §3.9 cleanup pass span
all 11 catalog `index.js` files; only the four above are listed because
they're already touched for other reasons.

## 5. Acceptance criteria

1. **Hide-labels:** toggling the checkbox in Controls > Effects hides
   all visible label pills within one frame; reload preserves state.
2. **Spawn close-up:** spawning any project from Controls > Projects
   triggers a 700ms tween into a close-up frame, holds 1.5s, returns
   to humanoid framing over 900ms. User-initiated camera input cancels
   the auto-return.
3. **Stab calibration:** firing stab from spawn distance ≈ 1.5m takes
   ~0.5s sprite→torso. Firing from 5m+ caps at 22 m/s. Torso flies
   gentler at short range, full pinwheel at long range.
4. **Blood spray:** every successful contact (humanoid hit) spawns 18
   red `#c51111` particles at the contact point with a 700ms TTL. Fires
   regardless of Sparks toggle state.
5. **Visor:** Amogus visor reads as a white-rimmed cyan band on the
   front of the helmet from every camera angle — never cuts through the
   body, never appears as a flat plate stuck on, never reveals interior
   geometry.
6. **Hold-G drag-rotate:** holding G while left-dragging orbits the
   camera around `controls.target`. Releasing G restores grab as the
   default left-click action. Pressing G while typing in any input does
   nothing.
7. **Musicity:** sprite is a 3D voxel apartment, not 3 city blocks.
   Wall/window/balcony are visually distinct (3 colours). Palette
   crossfades smoothly every 2.5s through 5 palettes. "Play!" button
   still fires `chord` and the palette cycle resumes after.
8. **Oliver Wyman:** sprite is a navy extruded OW logo on a white
   backing plate atop a pedestal. "Sprint!" button is renamed
   "Roomba!" (or "Skid!" — Rex's call) and triggers the new roomba
   behaviour: 2.5s of skidding around the floor, smooth turns, sprite
   stays grounded.
9. **Olympic Way:** sprite (roundel + plinth) unchanged. "Pulse!"
   button renamed "Summon Train!"; firing it spawns a train that
   bursts up from one scene edge, arcs through the playground, dives
   back into the ground at the opposite edge, knocking down anything in
   its path. Train despawns cleanly within 3.5s.
10. **Hitbox:** every spawned project sits flush on the floor at rest
    (no float, no clip). Grab raycasts against project sprites land on
    the visible silhouette, not above/below it.
11. **Sprite click → card:** with labels hidden, clicking any project
    sprite opens its card. With labels visible, both label and sprite
    clicks open the card.

## 6. Risks and unknowns

- **`three-bvh-csg` startup cost.** First import is ~80kb gzipped from
  esm.sh. Mitigated by static module load + cached cabin geometry. If
  startup is unacceptable, fall back to a non-CSG cabin (visible window
  *holes* via deeply-recessed `MeshBasicMaterial({color: black})` boxes
  inset into the cabin face). Decided at impl time if we hit a wall.
- **Train hit detection without MuJoCo collision geoms.** Bounding-box
  intersection vs body world-position is approximate. Acceptable because
  the train arcs at high speed — exact contact resolution isn't expected.
  If "passes through humanoid without hit" QA happens, expand the test
  to bounding-box vs body bounding-box.
- **Palette crossfade and `chord` collision.** Both mutate
  `material.color`. The chord ability sets a flash colour, then restores;
  if the cycle writes between flash-set and flash-restore, the restore
  picks the wrong base colour. Mitigation: `chord` reads the cycle's
  current colour at flash time and uses *that* as the restore target.
  Spec'd in §3.6.
- **Auto-hitbox vs grab raycast.** The grab system raycasts against the
  Three.js mesh, not the MuJoCo collision geom. Auto-derive aligns the
  collision hitbox to the mesh bounding box, so they should agree
  better than they do today. If a sprite has a flying part (e.g. an
  antenna) the box gets bigger than the silhouette people expect; that's
  the case for explicit overrides, not a reason to abandon auto-derive.
- **Hold-G + arrow-key pan conflict.** Existing arrow-key handlers in
  `main.js` consume `ArrowLeft/Right/Up/Down` for pan. G isn't an arrow,
  so they coexist. But the input-field guard on G needs to mirror the
  arrow-key guard exactly — copy-paste, don't reinvent.

## 7. Out of scope (deferred)

- Hitbox visualisation toggle (would help QA but isn't user-facing).
- Sprite click suppression of grab (we currently allow both — revisit if
  it feels weird in practice).
- Animated label appearance/disappearance when toggling hide.
- Train sound effect.
- Blood pool/decal on the floor (one-shot pop only — no linger).
- Voxel apartment door interaction or interior visibility.
- OW logo accuracy beyond "reads as the OW mark from 3m away".
