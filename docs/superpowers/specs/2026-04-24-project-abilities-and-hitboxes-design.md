# Project Abilities + Hitbox Fixes

**Date:** 2026-04-24
**Branch:** work on `mujoco-portfolio` (current HEAD includes the merged `catalog-refactor`)
**Scope:** (1) Add abilities to the 6 projects that currently have `ability: null`; (2) Fix sprite-floating-above-floor by introducing a per-project `footprintOffset` so mesh base sits on the ground.
**Out of scope:** Rebalancing existing abilities, adding new physics primitives beyond what `swarm` / `pulse` already use, redesigning existing sprites.

---

## 1. Why

Two visible problems after the catalog merge:

1. **6 of 11 projects have no "fire ability" button**, so the info card has nothing to do beyond read the description. Every project should feel interactive.
2. **Short sprites float ~0.48m above the floor** because the physics slot capsule extends `fromto="0 0 -0.22 0 0 0.22"` with radius 0.26 (half-height 0.48m), so when the capsule rests on the floor its centre sits at z≈0.48. Sprites whose mesh lowest point is near local y=0 (Outreach tile, Peel crates, ClearPath plus-slab) consequently appear suspended above the ground with an invisible physics box underneath. Tall sprites like Republic (mesh base at `plinthBaseY = -0.39m`) already compensate locally in their build, but this compensation is ad-hoc per sprite.

Fixing (1) is pure additive work in `src/projects/abilities/` and `src/projects/catalog/<id>/index.js`. Fixing (2) needs one new field on the project def and one line of code in `ProjectSystem.spawn()`.

---

## 2. Part A — Abilities for the 6 remaining projects

Every new ability lives in `src/projects/abilities/<name>.js` and gets registered in `src/projects/abilities/index.js` via `export const ABILITIES = { stab, topple, pulse, swarm, cycle, heatmap, dispatch, sprint, settle, launch, chord };`.

Each project's `index.js` assigns `ability: "<name>"` as a **string key**. At load time, `src/projects/index.js::resolveAbility` (lines 72–80) looks the string up in `ABILITIES` and rewrites the field to the resolved function before `ProjectSystem._fireAbility` sees it. So at runtime `def.ability` IS the function; at catalog-def time it's the string key. Validator at `src/projects/index.js:62-67` enforces that the string is a valid key before accepting the entry.

### 2.1 Shape of every ability

```js
export function <name>({ app, slot, mesh }) {
  // One-shot setup: may write qpos/qvel, may attach scratch meshes to slot.group.
  // …

  // Tick-based abilities return an object with a tick(dt) method.
  // tick returns false when the ability is done; cleanup runs then.
  let ageMs = 0;
  const DURATION = 2000;
  return {
    tick(dt) {
      ageMs += dt;
      // mutate mesh / write physics / update scratch meshes
      if (ageMs >= DURATION) {
        // dispose any transient meshes + materials
        return false;
      }
      return true;
    },
  };
}
```

Rules for every ability:

