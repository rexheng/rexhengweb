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
the systemic chances — especially the **auto-derived hitbox** change in §3.9,
which lets us delete every `hitbox: { hx, hy, hz }` line in the catalog
once it's in.

Three of the nine are sprite rebuilds (Musicity, Oliver Wyman, Olympic
Way), three are ability changes (stab calibration + bleed, roomba,
dune-worm train), and three are systemic (label toggle, spawn-focus
camera, hold-G drag-rotate). Hitbox auto-derive is the cross-cutting
tenth. Several are small enough that they'd be one-liners in isolation
but need to be designed together so we don't ship three contradictory
hitbox strategies.

Out of scope: changing the catalog schema beyond an optional `onSpawn`,
refactoring `materials.js`, touching the MuJoCo XML, mobile-specific UX
(existing mobile shell unchanged), CV/portfolio overlay.

## 2. Scope of changes

| # | Area                     | Change                                                        |
| - | ------------------------ | ------------------------------------------------------------- |
| 1 | ControlsPanel            | Add "Hide labels" checkbox (Effects section), localStorage    |
| 2 | App / camera             | New `frameSpawnCloseup(slot)` cinematic close-up tween        |
| 3 | `abilities/stab.js`      | Distance-calibrated lunge speed; proportional knockback       |
| 3a| `abilities/stab.js`      | One-shot red blood spray via `Sparks.burst()` on contact      |
| 4 | `catalog/amogus/*`       | Replace procedural body with FBX-loaded crewmate (local file) |
| 5 | App / OrbitControls      | Hold-G + drag = momentary orbit (yaw + pitch)                 |
| 6 | `catalog/musicity/*`     | Replace mesh: tiny apartment via `InstancedMesh` voxel grid + idle palette cycle |
| 7 | `catalog/oliver-wyman/*` | Replace mesh: extruded OW logo on backing plate; new `roomba` ability |
| 8 | `catalog/olympic-way/*`  | New `dune-worm` train ability (replaces `pulse`); train mesh from Sketchfab Bombardier S Stock FBX |
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
the call to `frameSpawn()` from the spawn flow. The spawn flow's catalog
action handler lives in `src/controlsPanel.js` (the project-row click
handler that calls `app.projectSystem.spawn(id)` then triggers the
camera move via `showSpawnToast` integration). Replace that
`frameSpawn` call with `frameSpawnCloseup`. If the call site moves to
`ProjectSystem.spawn()` instead, route through `app.frameSpawnCloseup`.

**Tween shape:**
1. **Inbound** — 700ms ease from current camera state to close-up pose.
2. **Pose** — a point `1.4m` from `spawnPos` on the camera's existing
   horizontal bearing, looking at `spawnPos`. Camera Y is
   `spawnPos.y + 0.4` so the sprite isn't shot directly from below.
3. **Hold** — `holdMs` (default 1500ms) at the close-up pose.
4. **Return** — 900ms ease back to default `FRAMING.camPos`/`FRAMING.target`
   (matches `frameCamera()`).

Total nominal duration: 700 + 1500 + 900 = 3100ms.

**User-interrupt handling.** Existing `camTween` already supports
`returnAt`. The pattern at `src/main.js:71-137` records
`prev._userInterrupted` if user input arrives during the return phase
and discards the tween. Detection happens via OrbitControls' `start`
event, which fires when the user touches mouse/touch — wire a one-shot
listener at `frameSpawnCloseup` start that sets
`this.camTween._userInterrupted = true`. If the listener fires during
the **inbound** or **hold** phase, snap-cancel the tween immediately
(set `this.camTween = null`) — the user clearly wants control back,
don't fight them.

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

**Upward bias scaling.** Current code at `stab.js:60` adds `+ 2.5` to the
lunge's z-velocity (upward bias so Amogus arcs slightly rather than
ground-skidding). Bias must scale with `speed`, otherwise short-range
stabs get a proportionally enormous lift. New formula:

```
const upwardBias = 2.5 * (speed / 22)   // → 0.91..2.5 over the speed range
data.qvel[dofAdr + 2] = mjDz * speed + upwardBias
```

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

**Sparks visibility model — burst vs. setEnabled.** Today's
`Sparks.setEnabled(false)` (`src/sparks.js:53-61`) is destructive: it
zeroes `age`/`life`, sets `points.visible = false`, and resets the draw
range. That's appropriate for the "Sparks toggle" UX intent (debug
visual off → all visuals stop). Blood spray is narrative and must fire
even when the toggle is off.