- **Dispose cleanly.** Any geometry/material created during the ability's lifetime must be disposed in the terminal branch.
- **Bounded duration.** Every tick-based ability has a hard `DURATION` ≤ 3000ms so back-to-back clicks don't stack infinitely.
- **Idempotent re-fire.** Firing the same ability twice in quick succession runs two independent instances; the second must not leak scratch meshes from the first (the first's terminal branch disposes its own scratch).
- **No framework dependencies beyond the existing context** — `app`, `slot`, `mesh`. If a new context field is needed, add it to `ProjectSystem._fireAbility` once, not per-ability.

### 2.2 The six new abilities

| id | project | label | mechanism | concept link |
|---|---|---|---|---|
| `heatmap` | outreach | Pulse need! | Sub-tiles of the LSOA grid rise/fall on a radial wave emanating from centre. 2s tick. | Need distribution becomes legible when "pulsed" |
| `dispatch` | clearpath | Route! | Spawn a small white paper-plane mesh at the sprite, lerp toward the humanoid torso over 1.5s, fade+dispose on arrival. | GP transfer letter is sent |
| `sprint` | oliver-wyman | Sprint! | Six small sphere scratch meshes chase each other around the track oval for 2s, then fade. | Marathon animation |
| `settle` | peel | Settle! | Coin scratch mesh on top crate flips vertically (spin + small hop), returns to rest, brief emissive flash on landing. 1.5s. | Hedera transaction settles |
| `launch` | arrow | Launch! | One-shot `qvel` impulse: +5 m/s along MJ +z (up), small random tumble on angular axes. No tick. | Arrow shoots up |
| `chord` | musicity | Play! | Music-note scratch mesh bobs up/down 0.3m amplitude, emissive intensity oscillates. 2.5s. | Musical moment |

Each is a separate file under `src/projects/abilities/`. Registry entry in `abilities/index.js`:

```js
export const ABILITIES = { stab, topple, pulse, swarm, cycle, heatmap, dispatch, sprint, settle, launch, chord };
```

Each project's `index.js` gets:

```js
abilityLabel: "Pulse need!",   // for outreach
ability: "heatmap",
```

etc., replacing `ability: null`.

### 2.3 Implementation notes per ability

**`heatmap` (outreach):** the Outreach sprite is a grid of 16 sub-tiles + 1 base slab (all children of the mesh group). The ability reads `mesh.children.filter(c => c.name?.startsWith("lsoa-tile"))` — this filter is only reliable after §2.4's rename pass tags the tiles. The base slab is NOT renamed (so the filter naturally excludes it). The ability sorts tiles by distance from the grid centre, normalises distance to [0,1], and tweens each child's `position.y` by `0.04×D · sin(2π · (ageMs/DURATION − distanceNormalised))` — a radial travelling wave. Restore every tile's original y on terminal frame.

**`dispatch` (clearpath):** create a small `PlaneGeometry(0.12, 0.16)` with a white-ish emissive material. Parent to `app.scene` (NOT `slot.group.parent` — in the MuJoCo loader, body groups live inside the mujoco root whose transform moves with physics; attaching to `slot.group.parent` would carry the letter along with the sprite. Walk up from `slot.group` until `.isScene`, or just use `app.scene` directly). Initial world position: copied from the sprite's body position. Find torso body, sample its world position per frame, lerp letter position toward it. On arrival (distance < 0.25m) or on DURATION end: dispose geometry + material, remove from scene.

**`sprint` (oliver-wyman):** the track is a stadium (two half-circles + two straights). The `stadiumTrack` primitive in `src/projects/builders/primitives.js` currently encapsulates the geometry but does not export a `pointAt(t)` helper. **Implementation prerequisite:** extract a `stadiumTrackPoint({outerW, outerD, tubeR}, t)` helper from `primitives.js` that returns `{x, z}` in sprite-local space for `t ∈ [0,1)`. The ability imports this helper and places six scratch sphere meshes (SphereGeometry 0.04, emissive material) at `t_i = (ageMs/1000 · 0.5 + i/6) mod 1`, parented to `mesh` so they move with the sprite if it's grabbed. Dispose all six + material on terminal frame.

**`settle` (peel):** find the coin child (`mesh.children.find(c => c.name === "peel-coin")` — builder must name it), rotate 4π around world-x over 1.5s, y follows a parabolic arc (max +0.15m at midpoint). On landing frame, set coin material emissive intensity to 0.8 for one frame then decay to 0 over 200ms.

**`launch` (arrow):** pure one-shot qvel write, no tick:
```js
data.qvel[dofAdr + 2] = 5.0;       // upward m/s
data.qvel[dofAdr + 3] = (Math.random() - 0.5) * 3;
data.qvel[dofAdr + 4] = (Math.random() - 0.5) * 3;
data.qvel[dofAdr + 5] = 2.0;       // spin around yaw
app.mujoco.mj_forward(model, data);
return { tick() { return false; } };
```

**`chord` (musicity):** find the music-note child, drive `position.y = baseY + 0.15 · sin(2π · 2 · t)`, emissive intensity = `0.4 + 0.4 · sin(2π · 3 · t)`. Restore on end.

### 2.4 Builder contract updates

Three builders need to name children so the abilities can find them:

- **Outreach build** (`catalog/outreach/build.js`) — each of the 16 tile meshes: `tile.name = "lsoa-tile-" + i;`. Do NOT name the base slab — the heatmap ability's `startsWith("lsoa-tile")` filter depends on that exclusion.
- **Peel build** (`catalog/peel/build.js`) — the coin: `coin.name = "peel-coin";`
- **Musicity build** (`catalog/musicity/build.js`) — the floating note: `note.name = "musicity-note";`

Oliver Wyman, ClearPath, Arrow don't need name tags because their abilities either spawn scratch meshes (sprint, dispatch) or write physics directly (launch).

### 2.5 Park-cancel hook (prevents orphaned scratch meshes)

When a user clicks "Clear All" or the sprite is parked, any tick-based ability attached to it must cancel and clean up. Today `ProjectSystem._park(slot)` detaches `slot.meshGroup` but does nothing about `this._activeAbilities`. New tick-based abilities (especially `dispatch`, whose scratch mesh is parented to `app.scene` and survives park) would leak.

**Minimal change to `ProjectSystem`:**

1. Each ability-return object may include an optional `cancel()` method. Contract: `cancel()` disposes all scratch meshes and materials the ability created, and is safe to call before DURATION elapses. Existing abilities (`stab`, `topple`) return `{ tick() { return false; } }` (one-shot) and get a no-op cancel; `pulse`, `swarm`, `cycle` need `cancel()` added as part of this spec's implementation — scope creep of one line each.
2. `_fireAbility(slot)` records the slot association on the active-ability object: `abilities.push({ ...fn, slotBodyID: slot.bodyID })`.
3. `_park(slot)` loops `_activeAbilities` filtering those whose `slotBodyID === slot.bodyID`, calls `.cancel?.()` on each, and removes them from the array.
4. `onSceneLoaded()` cancels the entire `_activeAbilities` array on scene reload (pre-existing bug surfaced by this spec — tick-based abilities survive a scene switch today, which only didn't matter because `swarm` / `pulse` parent their scratch to `slot.group` which gets destroyed with the model).

---

## 3. Part B — Hitbox / footprint offset

### 3.1 Root cause

Slot capsules are identical (`size=0.26`, `fromto=0 0 -0.22 0 0 0.22`), half-length + radius = 0.48m. When at rest on the floor, the body's local origin sits at z ≈ 0.48m. Any mesh attached to the body with local `y` near 0 therefore appears floating 0.48m above the floor. Ad-hoc fix today: some sprites (Republic, Amogus) build their geometry with a negative y-offset baked in; others don't.

### 3.2 Fix: `footprintOffset` on every project def

Add one field to `def`:

```js
// catalog/<id>/index.js
export default {
  id: "...",
  // …
  footprintOffset: 0.48,    // metres; how far to push the MESH GROUP down so its
                             // base rests on the floor when the capsule rests
  // …
};
```

In `ProjectSystem.spawn()`, after attaching the mesh (currently around line 119):

```js
const offset = def.footprintOffset ?? 0;
if (offset !== 0) mesh.position.y = -offset;
slot.group.add(mesh);
```

The mesh group sits at body-local `y = -offset`; physics body keeps its unchanged collision capsule. Per-sprite and data-driven, not physics-driven.

### 3.3 Values per project

Computed from each sprite's proportions file. Formula: `footprintOffset = 0.48 + meshBaseY`, where `0.48` is the capsule half-extent (body origin is 0.48m above floor at rest) and `meshBaseY` is the y-coordinate of the sprite's visual lowest point in body-local space. Values rounded to 0.01m. If `meshBaseY` is negative (builder baked in a downshift), the offset is small; if zero, it's the full 0.48m.

| project | meshBaseY (body-local) | footprintOffset | source |
|---|---|---|---|
| amogus | `bodyBaseY = -1.20·D = -0.312` (body rim — **stub legs extend further to ~-0.45 but count as sub-features, not footprint**) | **0.17** | `catalog/amogus/proportions.js` |
| republic | `plinthBaseY = -1.50·D = -0.390` | **0.09** | `catalog/republic/proportions.js` |
| olympic-way | `plinthBaseY = -1.30·D = -0.338` | **0.14** | `catalog/olympic-way/proportions.js` |
| outreach | `baseY = -0.60·D = -0.156` | **0.32** | `catalog/outreach/proportions.js` |
| clearpath | cross centred at `y=0`; `armDepth = 0.24·D = 0.0624m`, half-depth ≈ 0.031 → base ≈ -0.031 | **0.45** | derived from `catalog/clearpath/build.js` + `proportions.js` |
| oliver-wyman | `pedestalBaseY = -0.85·D = -0.221` | **0.26** | `catalog/oliver-wyman/proportions.js` |
| simulacra | hub sphere at `y=0`, `hubR = 0.30·D = 0.078m` → hub bottom ≈ -0.078 | **0.40** | derived from `catalog/simulacra/build.js` + `proportions.js` |
| peel | `baseY = -0.80·D = -0.208` | **0.27** | `catalog/peel/proportions.js` |
| arrow | `shaftBaseY = -0.90·D = -0.234` | **0.25** | `catalog/arrow/proportions.js` |
| musicity | `blockBaseY = -0.80·D = -0.208` | **0.27** | `catalog/musicity/proportions.js` |
| peter-network | `torsoBaseY = -0.60·D = -0.156` (torso rim lowest) | **0.32** | `catalog/peter-network/build.js:97` |

**Error direction is protective:** if `footprintOffset` is too LOW, the sprite floats — visible but harmless. If too HIGH, the sprite mesh sinks below the floor — also visible. The implementer should spawn each sprite and confirm visually; err on the low side if uncertain.

### 3.4 Why not change physics

**Considered: shrink the capsule per slot.** Rejected because it breaks the "all slots are generic identical containers" invariant. The slot pool is a physics primitive; the mesh on top is the product-specific payload. Tying capsule dimensions to the active payload creates a whole-model-recompile-on-spawn requirement that MuJoCo WASM doesn't support cleanly.

**Considered: one global `PARKED_Z` adjustment.** Rejected because it only shifts parking, not the resting position. The issue is where the mesh sits relative to the body at runtime, which is per-sprite.

**Accepted: per-def `footprintOffset`** — sprite-level data, applied at a single code path (`ProjectSystem.spawn`), trivial to tune, no physics impact.

### 3.5 What does NOT change

- Slot pool XML — same `fromto`, same `size`, same `contype`/`conaffinity`. The physics agent's collision mask trick is preserved verbatim.
- Mass, friction, inertia on each slot — unchanged.
- Grabber behaviour — `MAX_LEVER = 0.5` clamp stays; it's derived from the capsule extent and is independent of the visual offset.

---

## 4. Execution order

Tight commits, each runnable:

1. **`spawn()` plumbing.** Add `footprintOffset` field support in `ProjectSystem.spawn()` — reads from `def`, applies to mesh on attach. Default `0` if absent so nothing changes yet. Commit.
2. **Populate `footprintOffset` on every project def.** Use the table in §3.3. One commit for all 11.
3. **Tag builders that need named children.** Outreach tiles, Peel coin, Musicity note. Commit.
4. **Add each new ability** (six files, one each). Commit per ability:
   - `abilities/launch.js` + arrow/index.js wiring
   - `abilities/dispatch.js` + clearpath wiring
   - `abilities/chord.js` + musicity wiring
   - `abilities/settle.js` + peel wiring
   - `abilities/sprint.js` + oliver-wyman wiring
   - `abilities/heatmap.js` + outreach wiring
5. **Register all six in `abilities/index.js`.** One commit if not already done inline with step 4.
6. **Final catalog validator run**: `node scripts/validate-catalog.mjs` → 11/11 pass, all abilities resolve to functions.

---

## 5. Acceptance criteria

- [ ] All 11 catalog entries have `ability: <string>` (none `null`). All 11 have `abilityLabel: "…"`.
- [ ] Catalog validator reports 11/11, 0 failures. Every `ability` string is a key in `ABILITIES`.
- [ ] Every sprite's visual base sits within 0.05m of the floor at rest — no 0.5m floating gap.
- [ ] Clicking any project's ability button fires the ability without throwing. Double-clicking fires two independent instances (does not leak scratch meshes).
- [ ] No console errors on site load or on any ability invocation.
- [ ] The Grabber's `MAX_LEVER = 0.5` clamp is unchanged; dragging any sprite still behaves.

---

## 6. Risks + mitigations

| Risk | Mitigation |
|---|---|
| `footprintOffset` wrong for some sprite; mesh sinks into floor | Use `0` as safe default; every value in the table is conservative. Visual eyeball pass during implementation. |
| Transient ability scratch meshes not disposed → memory leak | Every new ability's tick-return branch disposes explicitly. Code review checks for dispose call. |
| Arrow's `launch` qvel write collides with a body currently being grabbed | Grabber clears `xfrc_applied` on release, but qvel written mid-grab would fight the spring. Add a one-line guard in `launch`: skip the write if `app.grabber?.active && app.grabber?.bodyID === slot.bodyID`. |
| Heatmap's tile tween conflicts with `peterAvatar`-style dispose on park | Park clears the whole mesh group; abilities reading tile state should check `slot.meshGroup === mesh` in their tick and exit if not. |
| Builder renames break existing abilities (if any re-use the same primitive) | The three rename-targets (outreach tiles, peel coin, musicity note) are all sprite-local. No shared primitive renaming. |

---

## 7. What this spec does NOT cover

- Sound effects.
- Ability cooldowns or per-ability budgets.
- Per-project `footprintOffset` auto-derivation from mesh bounding box. That's an attractive follow-up (the offset IS computable from the mesh's AABB) but would expand scope; a constant table is sufficient for 11 entries.
- Revising the **mechanics or balance** of existing abilities (`stab`, `topple`, `pulse`, `swarm`, `cycle`). Note: §2.5 DOES add a `cancel()` method to each of `pulse`, `swarm`, `cycle` — that is purely a cleanup shim, not a behaviour change, and it's in scope. `stab` and `topple` are one-shots and get a no-op `cancel()`. The launch grab-guard in §6 is also in scope.