**Resolution:** `burst()` runs unconditionally. It writes particles into
the SoA buffer and sets `points.visible = true`. The live-particle
update path in `update()` advances them regardless of `enabled`. The
**contact-spike scan** at the bottom of `update()` continues to respect
`enabled`. **Documented limitation:** if the user toggles Sparks off
*while a blood burst is in flight*, those particles are wiped (because
`setEnabled(false)` zeroes the SoA arrays). This is acceptable — toggling
off mid-stab is rare, and segregating the burst into a separate buffer
would double the particle pipeline for a corner case. Filed as a known
limitation in §6.

**Why piggyback on Sparks at all.** Avoids duplicating the SoA buffer +
Points geometry + GPU upload pipeline. One particle system, one render
pass, two trigger paths.

### 3.4 Amogus — FBX-loaded crewmate

**Decision:** Replace the entire procedural Amogus mesh (body, visor,
backpack, antenna, legs) with a loaded artist FBX. The procedural
visor saga (v1/v2 cut through the body, v3 mocked the canonical
concentric shell) is moot — the FBX has its own visor and we use the
artist's silhouette wholesale. See `tasks/lessons.md` 2026-04-26 entry
for context on why the procedural detour was the wrong default.

**Source asset.** Local file at
`C:\Users\Rex\Downloads\among-us-3D-model-cgian\among-us-3D-model-cgian\among-us-3D-model-cgian.fbx`
(47kb, includes textures via `among-us-3D-model-cgian.mtl`). At impl
time, copy the FBX (and any sibling texture files the loader needs)
into `assets/models/amogus/` so it ships with the deploy.

**Loader.** `three/addons/loaders/FBXLoader.js`. Loaded via the
`__assets__` namespace in the importmap (already imports
`three/addons/`). No new dependency, no new importmap entry.

**Preload + cache pattern (see §3.11).** Load the FBX once at
`App.init()` boot, cache the resulting `THREE.Group` in
`app.modelCache.amogus`. Per-spawn, `buildMesh()` returns a deep
clone of the cached scene via Three's built-in `.clone(true)`
(no skeleton in this asset; `SkeletonUtils` not needed).

**Scale normalisation.** The Sketchfab/CGIan model exports at an
arbitrary scale. The catalog def gains a new field `targetHeight: 0.6`
(MJ-units). On load, compute `bbox.height = box.getSize().y`, then
`scale = targetHeight / bbox.height`, and apply `scene.scale.setScalar(scale)`
to the cached scene before storing it. After scale, the cloned scene
is the correct size in every spawn — no per-spawn scale work.

**Material fidelity.** FBXLoader maps the file's materials to
`MeshPhongMaterial` by default. The CGIan model is flat-coloured (red
body, cyan visor, dark grey legs/pack) — no PBR maps to lose. After
load, walk the scene and confirm material colours read correctly
against the playground lighting; if any mesh comes through with a
muddy default, override its material in the post-load pass:

```js
loadedScene.traverse((o) => {
  if (!o.isMesh) return;
  o.castShadow = true;
  o.receiveShadow = true;
  // Optional: override specific material if FBX import muddies it.
  // e.g. if the visor reads grey instead of cyan:
  //   if (o.name === "visor") o.material.color.set("#7fd6e6");
});
```

The optional override only fires if visual QA reveals a mismatch.

**Hitbox.** `def.hitbox` and `def.footprintOffset` are NOT supplied
in the def — the auto-derive path in §3.9 reads the loaded scene's
`Box3` and produces the correct collider half-extents. This is the
**required** path for FBX-loaded sprites; manual values would drift
the moment the artist asset is updated.

**Why this works.** The visor is part of the FBX; no need for the
concentric-shell hack. The body, backpack, antenna, legs are the
artist's silhouette — measurably better than the procedural version.
The DI builder pattern stays intact: `build.js` returns
`app.modelCache.amogus.clone(true)` instead of building primitives.

**Why not GLB.** Per `tasks/lessons.md` 2026-04-26 (second lesson):
the FBX is in hand, materials are flat, payload is 47kb. Conversion
to GLB is pedantry that solves no concrete problem. Use the FBX.

**Why keep the procedural fallback in version control.** The
checkpoint commit (`fbba32c`, tag `spec/projects-polish-procedural-checkpoint`)
preserves the procedural-only spec. If the FBX integration produces a
blocker (say the model uses Maya-specific FBX features that
FBXLoader can't parse), revert via:

```
git checkout spec/projects-polish-procedural-checkpoint -- docs/superpowers/specs/2026-04-26-projects-polish-pass-design.md
```

Brainstorm mock at `amogus-visor-mock.html` is preserved as a
historical reference for the procedural visor design that was
short-circuited by the FBX swap.

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
sprite's idle animation, runs always once mounted.

**Implementation.** The def includes an `onSpawn(slot, ctx)` hook (new
optional field — see catalog schema impact below). On spawn, the hook
constructs a tick object:

```js
{
  _slotBodyID: slot.bodyID,    // required so _park can cancel it
  _isIdle: true,               // flag — onSceneLoaded must NOT cancel idle ticks unconditionally
  tick(dtMs) {
    /* advance phase, write colours into InstancedMesh materials, return true */
  },
  cancel() { /* nothing — colours don't need restoring */ },
}
```

`ProjectSystem.spawn()` pushes the tick into `_activeAbilities` after
the mesh is mounted. `_park(slot)` already filters by `_slotBodyID`
(`src/projects/system.js:225-233`) — the cycle is cancelled when the
slot is parked, identical to ability ticks.

**Scene-reload cancellation.** `onSceneLoaded()` (`system.js:60-65`)
currently calls `a.cancel?.()` for *every* active ability and clears
the array. Idle ticks must follow the same path — they're cancelled,
then re-registered when `spawn()` re-mounts the slot's project.
**Important:** the spawn flow doesn't auto-re-spawn projects on scene
reload (it parks all slots and the user re-spawns from controls). So
idle ticks naturally die with their sprites; no special handoff
needed. Document this in code so the next reader doesn't bolt on an
"idle re-register" path that isn't required.

**Chord handoff.** The existing `chord` ability flashes material
colours then restores. With the cycle running, the restore target
must be the cycle's *current* colour, not a stale module-level
constant. Implementation: at flash time, `chord` reads the current
`material.color.getHex()` of each affected InstancedMesh material,
flashes, then restores from the captured hex. **Single mechanism** —
colour-snapshot at flash-time, not phase-write-back. (The earlier
"phase write-back" framing was wrong; ignore it.)

**Why InstancedMesh.** 4-floor apartment has ~250 wall voxels alone;
3 floor mesh sets = 750+ Mesh objects per sprite is a draw-call cliff.
InstancedMesh = 3 draw calls regardless of voxel count.

**Why a new optional `onSpawn` field, not piggybacking on an existing
ability.** Idle animation ≠ ability — abilities are user-fired; the cycle
is automatic. Adding `onSpawn(slot)` to the def schema generalises:
future projects could use it for hover bobs, idle particle puffs, etc.

**Catalog validator update.** `src/projects/index.js:42-70` validates each
def. Add an entry that, if `def.onSpawn` is present, asserts it's a
function. If absent, no-op. Defs without `onSpawn` continue to validate.

### 3.7 Oliver Wyman → extruded logo + roomba

**Logo geometry:** `THREE.ExtrudeGeometry` from a hand-traced 2D
`THREE.Shape`. Tracing strategy: **hand-trace by eye in code** — the OW
mark is two stylised "V" forms meeting at a centre point, roughly an
italic infinity. We pick 8 control points and connect with a mix of
`lineTo` and `bezierCurveTo`. The exact path goes in
`oliver-wyman/build.js` as a local helper `buildOWLogoShape(THREE)`:

```js
function buildOWLogoShape(THREE) {
  const s = new THREE.Shape();
  // Approximation — refine to match brand mark in build phase.
  // Width 1.0, height 0.6, centred at origin in the X/Y plane.
  s.moveTo(-0.50,  0.30);
  s.lineTo(-0.20, -0.30);
  s.lineTo( 0.00,  0.05);
  s.lineTo( 0.20, -0.30);
  s.lineTo( 0.50,  0.30);
  s.lineTo( 0.30,  0.30);
  s.lineTo( 0.10, -0.05);
  s.lineTo(-0.10, -0.05);
  s.lineTo(-0.30,  0.30);
  s.closePath();
  return s;
}
```

Coordinates are sketch-quality; refine during execute phase to match
the actual brand mark. Acceptance criterion (§5.8) only requires "reads
as the OW mark from 3m away" — no pixel-perfect match needed.

**Extrude:** depth `0.04` MJ-units. Material:
`MeshStandardMaterial({ color: "#002554" })` (OW navy).

**Backing plate:** Thin white `BoxGeometry`, ~`1.4*D × 1.0*D × 0.05*D`,
positioned behind the extruded logo. The plate gives the logo something
to read against from behind / oblique angles.

**Stand:** Short cylinder pedestal at the base — keep the current
`pedestalR/pedestalH` values from `proportions.js` (the running track and
scatter dots get deleted; pedestal stays as the standee base).

**Why ExtrudeGeometry over an SVGLoader fetch.** SVGLoader requires
shipping or fetching an SVG file. Hard-coded shape commands keep the
catalog 100% offline-buildable, matches the rest of the catalog's "all
geometry in build.js" pattern, and the OW logo is simple enough to trace
by hand.

#### 3.7a Roomba ability

**Replaces:** `sprint` (delete `src/projects/abilities/sprint.js`; remove
its export from `abilities/index.js`). No other catalog def references
`"sprint"` — Oliver Wyman is the sole consumer (verified against
`src/projects/catalog/*/index.js`).

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

**Train mesh — Bombardier S Stock FBX.**

**Decision:** Replace the procedural `TrainEntity` (chassis + boiler +
CSG cabin + wheels) with a loaded artist FBX of the actual current
Underground rolling stock. The procedural version would have looked
like a child's drawing of a steam locomotive; the artist asset is the
real silhouette. Same reasoning as §3.4 — when a real model exists,
use it.

**Source asset.** Sketchfab "Bombardier S Stock London Underground" by
timblewee
(https://sketchfab.com/3d-models/bombardier-s-stock-london-underground-a6718eff2dc843c48fd54376b4c70b06).
Download the FBX export. Verify the licence on the page (CC-BY at
time of writing; attribution must go in the credits surface — see §6
Risks). Save as `assets/models/bombardier-s-stock.fbx`.

**Loader.** `FBXLoader` (same import as §3.4). Preloaded once at
`App.init()`, cached as `app.modelCache.bombardier`. Per fire,
`dune-worm.js` clones the cached scene via `.clone(true)` instead of
constructing primitives.

**Scale normalisation.** Catalog-style constant inside `dune-worm.js`:
`TARGET_LENGTH = 3.0` MJ-units. Compute the loaded scene's bbox
length, scale uniformly to fit. Apply once before caching, like §3.4.
A real S Stock train is ~130m long; without scaling, the bbox would
extend across the entire scene and trigger constant phantom
knockback.

**Dependency removed.** `three-bvh-csg` is NOT added to the importmap.
The procedural cabin's window cuts were the only consumer; the FBX
already has window cutouts modelled. Drop the entry from `index.html`,
drop the §3.8 "Dependency" subsection.

**Materials.** Trust the artist's textures. No post-load material
override unless visual QA reveals an issue (S Stock's body is grey-
silver, not the iconic red — TfL red is on the doors and accent strip
only). The "TfL red" framing in earlier spec drafts was wrong; the S
Stock is in the accurate London livery (silver body, blue doors, red
trim). Acceptance criterion §5.9 updated to read "looks like a London
Underground S Stock" rather than "TfL red".

**Why not GLB.** Same as §3.4: pedantry. The Sketchfab page exposes an
FBX export by default; that's what we use.

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
sprite. Same pattern as `dispatch.js`. The fixed scene-edge endpoints
`(±4, 0)` are *world* coords, intentionally decoupled from the sprite's
spawn position — the train is a world phenomenon, not a sprite-local
effect. Roundel sprite's actual location does not affect the trajectory.

**Knockback on contact (bbox-vs-bbox).** The train has no MuJoCo
collision geoms (it's a Three.js scratch mesh), so `data.contact` won't
list it. Per-frame:

1. Compute the train's world-AABB once (`new THREE.Box3().setFromObject(trainGroup)`).
2. For each tracked body (humanoid bodies + sprite slots), compute its
   world-AABB by walking `app.bodies[bodyID]` (group with mesh
   children) — `Box3().setFromObject(bodyGroup)`.
3. If the two AABBs intersect (`trainBox.intersectsBox(bodyBox)`),
   apply knockback to that body.

This is **bbox-vs-bbox** from the start (not a fallback) because the
humanoid is articulated with ~14 bodies — single-point intersection
misses limbs that aren't co-located with the body root.

**Knockback impulse.** Convert the train's velocity (Three frame) to MJ
frame using the canonical swizzle from `stab.js:28-31`:

```js
// Three (x, y, z)_three → MJ (x, -z, y)_mj
const mjVx = trainVel.x;
const mjVy = -trainVel.z;
const mjVz = trainVel.y;

qvel[dofAdr + 0] = mjVx * 0.6;
qvel[dofAdr + 1] = mjVy * 0.6;
qvel[dofAdr + 2] = 6.0;             // upward toss in MJ +z
qvel[dofAdr + 3] = (Math.random() - 0.5) * 8;
qvel[dofAdr + 4] = (Math.random() - 0.5) * 8;
qvel[dofAdr + 5] = (Math.random() - 0.5) * 8;
```

Hit cooldown: 200ms per body so a body inside the bounding box doesn't
get punched every frame.

**No `three-bvh-csg` dependency.** Removed from §3.8 — the FBX has
modelled windows already, no CSG cabin cuts needed. `index.html`
importmap unchanged.

### 3.9 Auto-derived hitbox

**Today:** Each `def` may include `hitbox: { hx, hy, hz }` and
`footprintOffset: number`. Both are hand-tuned per project (see Amogus
def's comment block — the calculation is documented but manual). Drift
risk: any mesh tweak invalidates the hitbox values.

**Replace with:** `ProjectSystem._deriveHitbox(meshGroup)` runs once at
spawn, **after** the mesh is added to `slot.group` and matrices are
flushed. Order of operations in `spawn()`:

```js
// 1. Build mesh and attach.
const mesh = def.buildMesh();
mesh.traverse((o) => { o.bodyID = slot.bodyID; });

// 2. Auto-derive hitbox (only if def doesn't override).
let hb = def.hitbox;
let offset = def.footprintOffset;
if (!hb || offset == null) {
  // Mesh isn't in the scene yet; force-update its local matrices so
  // Box3.setFromObject sees the correct geometry.
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  // Three frame: y-up. MJ frame: z-up. Mapping for half-extents:
  //   Three.x → MJ.hx
  //   Three.z → MJ.hy   (MJ y is what Three calls -z)
  //   Three.y → MJ.hz   (MJ z is what Three calls y)
  if (!hb) hb = { hx: size.x / 2, hy: size.z / 2, hz: size.y / 2 };
  // footprintOffset pushes the mesh DOWN by this amount (Three frame)
  // so its lowest point sits at slot.group's local y=0. box.min.y is in
  // Three frame, so offset = -box.min.y is correct.
  if (offset == null) offset = -box.min.y;
}

// 3. Apply offset and write to MuJoCo geom_size (existing branch).
if (offset !== 0) mesh.position.y = -offset;
slot.group.add(mesh);
slot.meshGroup = mesh;
slot.group.visible = true;

if (hb && this.app.model) {
  const model = this.app.model;
  const geomAdr = model.body_geomadr[slot.bodyID];
  if (geomAdr >= 0) {
    const base = geomAdr * 3;
    model.geom_size[base + 0] = hb.hx;
    model.geom_size[base + 1] = hb.hy;
    model.geom_size[base + 2] = hb.hz;
  }
}
```

The order matters: `_deriveHitbox` reads the mesh BEFORE `slot.group.add`
because the slot group sits at z=-60 (parked) and includes a y-offset
that would corrupt the bbox. We force-update the mesh's matrices in its
local frame and read the local-frame bbox there.

**Override mechanism:** A def that supplies explicit `hitbox` /
`footprintOffset` (either or both) skips auto-derive for the supplied
field(s) only. Example: a sprite with a long antenna may want
auto-derived `footprintOffset` (correct floor placement) but a manual
`hitbox` that excludes the antenna from the collider. Both fields are
checked independently.

**Cleanup pass:** After the new derive code is in and verified, delete
the explicit `hitbox` / `footprintOffset` lines from all 11 catalog
defs in **a single dedicated commit** (so it's easy to revert if any
sprite misbehaves). Sprites that genuinely need a tighter hitbox than
the bounding box keep their explicit override.

**Why now:** Republic, Amogus, Olympic Way and Musicity all show signs
of hitbox drift in the user's QA — labels floating above ground because
`footprintOffset` was tuned against an older mesh. Auto-derive fixes the
cohort; manual fixes would just kick the can.

### 3.10 Sprite mesh raycast → open card

**Why:** With label hiding (§3.1) on, the label pills disappear — but
the sprite mesh has no click handler, so users can't open the card
without un-hiding labels.

**Owner:** `ProjectSystem`. Extend `_bindEvents()` (currently
`src/projects/system.js:47-57`) to bind `mousedown` and `mouseup` on
`window` (not the renderer canvas — pointer events on canvas are
already consumed by `Grabber`).

**Click-vs-drag gating.** Mousedown captures `{x, y, t}`. Mouseup
checks `(t_up - t_down) < 200ms` and `Math.hypot(dx, dy) < 4px`. Only
clicks (not drags) trigger card-open. This is **required** so grab and
card-open coexist on the same left button — without it, every grab
would fire a card-open at release.

**Raycast.** On qualifying click:
1. Build a `Raycaster` with the screen-space click point.
2. Raycast against `app.getGrabbables()` (existing method on `App`,
   defined at `src/main.js:517-519`, returns all grabbable meshes
   whose `bodyID > 0`).
3. If the first hit's `bodyID` matches a `slot.bodyID` with
   `slot.project`, call `this.showCard(slot)`.

Don't suppress grab — grab triggers on mousedown, card-open triggers
on a successful click-without-drag at mouseup. They use the same
button without conflict because they're on different events.

**Edge:** Hide-labels mode + click sprite = card opens. With labels
visible, label-click and sprite-click both open the card; redundant but
harmless.

**Why route through `ProjectSystem`, not `HoverHighlight`:**
HoverHighlight is read-only (paints a colour). Card open is a side
effect on `ProjectSystem`. Cleaner ownership.

### 3.11 Asset loading — preload, cache, scale-normalise

**Added by the FBX integration.** This is the cross-cutting plumbing
that §3.4 (Amogus) and §3.8 (Bombardier S Stock train) both depend on.
Lives in a new module `src/projects/assets.js` so it can be used by
any future project that wants to swap procedural geometry for an
artist asset.

**API surface.**

```js
// src/projects/assets.js
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const loader = new FBXLoader();

/**
 * Preload an FBX, scale-normalise it to a target dimension, and
 * resolve with the cached scene. The returned scene is the canonical
 * cached copy — callers should `.clone(true)` it before adding to
 * their slot group.
 *
 *   { url, target: { axis: "x"|"y"|"z", value: number } }
 */
export async function preloadFBX({ url, target }) {
  const scene = await loader.loadAsync(url);
  // Compute current bbox, derive uniform scale factor.
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const current = size[target.axis];
  if (current > 0 && Number.isFinite(current)) {
    const k = target.value / current;
    scene.scale.setScalar(k);
  }
  // Re-centre on origin so .clone() copies sit at slot.group's local 0.
  scene.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(scene);
  const centre = box2.getCenter(new THREE.Vector3());
  scene.position.sub(centre);
  scene.position.y -= box2.min.y - centre.y;  // bottom of bbox lands at y=0
  // Pass-through traversal for shadow flags.
  scene.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return scene;
}
```

**Boot integration in `App.init()`.**

```js
// After Three.js scene + renderer set up, before mujoco scene load.
this.modelCache = {};
const [amogus, bombardier] = await Promise.all([
  preloadFBX({ url: "./assets/models/amogus.fbx",
               target: { axis: "y", value: 0.6 } }),
  preloadFBX({ url: "./assets/models/bombardier-s-stock.fbx",
               target: { axis: "z", value: 3.0 } }),  // length, not height
]);
this.modelCache.amogus = amogus;
this.modelCache.bombardier = bombardier;
```

**`buildMesh()` for FBX-backed projects.**

```js
// src/projects/catalog/amogus/build.js
export function buildMesh({ THREE, app }) {
  const cached = app.modelCache?.amogus;
  if (!cached) {
    console.error("[amogus] FBX cache miss");
    return new THREE.Group();
  }
  return cached.clone(true);
}
```

The DI builder bag gains an `app` reference so catalog defs can read
the cache. `src/projects/index.js`'s `resolveAbility` already passes
through; we extend the call site in `system.js` spawn flow.

**Loading splash.** The boot async work is invisible to the user
otherwise — add a one-element splash (`<div id="boot-splash">`) that's
visible until `App.init()` resolves, hidden via a body class on the
animate-frame entry. Existing `injectUI()` is a fine home for the
splash element; the body class flip happens at the bottom of `init()`.

**Error handling.** If a preload rejects (404 on the FBX file,
malformed binary), log to console and continue boot. Catalog defs that
depend on a missing model render an empty Group; the project still
appears in the list but the sprite won't show. This is a more graceful
fallback than blocking the entire app on a missing artist asset.

**Why one helper, not per-loader-type plumbing in each `build.js`.**
Five files would each want their own loader instance, scale logic, and
recentre logic. One module = one place to look when something goes
wrong. Adds ~50 lines, removes per-project repetition.

**Why FBX, not GLB.** See `tasks/lessons.md` 2026-04-26. The local
Amogus FBX is in hand at 47kb; the Bombardier asset's primary export
on Sketchfab is FBX. No conversion needed.

## 4. Touched files

| File                                          | Change                                              |
| --------------------------------------------- | --------------------------------------------------- |
| `index.html`                                  | unchanged (no `three-bvh-csg`; FBXLoader is in `three/addons/`) |
| `src/main.js`                                 | Async asset preload at boot; `App.modelCache`; `frameSpawnCloseup`; G-key handling; replace `frameSpawn` call |
| `src/projects/assets.js`                      | NEW — preload helper for FBX assets, returns scaled cached scene |
| `assets/models/amogus.fbx`                    | NEW — copied from local Downloads (47kb)            |
| `assets/models/bombardier-s-stock.fbx`        | NEW — downloaded from Sketchfab (timblewee, CC-BY)  |
| `src/controlsPanel.js`                        | Hide-labels checkbox in Effects section             |
| `src/grabber.js`                              | Bail early when `app._gKeyHeld`                     |
| `src/sparks.js`                               | New public `burst(opts)` method; `enabled` semantics |
| `src/projects/index.js`                       | Validator accepts optional `onSpawn` function       |
| `src/projects/system.js`                      | `_deriveHitbox`, `setLabelsHidden`, `onSpawn` hook, sprite raycast click |
| `src/projects/abilities/index.js`             | Drop `sprint`; add `roomba`, `dune-worm`            |
| `src/projects/abilities/sprint.js`            | DELETE                                              |
| `src/projects/abilities/pulse.js`             | unchanged (just unused by Olympic Way)              |
| `src/projects/abilities/roomba.js`            | NEW                                                 |
| `src/projects/abilities/dune-worm.js`         | NEW                                                 |
| `src/projects/abilities/stab.js`              | Distance-calibrated speed + proportional knockback + blood spray trigger |
| `src/projects/catalog/amogus/proportions.js`  | DELETE (or reduce to `targetHeight: 0.6`) — FBX replaces procedural geometry |
| `src/projects/catalog/amogus/build.js`        | Replace with `app.modelCache.amogus.clone(true)` returner |
| `src/projects/catalog/amogus/index.js`        | Add `targetHeight: 0.6`; drop explicit `hitbox`/`footprintOffset` (auto-derive) |
| `src/projects/catalog/musicity/proportions.js`| Replace with apartment-grid + palette constants     |
| `src/projects/catalog/musicity/build.js`      | Replace with `generateApartment()` + InstancedMesh + onSpawn cycle |
| `src/projects/catalog/musicity/index.js`      | Add `onSpawn` hook; drop `footprintOffset`          |
| `src/projects/catalog/oliver-wyman/proportions.js`| Replace track/dots with logo + plate constants  |
| `src/projects/catalog/oliver-wyman/build.js`  | Replace track + scatter with extruded logo + plate  |
| `src/projects/catalog/oliver-wyman/index.js`  | `ability: "roomba"`; drop `footprintOffset`         |
| `src/projects/catalog/olympic-way/index.js`   | `ability: "dune-worm"`; drop `footprintOffset`      |

The §3.9 cleanup-pass commit additionally deletes `hitbox` /
`footprintOffset` lines from the remaining seven catalog defs not
listed here (they're untouched by other work).

## 5. Acceptance criteria

1. **Hide-labels:** toggling the checkbox in Controls > Effects hides
   all visible label pills within one frame; reload preserves state.
2. **Spawn close-up:** spawning any project from Controls > Projects
   triggers a 700ms inbound tween, holds 1.5s, returns to humanoid
   framing over 900ms (3100ms total). Camera input during inbound or
   hold snap-cancels the tween; input during return cancels the
   auto-finish.
3. **Stab calibration:** firing stab from spawn distance ≈ 1.5m takes
   ~0.5s sprite→torso. Firing from 5m+ caps at 22 m/s. Torso flies
   gentler at short range, full pinwheel at long range.
4. **Blood spray:** every successful contact (humanoid hit) spawns 18
   red `#c51111` particles at the contact point with a 700ms TTL. Fires
   regardless of Sparks toggle state.
5. **Amogus mesh:** Sprite reads as a recognisable Among Us crewmate
   (FBX-loaded). Visor, backpack, antenna, legs all render correctly.
   Materials read with their intended colours under playground lighting.
   No floating, no clipping into the floor, no scale distortion.
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
   button renamed "Summon Train!"; firing it spawns a train (FBX-loaded
   Bombardier S Stock, scaled to ~3m length) that bursts up from one
   scene edge, arcs through the playground, dives back into the ground
   at the opposite edge, knocking down anything in its path. Train
   despawns cleanly within 3.5s. Train reads as a London Underground S
   Stock (silver body, blue doors, red trim — not all-red).
10. **Hitbox:** every spawned project sits flush on the floor at rest
    (no float, no clip). Grab raycasts against project sprites land on
    the visible silhouette, not above/below it.
11. **Sprite click → card:** clicking a project sprite (mouse down +
    up within 200ms and < 4px movement) opens its card. Mousedown +
    drag starts grab and does NOT open the card. Both work whether
    labels are hidden or visible.

## 6. Risks and unknowns

- **FBX preload boot delay.** Two FBX assets load at `App.init()`
  before the catalog is usable. Combined ~150-300kb. On a fast
  connection (Vercel CDN edge), boot adds ~100ms; on a slow connection
  it could be 1-2s. Mitigation: show a "loading playground" splash
  during preload (already trivial — set a body-level loading class,
  unset on `Promise.all` resolve). If the user spawns a project before
  preload completes, the spawn flow `await`s the cache.
- **CC-BY attribution.** The Bombardier S Stock is CC-BY (timblewee
  on Sketchfab). Add a credits surface — either the existing
  `PortfolioOverlay` footer or a dedicated `/credits` route — listing
  the model author and source URL. No legal exposure for a personal
  portfolio, but attribution is still required by the licence.
- **FBX material parsing edge cases.** FBXLoader maps materials to
  MeshPhongMaterial/Standard with best-effort. If either model lands
  with muddy/wrong colours, the post-load traverse pass overrides
  per-mesh. Known fallback path; not a blocker.
- **Train hit detection precision.** Bbox-vs-bbox is approximate; an
  articulated humanoid in a contorted pose may have a body whose AABB
  extends well beyond its visible silhouette, leading to "phantom"
  knockback. Acceptable because the train traverses the playground in
  ~2.5s and overall feel matters more than per-body accuracy. Filed
  for future polish if QA flags it.
- **Sparks burst vs setEnabled mid-flight.** Toggling Sparks off while
  a blood burst is in flight wipes those particles (because
  `setEnabled(false)` zeroes the SoA arrays). Documented; not fixed.
  Toggling off mid-stab is rare.
- **Palette crossfade and `chord` collision.** Both mutate
  `material.color`. Chord uses the colour-snapshot mechanism (read
  current colour at flash time, restore from snapshot) — see §3.6.
- **Auto-hitbox vs grab raycast.** The grab system raycasts against the
  Three.js mesh, not the MuJoCo collision geom. Auto-derive aligns the
  collision hitbox to the mesh bounding box, so they should agree
  better than they do today. If a sprite has a flying part (e.g. an
  antenna) the box gets bigger than the silhouette people expect; that's
  the case for explicit overrides, not a reason to abandon auto-derive.
- **Auto-hitbox bbox order-of-operations.** `_deriveHitbox` runs after
  `mesh.updateMatrixWorld(true)` but BEFORE `slot.group.add(mesh)`,
  because the slot group sits at z=-60 (parked) and would corrupt the
  bbox if included. Documented in §3.9 code comment.
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
- Splitting the Musicity voxel/cycle work into its own follow-up spec
  (the reviewer recommended this; deferred because §3.6's complexity
  is mostly the InstancedMesh + cycle, not interaction surface, and
  splitting would force two PRs through the same file).
