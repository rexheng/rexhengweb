# Projects polish pass — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-04-26-projects-polish-pass-design.md`
**Branch:** `mujoco-portfolio` (this worktree)

**Goal:** Ship the 10-change projects polish pass: hide-labels toggle, spawn close-up camera, calibrated stab + blood spray, FBX-loaded Amogus, hold-G drag-rotate, voxel Musicity, Oliver Wyman extruded logo + roomba, Olympic Way Bombardier S Stock dune-worm train, auto-derived hitboxes, and sprite-mesh raycast.

**Architecture:** All changes are layered on top of the existing `ProjectSystem`/catalog/ability registry. A new module `src/projects/assets.js` provides catalog-driven FBX preloading with module-level caching (no DI-bag changes). Auto-derived hitboxes replace hand-tuned `hitbox`/`footprintOffset` per def. New abilities (`roomba`, `dune-worm`) and a new public `Sparks.burst()` method extend existing systems without rewriting them.

**Tech Stack:** Three.js r0.181 (FBXLoader from `three/addons/loaders/FBXLoader.js`), MuJoCo WASM, vanilla JS (no build step — served statically by `serve.py`), `localStorage` for persistence.

**Conventions discovered from the codebase (read first, then never deviate):**
- All catalog defs use the DI builder pattern: `buildMesh: () => buildMesh({ THREE, materials, primitives, proportions })` so `def.buildMesh()` is **zero-arg** at the call site (`src/projects/system.js:123`). Do NOT thread `app` through this DI bag.
- Three↔MJ swizzle is canonical: THREE `(x, y, z)` ↔ MJ `(x, -z, y)`. See `src/projects/abilities/impulse.js:21-23` and the `stab.js` lunge math.
- Abilities return either `{ tick(dt) → boolean }` (live until tick returns `false`) or just a one-shot. Tick objects get tagged with `_slotBodyID` automatically by `_fireAbility` so `_park` can cancel them.
- Catalog files live under `src/projects/catalog/<id>/` with `index.js` (def), `build.js` (mesh), `proportions.js` (constants), `BRIEF.md` / `REFS.md` / `VERIFIED.md` (docs). Do not delete the docs files when rebuilding `proportions.js` / `build.js`.
- The site is served statically — no Vite, no bundler, no `npm run build`. Refresh the browser to test.
- The dev server is **always at port 8765**. Do not start your own; check `netstat -ano | findstr 8765` first.

---

## Chunk 1: Asset loader, auto-derived hitbox, boot splash

This chunk lands the cross-cutting plumbing that §3.4 (Amogus FBX) and §3.8 (train FBX) depend on — the `assets.js` module with catalog-driven preload, the `_deriveHitbox` path inside `ProjectSystem.spawn()`, and the boot splash that masks the preload latency. Auto-derive ships with the override mechanism intact, so existing hand-tuned defs continue working until the §3.9 cleanup pass in Chunk 2.

### Task 1.1: Create `src/projects/assets.js` module

**Files:**
- Create: `src/projects/assets.js`

**Why this module exists:** Future asset loaders (FBX, GLTF, audio) need a single home. The cache is a module-level export so catalog `build.js` files can `import { modelCache }` directly without going through the DI bag — preserving the established zero-arg `def.buildMesh()` call site.

- [ ] **Step 1: Write the file**

Write the following content exactly:

```js
// Catalog-driven asset preload + cache.
// Lives at the module level (NOT on App) so catalog build.js files can
// import { modelCache } directly without threading `app` through the DI
// bag — keeps the zero-arg def.buildMesh() call site at system.js:123
// unchanged. See spec §3.11.

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const loader = new FBXLoader();

/** Module-level cache. Catalog build.js files import this directly. */
export const modelCache = {};

/**
 * Preload an FBX, scale-normalise it, and recentre it so its bbox bottom
 * sits at local y=0 and its xz centre is at origin. The returned scene
 * is the canonical cached copy — callers should `.clone(true)` it before
 * adding to their slot group.
 *
 * @param {{ url: string, target: { axis: "x"|"y"|"z", value: number } }} cfg
 */
export async function preloadFBX({ url, target }) {
  const scene = await loader.loadAsync(url);

  // 1. Scale.
  scene.updateMatrixWorld(true);
  const box1 = new THREE.Box3().setFromObject(scene);
  const size1 = box1.getSize(new THREE.Vector3());
  const current = size1[target.axis];
  if (current > 0 && Number.isFinite(current)) {
    scene.scale.setScalar(target.value / current);
  }

  // 2. Recentre. After scale, recompute bbox in scaled-frame, then
  // shift `scene.position` so the bbox bottom lands at y=0 and the
  // bbox xz centre lands at origin. Single assignment — no two-step
  // math that's easy to misread.
  scene.position.set(0, 0, 0);
  scene.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(scene);
  const centre = box2.getCenter(new THREE.Vector3());
  scene.position.set(-centre.x, -box2.min.y, -centre.z);

  // 3. Shadow flags.
  scene.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return scene;
}

/**
 * Catalog-driven preload. Iterates the projects list, finds defs that
 * declare an `fbx` (sprite mesh) or `abilityFbx` (ability-only mesh)
 * field, and preloads each into modelCache.
 *
 * Returns a Promise that resolves once all preloads settle. Per-asset
 * errors are caught and logged; missing assets do NOT reject the boot
 * promise — the caller's splash hides on settle, and `buildMesh`/
 * ability-fire fall back to an empty Group on cache miss.
 */
export async function preloadCatalogAssets(projects) {
  const tasks = [];
  for (const def of projects) {
    if (def.fbx) {
      tasks.push(
        preloadFBX(def.fbx)
          .then((scene) => { modelCache[def.id] = scene; })
          .catch((err) => console.error(`[assets] ${def.id} preload failed`, err)),
      );
    }
    if (def.abilityFbx) {
      const { cacheKey, ...rest } = def.abilityFbx;
      tasks.push(
        preloadFBX(rest)
          .then((scene) => { modelCache[cacheKey] = scene; })
          .catch((err) => console.error(`[assets] ${cacheKey} preload failed`, err)),
      );
    }
  }
  await Promise.allSettled(tasks);
}
```

- [ ] **Step 2: Smoke-import**

Run in browser DevTools after a hard refresh of the existing page (no FBX defs yet, so this just verifies the module parses):

```js
const m = await import("./src/projects/assets.js");
console.log(Object.keys(m));   // ["modelCache", "preloadFBX", "preloadCatalogAssets"]
console.log(m.modelCache);     // {}
```

Expected: keys array as listed; `modelCache` is `{}`. Any error means FBXLoader path is wrong or the file has a syntax error — fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/projects/assets.js
git commit -m "feat(projects): add catalog-driven FBX preload module

New src/projects/assets.js exports modelCache + preloadFBX +
preloadCatalogAssets. Module-level cache so build.js files can
import directly without threading app through the DI bag.
Recentres each loaded scene so bbox bottom is at y=0 and xz
centre is at origin — the auto-hitbox path expects this.

Spec: docs/superpowers/specs/2026-04-26-projects-polish-pass-design.md §3.11"
```

### Task 1.2: Validator accepts `fbx` and `abilityFbx`

**Files:**
- Modify: `src/projects/index.js:42-70` (the `validate` function)

The validator currently asserts required string fields + `buildMesh` + `ability` shape. Add optional checks for `fbx`, `abilityFbx`, and (for §3.6) `onSpawn`. Defs without these continue to validate.

- [ ] **Step 1: Add validator cases**

In `src/projects/index.js`, inside the `validate(def, path)` function, **after** the existing `if (def.ability != null)` block and **before** `return true;`, append:

```js
  if (def.onSpawn != null && typeof def.onSpawn !== "function") {
    console.error(`[projects] ${path}: onSpawn must be a function`);
    return false;
  }
  if (def.fbx != null) {
    if (typeof def.fbx.url !== "string"
        || !def.fbx.target
        || typeof def.fbx.target.axis !== "string"
        || typeof def.fbx.target.value !== "number") {
      console.error(`[projects] ${path}: fbx must be { url: string, target: { axis: string, value: number } }`);
      return false;
    }
  }
  if (def.abilityFbx != null) {
    if (typeof def.abilityFbx.url !== "string"
        || !def.abilityFbx.target
        || typeof def.abilityFbx.target.axis !== "string"
        || typeof def.abilityFbx.target.value !== "number"
        || typeof def.abilityFbx.cacheKey !== "string") {
      console.error(`[projects] ${path}: abilityFbx must be { url, target: { axis, value }, cacheKey }`);
      return false;
    }
  }
```

- [ ] **Step 2: Verify nothing broke**

Hard-refresh the page. Open DevTools console.

Expected: no `[projects] …` errors logged; the project grid in the controls panel shows all 11 tiles. Spawn a project to confirm catalog still works.

- [ ] **Step 3: Commit**

```bash
git add src/projects/index.js
git commit -m "feat(projects): validator accepts optional onSpawn, fbx, abilityFbx"
```

### Task 1.3: Wire preload into `App.init()` with boot splash

**Files:**
- Modify: `src/main.js:171-454` (the `init` method) — add splash flip and preload await
- Modify: `src/ui.js` — inject the splash element + CSS via `injectUI()`
- Modify: `index.html` — keep importmap unchanged (FBXLoader is part of `three/addons/`); just verify

The splash has to be visible on the first paint — that means injection happens **before** the WASM load. Easiest: append it during `injectUI()` (already called as the very first thing in `init()`), so it's in the DOM by the time the heavy `await load_mujoco()` runs. The splash is hidden after the FBX preload (which is the slowest awaited step in `init()` once we wire it in).

- [ ] **Step 1: Read existing `injectUI` to see where to splice**

Run:

```bash
grep -n "export function injectUI\|^}" src/ui.js | head -10
```

Note the line numbers of the function so the edit lands cleanly. The splash injection should go at the **top** of `injectUI`, before anything else, so it appears immediately.

- [ ] **Step 2: Inject splash markup at top of `injectUI`**

In `src/ui.js`, find the start of `export function injectUI()` and insert at the top of its body:

```js
  // Boot splash — opaque overlay that masks the FBX preload + WASM
  // load latency. Removed by App.init() after preload settles.
  if (!document.getElementById("boot-splash")) {
    const splash = document.createElement("div");
    splash.id = "boot-splash";
    splash.className = "rex-boot-splash";
    splash.innerHTML = `
      <div class="rex-boot-splash-spinner"></div>
      <div class="rex-boot-splash-label">Loading playground…</div>
    `;
    document.body.appendChild(splash);
  }
```

- [ ] **Step 3: Add splash CSS**

Find the `<style>` block injected by `injectUI()` (look for the existing `.rex-` selectors). Append this rule set to that style block string. **Important:** the CSS lives inside whatever template literal `injectUI` already uses for its stylesheet — do NOT create a new `<style>` element if one already exists.

```css
.rex-boot-splash {
  position: fixed; inset: 0; z-index: 100;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #05070c;
  color: #c0c8d8;
  font-family: ui-monospace, monospace;
  font-size: 14px; letter-spacing: 0.02em;
  pointer-events: all;
  transition: opacity 240ms ease-out;
}
.rex-boot-splash-spinner {
  width: 28px; height: 28px;
  border: 2px solid rgba(192,200,216,0.18);
  border-top-color: #c0c8d8;
  border-radius: 50%;
  animation: rex-boot-spin 0.9s linear infinite;
  margin-bottom: 12px;
}
@keyframes rex-boot-spin {
  to { transform: rotate(360deg); }
}
body.booted .rex-boot-splash {
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 4: Smoke-test splash visibility**

Hard-refresh the page. Within the first paint frame the dark splash with a spinner and "Loading playground…" should be visible. It will stay visible until `init()` finishes (because we haven't wired the hide step yet).

Expected: splash visible for the entire load duration; no errors in console.

- [ ] **Step 5: Wire `await preloadCatalogAssets(PROJECTS)` and splash flip into `App.init()`**

In `src/main.js`, near the top with the other imports:

```js
import { preloadCatalogAssets } from "./projects/assets.js";
```

Note: `PROJECTS` is already imported indirectly via `ProjectSystem`, but to avoid coupling, also add:

```js
import { PROJECTS } from "./projects/index.js";
```

In `init()`, find the line `this.projectSystem = new ProjectSystem(this);` (around line 401). **Before** that line — i.e. after the Three.js scene is built but before the project system mounts — insert:

```js
    // Preload catalog assets (FBX models, etc) before the catalog UI
    // becomes reachable. The boot splash injected by injectUI() covers
    // this latency; defs without `fbx`/`abilityFbx` no-op here.
    await preloadCatalogAssets(PROJECTS);
```

Then at the **very end** of `init()` (after `this.animate();`), add:

```js
    // Hide boot splash once everything is ready. CSS transition fades
    // it out over 240ms; remove the node 320ms later.
    document.body.classList.add("booted");
    setTimeout(() => document.getElementById("boot-splash")?.remove(), 320);
```

- [ ] **Step 6: Verify boot splash hides**

Hard-refresh. The splash should appear immediately, persist through MuJoCo + catalog load, then fade out within ~240ms after the playground becomes interactive.

Expected: splash appears → spinner spins → playground loads → splash fades and is removed from DOM. Inspect Element after a few seconds to confirm `<div id="boot-splash">` is gone and `<body>` has `class="booted"`.

If the splash never disappears: `init()` likely threw — check console. If the splash flickers off and on: `injectUI()` is being called twice — guard it.

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/ui.js
git commit -m "feat(boot): preload catalog assets behind opaque boot splash

Splash injected by injectUI() at the top of init() so it's visible
on first paint. preloadCatalogAssets(PROJECTS) awaited before
ProjectSystem mounts. Splash hides via .booted class flip + 240ms
CSS fade, then DOM node removed at 320ms.

Spec: §3.11"
```

### Task 1.4: Auto-derive hitbox in `ProjectSystem.spawn()`

**Files:**
- Modify: `src/projects/system.js:106-205` (the `spawn` method)

Add `_deriveHitbox` logic that runs when `def.hitbox` and/or `def.footprintOffset` are absent. Existing defs with explicit values continue to work — the derivation only fires for the missing field(s).

**Order of operations matters:** the bbox must be computed BEFORE `slot.group.add(mesh)`. The slot group sits at z=-60 (parked) which would corrupt the bbox if the mesh inherited that transform. We force `mesh.updateMatrixWorld(true)` while it's still parentless.

- [ ] **Step 1: Patch the `spawn()` method**

In `src/projects/system.js`, find the block starting at line 123 (`const mesh = def.buildMesh();`) and ending at line 149 (`slot.group.visible = true;`). Replace that **entire block** with:

```js
    const mesh = def.buildMesh();
    mesh.traverse((o) => { o.bodyID = slot.bodyID; });

    // Auto-derive hitbox + footprintOffset if the def doesn't supply them.
    // Mesh isn't in the scene yet; force-update its local matrices so
    // Box3.setFromObject sees the correct geometry. We must read the bbox
    // BEFORE adding to slot.group — the slot sits at z=-60 (parked) and
    // would corrupt the bbox.
    let hb = def.hitbox;
    let offset = def.footprintOffset;
    if (!hb || offset == null) {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      // Three frame: y-up. MJ frame: z-up. Mapping for half-extents:
      //   Three.x → MJ.hx (lateral)
      //   Three.z → MJ.hy (depth)
      //   Three.y → MJ.hz (vertical)
      if (!hb) hb = { hx: size.x / 2, hy: size.z / 2, hz: size.y / 2 };
      // footprintOffset pushes the mesh DOWN by this amount (Three frame)
      // so its lowest point sits at slot.group's local y=0.
      if (offset == null) offset = -box.min.y;
    }

    // Per-project hitbox override. Each slot has a default 0.30×0.30×0.45
    // box geom; resize it so collision matches the actual silhouette
    // instead of the one-size-fits-all default.
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

    if (offset !== 0) mesh.position.y = -offset;
    slot.group.add(mesh);
    slot.meshGroup = mesh;
    slot.group.visible = true;
```

- [ ] **Step 2: Smoke-test with existing defs (which still have explicit values)**

Hard-refresh. Spawn each of the 11 projects in turn. Every sprite should land flush on the floor — no float, no clip — exactly as before. The auto-derive path is dormant for defs that supply explicit values; this step verifies the **existing branch** is untouched.

If a sprite floats or clips after this change: a `let` shadowing bug crept in. Re-read the diff.

- [ ] **Step 3: Commit**

```bash
git add src/projects/system.js
git commit -m "feat(projects): auto-derive hitbox + footprintOffset from mesh Box3

Defs without explicit hitbox/footprintOffset now have them computed
from the loaded mesh's local-frame bounding box. Computed BEFORE
slot.group.add() so the slot's parked z=-60 doesn't corrupt the box.

Existing defs with explicit values are untouched — auto-derive only
fills missing fields. Cleanup pass to delete the now-redundant
explicit values lands in a separate commit (Chunk 2 §3.9 cleanup).

Spec: §3.9"
```

---

## Chunk 2: Amogus FBX swap, stab calibration + blood, hitbox cleanup

This chunk is the showcase: swap procedural Amogus for a loaded FBX, calibrate stab to feel proportional at any range, add red blood spray, then sweep the hand-tuned hitbox values out of the eight defs that didn't get a mesh rebuild. The Amogus FBX must be copied into `assets/models/` first since it's not yet under version control.

### Task 2.1: Copy Amogus FBX into `assets/models/`

**Files:**
- Create: `assets/models/amogus.fbx`
- Create (maybe): `assets/models/among-us-3D-model-cgian.mtl` and any sibling textures

The source is `C:\Users\Rex\Downloads\among-us-3D-model-cgian\among-us-3D-model-cgian\among-us-3D-model-cgian.fbx`.

- [ ] **Step 1: Inspect the .mtl to determine if siblings are needed**

Open `C:\Users\Rex\Downloads\among-us-3D-model-cgian\among-us-3D-model-cgian\among-us-3D-model-cgian.mtl` in a text editor. If it contains only `Kd` colour entries (e.g. `Kd 0.808 0.066 0.066`) and no `map_Kd` / `map_*` entries pointing to PNG/JPG files, the materials are colour-only — we only need to copy the FBX itself.

If it contains `map_*` lines, copy those referenced files alongside.

- [ ] **Step 2: Create the directory and copy**

```bash
mkdir -p assets/models
cp "/c/Users/Rex/Downloads/among-us-3D-model-cgian/among-us-3D-model-cgian/among-us-3D-model-cgian.fbx" assets/models/amogus.fbx
```

(If sibling textures were referenced in step 1, copy them too — preserve their original filenames so FBXLoader's relative-path resolution works. The FBX references textures by relative filename.)

Verify:

```bash
ls -lh assets/models/
```

Expected: `amogus.fbx` ~47kb.

- [ ] **Step 3: Commit the asset**

```bash
git add assets/models/
git commit -m "chore(assets): add Amogus FBX (CGIan, ~47kb)"
```

### Task 2.2: Replace Amogus build.js with FBX clone

**Files:**
- Modify: `src/projects/catalog/amogus/build.js`
- Modify: `src/projects/catalog/amogus/index.js`
- Delete: `src/projects/catalog/amogus/proportions.js`

The new `build.js` doesn't need the DI bag (no `THREE`/`materials`/`primitives`/`proportions`) since the mesh comes from the cache. It still must export a `buildMesh` function that the def's wrapper can call zero-arg.

- [ ] **Step 1: Rewrite `src/projects/catalog/amogus/build.js`**

Replace the entire file with:

```js
// Amogus mesh — clone of the FBX-loaded crewmate, recentred and
// scale-normalised in src/projects/assets.js. See spec §3.4.

import * as THREE from "three";
import { modelCache } from "../../assets.js";

export function buildMesh() {
  const cached = modelCache.amogus;
  if (!cached) return new THREE.Group();   // graceful fallback on load failure
  return cached.clone(true);
}
```

- [ ] **Step 2: Rewrite `src/projects/catalog/amogus/index.js`**

Replace the entire file with:

```js
// Amogus project def. Sprite is FBX-loaded; see spec §3.4.

import { buildMesh } from "./build.js";

export default {
  id: "amogus",
  label: "Amogus",
  title: "Amogus — Cursor Hack London 2026 · 2nd place",
  subtitle: "2026 · MCP server for Vibecoding",
  meta: "MCP · multi-agent · Cursor Hack London",
  accent: "#e25d63",
  description:
    "Amogus is an MCP server for Vibecoding — it orchestrates four parallel Claude agents that deliberate in isolation, then come together for 'emergency meeting' rounds where an evolutionary scoring pass votes the weakest branch out and evolves the rest. Built at Cursor Hack London 2026, where it took 2nd place. The sus red crewmate is the mascot: spawn it in the playground and give it a stab.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/amogus" },
  ],
  abilityLabel: "Stab!",
  ability: "stab",
  // Sprite mesh from artist FBX. Scale: 0.6 MJ-units tall.
  // Hitbox + footprintOffset auto-derived per §3.9.
  fbx: { url: "./assets/models/amogus.fbx", target: { axis: "y", value: 0.6 } },
  // Wrap the builder so ProjectSystem can call def.buildMesh() with no args.
  buildMesh: () => buildMesh(),
};
```

- [ ] **Step 3: Delete the now-orphaned `proportions.js`**

```bash
git rm src/projects/catalog/amogus/proportions.js
```

- [ ] **Step 4: Inspect the loaded FBX for SkinnedMesh (verifies the spec assumption)**

Hard-refresh. In DevTools console:

```js
const m = await import("./src/projects/assets.js");
let hasRig = false;
m.modelCache.amogus?.traverse(o => { if (o.isSkinnedMesh) hasRig = true; });
console.log("Amogus has rig?", hasRig);
```

Expected: `false`. The CGIan model is static, so `.clone(true)` is correct. **If `true`:** stop, change `build.js` to use `SkeletonUtils.clone()` from `three/addons/utils/SkeletonUtils.js` instead of `cached.clone(true)`.

- [ ] **Step 5: Spawn-test**

Click the Amogus tile in the controls panel. Expected:
- A recognisable Among Us crewmate appears at a spawn point near the humanoid
- Body, visor, backpack, antenna, legs all render
- Sprite stands flush on the floor (auto-derived `footprintOffset` is doing its job)
- Material colours read sensibly (red body, cyan-ish visor — not muddy grey)

If the visor or any mesh renders muddy/grey/wrong: in `src/projects/assets.js`'s `preloadFBX`, **after** the shadow-flag traverse, add an optional override pass. Don't bake this until visual QA flags a real issue.

If the mesh appears but is gigantic or microscopic: the `target` axis or value is wrong. Tweak `value: 0.6` in `index.js`.

- [ ] **Step 6: Commit**

```bash
git add src/projects/catalog/amogus/
git commit -m "feat(amogus): swap procedural mesh for FBX-loaded crewmate

build.js now clones from modelCache.amogus instead of running the
DI builder. proportions.js deleted. Hitbox + footprintOffset
auto-derived (no explicit values).

Spec: §3.4"
```

### Task 2.3: Stab — distance-calibrated speed + proportional knockback

**Files:**
- Modify: `src/projects/abilities/stab.js`

Replace the constant `SPEED = 22.0` with a distance-time target. Scale upward bias and knockback proportionally so short stabs don't get a comically large lift.

- [ ] **Step 1: Patch the lunge calibration**

In `src/projects/abilities/stab.js`, the current code at lines 54-66 reads:

```js
  const SPEED = 22.0;
  data.qvel[dofAdr + 0] = mjDx * SPEED;
  data.qvel[dofAdr + 1] = mjDy * SPEED;
  data.qvel[dofAdr + 2] = mjDz * SPEED + 2.5;  // small upward bias
  // Forward tumble: spin axis perpendicular to lunge direction.
```

Replace those lines (up through the `data.qvel[dofAdr + 2] = ...` line — keep the perpAxis tumble code below) with:

```js
  // Distance-calibrated lunge: stays in flight ~0.5s regardless of range.
  // Constant velocity made near-spawns feel like teleports; constant time
  // keeps the visual moment consistent. Clamp 8..22 m/s.
  const dist = torsoPos.distanceTo(slotPos);
  const TARGET_TIME = 0.5;
  const speed = Math.max(8, Math.min(22, dist / TARGET_TIME));

  // Upward bias scales with speed — short stabs don't get a giant lift.
  const upwardBias = 2.5 * (speed / 22);

  data.qvel[dofAdr + 0] = mjDx * speed;
  data.qvel[dofAdr + 1] = mjDy * speed;
  data.qvel[dofAdr + 2] = mjDz * speed + upwardBias;
  // Forward tumble: spin axis perpendicular to lunge direction.
```

- [ ] **Step 2: Patch the knockback proportionally**

Find line 113 (`const KNOCK_SPEED = 7.5;`). Replace just that line with:

```js
          // Proportional to lunge speed so short-range stabs don't pinwheel
          // the humanoid as hard as long-range ones.
          const KNOCK_SPEED = 3.0 + (speed / 22) * 4.5;   // → 3.0..7.5
```

The `speed` variable from step 1 is in scope (closure over the outer ability function — verify: `KNOCK_SPEED` was previously a literal at line 113, replaced with an expression that reads `speed` from the enclosing scope; `speed` is declared once per fire and never reassigned).

- [ ] **Step 3: Spawn-test stab at near and far distances**

Spawn Amogus near the humanoid and click "Stab!" — expect a gentle bump. Spawn another Amogus across the playground and stab — expect the full pinwheel.

Specifically check: at spawn distance ~1.5m, sprite reaches torso in roughly 0.5s (count "one-thousand"). At max distance, sprite reaches torso in roughly 0.5s too (distance/speed clamped to ~22).

If the sprite is too slow at long range: the clamp `Math.min(22, ...)` is wrong. If too violent at short range: `Math.max(8, ...)` is wrong.

- [ ] **Step 4: Commit**

```bash
git add src/projects/abilities/stab.js
git commit -m "feat(stab): distance-calibrated lunge speed + proportional knockback

Stab now reaches the torso in ~0.5s regardless of spawn distance
(clamped 8..22 m/s). Upward bias and knockback scale with speed
so short stabs don't get a comically large lift or impact.

Spec: §3.3"
```

### Task 2.4: `Sparks.burst()` public method

**Files:**
- Modify: `src/sparks.js`

Add a public `burst({ pos, color, count, ttlMs, ... })` method that bypasses the contact-spike scan and writes particles into the SoA buffers directly. Must run unconditionally (ignore `enabled`) so blood spray fires even when the Sparks toggle is off.

- [ ] **Step 1: Add the burst method to the Sparks class**

In `src/sparks.js`, **after** the `_spawnHit(posThree, strength)` method and **before** `update()`, insert:

```js
  /**
   * One-shot particle burst. Bypasses the contact-spike scan; writes
   * particles directly into the SoA buffer. Runs unconditionally — it
   * does NOT respect this.enabled, so callers like the stab blood-spray
   * fire even when the Sparks toggle is off.
   *
   * Documented limitation: if the Sparks toggle is flipped OFF while a
   * burst is in flight, those particles are wiped (setEnabled zeroes
   * the SoA arrays). Acceptable — toggling mid-burst is rare.
   *
   * @param {{ pos: THREE.Vector3, color?: string, count?: number,
   *           speedMin?: number, speedMax?: number, ttlMs?: number }} opts
   */
  burst({ pos, color = "#c51111", count = 18,
          speedMin = 1.4, speedMax = 4.0, ttlMs = 700 }) {
    // Parse once; PointsMaterial vertexColors expects 0..1 floats.
    const tmpCol = new THREE.Color(color);
    const r = tmpCol.r, g = tmpCol.g, b = tmpCol.b;
    const lifeSec = ttlMs / 1000;

    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const j = idx * 3;

      // Hemisphere bias (matches _spawnHit so the visual reads consistent).
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * 0.85);
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.cos(phi);
      const sz = Math.sin(phi) * Math.sin(theta);
      const speed = speedMin + Math.random() * (speedMax - speedMin);

      this.pos[j + 0] = pos.x;
      this.pos[j + 1] = pos.y;
      this.pos[j + 2] = pos.z;
      this.vel[j + 0] = sx * speed;
      this.vel[j + 1] = sy * speed;
      this.vel[j + 2] = sz * speed;

      this.col[j + 0] = r;
      this.col[j + 1] = g;
      this.col[j + 2] = b;

      this.age[idx] = 0;
      this.life[idx] = lifeSec;
    }

    // Make sure the points are visible and the draw range covers the
    // full ring buffer. update() will tick them down on its own.
    this.points.visible = true;
    this.points.geometry.setDrawRange(0, MAX_PARTICLES);
  }
```

- [ ] **Step 2: Make `update()` advance live particles even when disabled**

The current `update()` has `if (this.enabled) { ... advance live ... }`. Burst writes particles unconditionally, so the advance loop must also run unconditionally — otherwise a burst with the toggle off freezes mid-air.

Find this line in `update()`:

```js
    if (this.enabled) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
```

Replace with:

```js
    // Advance live particles regardless of `enabled` — burst() can spawn
    // particles even when the toggle is off (e.g. stab blood spray).
    {
      for (let i = 0; i < MAX_PARTICLES; i++) {
```

The closing `}` of that block stays as-is (still pairs).

The contact-spike scan below it still gates on `if (!this.enabled || !this.app.data) return;` — unchanged. Spike-driven sparks remain toggle-respecting; only burst-driven particles ignore the toggle.

- [ ] **Step 3: Smoke-test from the console**

Hard-refresh. In DevTools console (with the Sparks toggle OFF):

```js
const v = new THREE.Vector3(0, 1.2, 0);
window.app.sparks.burst({ pos: v, color: "#c51111", count: 18, ttlMs: 700 });
```

Expected: a small puff of red particles appears near the humanoid's torso area, falls under gravity, fades in 700ms. Toggle Sparks back on — confirm contact sparks still emit normally on grab-collisions.

If `app` isn't on `window`: read `src/main.js` near the bottom for how the App instance is exposed (search for `window.app` or `globalThis.app`). Use whatever the existing convention is.

- [ ] **Step 4: Commit**

```bash
git add src/sparks.js
git commit -m "feat(sparks): add public burst() method for one-shot particle spawns

burst({ pos, color, count, ttlMs, ... }) writes particles into the
SoA buffer directly, bypassing the contact-spike scan. Runs
unconditionally — the live-particle advance loop in update() now
runs regardless of this.enabled, so callers like stab blood spray
work even when the Sparks toggle is off.

Spec: §3.3a"
```

### Task 2.5: Wire blood spray into stab contact

**Files:**
- Modify: `src/projects/abilities/stab.js`

Inside the contact branch (where `KNOCK_SPEED` fires), add a `burst()` call at the contact point. Convert the MJ contact position to Three frame using the canonical swizzle.

- [ ] **Step 1: Add the import for THREE if not already there**

The file already imports `THREE` at line 12 — no change needed.

- [ ] **Step 2: Add the burst trigger inside the contact branch**

In `src/projects/abilities/stab.js`, find the contact branch (the `if ((a1 && h2) || (a2 && h1))` block, around lines 112-122). Inside that block, **after** the `data.qvel[torsoDof + 5] = ...` line and **before** `hit = true;`, insert:

```js
          // Blood spray at contact point. MJ→THREE swizzle: (x, y, z)_mj
          // → (x, z, -y)_three. Inverse of the THREE→MJ swizzle used for
          // velocity above.
          const contactPos = new THREE.Vector3(c.pos[0], c.pos[2], -c.pos[1]);
          app.sparks?.burst({
            pos: contactPos,
            color: "#c51111",
            count: 18,
            ttlMs: 700,
          });
```

- [ ] **Step 3: Spawn-test**

Hard-refresh. Spawn Amogus, click Stab. On contact: 18 red particles puff at the contact point, fall, fade in ~700ms. Toggle Sparks OFF, repeat — blood still fires. Toggle Sparks ON, repeat — both blood and contact sparks fire (sparks are warm yellow/orange; blood is red — distinguishable).

If no blood appears: `app.sparks` may be undefined when the catalog initialises. Check that `App.init()` constructs `Sparks` BEFORE `ProjectSystem` (it should — Sparks is created earlier in init).

- [ ] **Step 4: Commit**

```bash
git add src/projects/abilities/stab.js
git commit -m "feat(stab): one-shot red blood spray on contact

18-particle red burst at the MJ contact point, 700ms TTL. Fires
through Sparks.burst() so it ignores the Sparks toggle (narrative
effect, not a debug visual).

Spec: §3.3a"
```

### Task 2.6: §3.9 cleanup — delete redundant explicit hitbox/footprintOffset

**Files (8 defs):**
- Modify: `src/projects/catalog/arrow/index.js`
- Modify: `src/projects/catalog/clearpath/index.js`
- Modify: `src/projects/catalog/outreach/index.js`
- Modify: `src/projects/catalog/peel/index.js`
- Modify: `src/projects/catalog/peter-network/index.js`
- Modify: `src/projects/catalog/republic/index.js`
- Modify: `src/projects/catalog/simulacra/index.js`
- Modify: `src/projects/catalog/olympic-way/index.js` (the def, not the train ability)

Per §3.9: spec lists these 8 as the cleanup cohort. Amogus, Musicity, Oliver Wyman are touched by their own tasks.

**Cleanup is one dedicated commit** so it's easy to revert if any sprite misbehaves. The auto-derive path from Task 1.4 fills both fields when absent.

- [ ] **Step 1: For each of the 8 files, remove the `hitbox:` and `footprintOffset:` lines**

For each file, open it and delete the line(s) of the form:

```js
  hitbox: { hx: ..., hy: ..., hz: ... },
  footprintOffset: ...,
```

Some defs only have `footprintOffset` (no explicit `hitbox`) — that's fine, just remove the `footprintOffset` line.

Do NOT remove the comment block above the values — those are useful historical context for why the silhouette was the way it was. Just remove the JS lines themselves.

- [ ] **Step 2: Spawn each of the 8 affected projects and verify**

Hard-refresh. Spawn each project and confirm:
- Sprite lands flush on the floor (auto-derived `footprintOffset` works)
- Sprite is grabbable; raycast lands on the visible silhouette (auto-derived `hitbox` works)

If any sprite floats or clips: the auto-derive path got the wrong number for that mesh. Restore the explicit override on just that def — auto-derive is best-effort, explicit overrides are still supported.

- [ ] **Step 3: Commit (one commit, all 8 files)**

```bash
git add src/projects/catalog/arrow/index.js src/projects/catalog/clearpath/index.js src/projects/catalog/outreach/index.js src/projects/catalog/peel/index.js src/projects/catalog/peter-network/index.js src/projects/catalog/republic/index.js src/projects/catalog/simulacra/index.js src/projects/catalog/olympic-way/index.js
git commit -m "chore(projects): drop explicit hitbox/footprintOffset from 8 defs

Auto-derive (§3.9) now fills these from the loaded mesh's bbox.
Cleanup pass for the cohort that didn't get a mesh rebuild this
sprint (Amogus/Musicity/Oliver Wyman handled by their own tasks).

Single commit so it's easy to revert if any sprite misbehaves —
explicit overrides still supported on a per-def basis.

Spec: §3.9 cleanup pass"
```

---

## Chunk 3: Camera close-up, hold-G drag, hide-labels, sprite raycast

This chunk is the camera + interaction bundle: cinematic spawn close-up, hold-G to orbit, hide-labels toggle (with localStorage), and sprite-mesh click-to-open-card. They all touch `App` / `ControlsPanel` / `ProjectSystem` but in non-overlapping ways, so each task is self-contained.

### Task 3.1: `App.frameSpawnCloseup(spawnPos, holdMs)` cinematic tween

**Files:**
- Modify: `src/main.js` — add `frameSpawnCloseup` method, patch `updateCamTween` to honour `_userInterrupted` mid-tween
- Modify: `src/controlsPanel.js:204-213` — replace `frameSpawn` call with `frameSpawnCloseup`

The existing `frameSpawn` keeps both humanoid and sprite in frame. The new `frameSpawnCloseup` ignores the humanoid and pushes in tight on the sprite, holds, then returns to default `FRAMING.camPos`/`target`.

**Why the `updateCamTween` patch is needed:** Today (per `src/main.js:114-138`), `updateCamTween` only reads `_userInterrupted` at the *return-trigger boundary* (line 130, on the `prev` tween). Once the return tween is constructed, the field is never consulted again. Spec §3.2 says "user input during the return phase should cancel the auto-finish" — so we add a one-line read on the active tween at the top of `updateCamTween` so input during return actually cancels.

- [ ] **Step 1: Add the method**

In `src/main.js`, **after** the existing `frameSpawn(spawnPos, holdMs = 1800)` method (around line 112) and **before** `updateCamTween()`, insert:

```js
  // Cinematic spawn close-up — pushes in tight on `spawnPos` for `holdMs`,
  // then returns to default framing. Used by the catalog spawn flow so the
  // user sees what they just summoned. See spec §3.2.
  frameSpawnCloseup(spawnPos, holdMs = 1500) {
    // Camera position: 1.4m from spawnPos along the current horizontal
    // bearing. Slightly above (y = spawnPos.y + 0.4) so it's not shot
    // from below.
    const dir = this.camera.position.clone().sub(this.controls.target);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const closeupPos = spawnPos.clone()
      .addScaledVector(dir, 1.4)
      .add(new THREE.Vector3(0, 0.4, 0));
    const closeupTarget = spawnPos.clone();

    this.camTween = {
      t0: performance.now(),
      dur: 700,
      fromPos: this.camera.position.clone(),
      toPos: closeupPos,
      fromTarget: this.controls.target.clone(),
      toTarget: closeupTarget,
      // After hold, snap back to default framing via updateCamTween's
      // existing return-on-returnAt branch.
      returnAt: performance.now() + 700 + holdMs,
    };

    // Snap-cancel on user input — at any phase. The listener stays armed
    // for the full sequence (inbound + hold + return). During inbound and
    // hold we null the tween; during return we set _userInterrupted, which
    // the patched updateCamTween (Step 2) will read on its next tick.
    // OrbitControls fires "start" when the user touches mouse/touch.
    const onStart = () => {
      if (!this.camTween) return;
      const elapsed = performance.now() - this.camTween.t0;
      if (elapsed < 700 + holdMs) {
        // Inbound or hold phase — kill the tween outright.
        this.camTween = null;
      } else {
        // Return phase — mark for cancellation; updateCamTween reads this.
        this.camTween._userInterrupted = true;
      }
      this.controls.removeEventListener("start", onStart);
    };
    this.controls.addEventListener("start", onStart);
    // Also remove the listener once the full sequence finishes naturally,
    // so we don't accumulate listeners.
    setTimeout(() => this.controls.removeEventListener("start", onStart),
               700 + holdMs + 1000);
  }
```

- [ ] **Step 2: Patch `updateCamTween` to honour mid-tween `_userInterrupted`**

In `src/main.js`, find `updateCamTween()` (around line 114). At the **top** of the function body — immediately after `if (!this.camTween) return;` and the `const now = performance.now();` line — insert a single `_userInterrupted` check that catches the flag set during the return phase:

```js
    // Mid-tween interrupt — set by frameSpawnCloseup's "start" listener
    // when the user touches the camera during the auto-return. Existing
    // boundary check (line below) only consults the OLD tween's flag at
    // return-trigger; this catches input AFTER the return has begun.
    if (this.camTween._userInterrupted) {
      this.camTween = null;
      return;
    }
```

The full top of `updateCamTween` becomes:

```js
  updateCamTween() {
    if (!this.camTween) return;
    const now = performance.now();

    // Mid-tween interrupt — see frameSpawnCloseup.
    if (this.camTween._userInterrupted) {
      this.camTween = null;
      return;
    }

    // Trigger return-to-framing after hold period.
    if (this.camTween.returnAt && now >= this.camTween.returnAt) {
      // ... existing code unchanged ...
```

The existing return-trigger branch at the line below (`if (this.camTween.returnAt && now >= this.camTween.returnAt)`) and everything after it stays unchanged. The new check fires on every tick of any active tween — for non-`frameSpawnCloseup` tweens, `_userInterrupted` is `undefined`/falsy, so this is a no-op for them.

- [ ] **Step 3: Replace the spawn-flow camera call**

In `src/controlsPanel.js`, find the spawn click handler (around line 204):

```js
      tile.addEventListener("click", () => {
        const slot = this.app.projectSystem?.spawn(def.id);
        if (slot) {
          showSpawnToast(`Added ${def.label} · drag to grab`);
        } else {
          showSpawnToast("All slots full — clear one to add another");
          console.warn(`No free project slot for ${def.id}`);
        }
        this._paintProjectTiles();
      });
```

Insert a `frameSpawnCloseup` call after the successful spawn. The slot's mesh group is at `slot.group` in THREE world; we need its current world position. Replace the click handler with:

```js
      tile.addEventListener("click", () => {
        const slot = this.app.projectSystem?.spawn(def.id);
        if (slot) {
          showSpawnToast(`Added ${def.label} · drag to grab`);
          // Cinematic close-up on the freshly-spawned sprite. The slot
          // group's matrixWorld was just flushed by mj_forward in spawn().
          slot.group.updateWorldMatrix(true, false);
          const spawnPos = new THREE.Vector3()
            .setFromMatrixPosition(slot.group.matrixWorld);
          this.app.frameSpawnCloseup?.(spawnPos);
        } else {
          showSpawnToast("All slots full — clear one to add another");
          console.warn(`No free project slot for ${def.id}`);
        }
        this._paintProjectTiles();
      });
```

Add the THREE import at the top of `src/controlsPanel.js` if it isn't there:

```bash
grep "import \* as THREE" src/controlsPanel.js
```

If no result, add at the top:

```js
import * as THREE from "three";
```

- [ ] **Step 4: Spawn-test**

Hard-refresh. Click any project tile. Expected:
- Camera tweens in over 700ms toward the spawn point
- Holds tight on the sprite for 1.5s
- Returns to default framing over 900ms (uses the existing `updateCamTween` return branch — verify by reading lines ~119-131 of `main.js`)

Test the three input-cancel branches:
- Touch mouse during **inbound** (first 700ms) → camera snap-cancels and stops moving (listener nulls `camTween`).
- Touch mouse during **hold** (next 1500ms) → camera snap-cancels (same path).
- Touch mouse during **return** (last 900ms) → return tween cancels on the next `updateCamTween` tick (Step 2's mid-tween `_userInterrupted` check).

If the camera doesn't move: `slot.group` may not have its matrixWorld flushed. The `mj_forward` call inside `spawn()` should handle it, but `slot.group.updateWorldMatrix(true, false)` in the click handler is a belt-and-braces guarantee.

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/controlsPanel.js
git commit -m "feat(camera): cinematic spawn close-up

frameSpawnCloseup pushes camera in to 1.4m from spawnPos, holds
1.5s, returns to default framing. Wired into the spawn click flow
in controlsPanel. User input snap-cancels during inbound/hold;
during return, sets _userInterrupted which the patched
updateCamTween reads on its next tick.

Spec: §3.2"
```

### Task 3.2: Hold-G drag-rotate camera

**Files:**
- Modify: `src/main.js` — G keydown/keyup handlers + grab arbitration flag
- Modify: `src/grabber.js:100-153` — early-bail in `onDown` when `app._gKeyHeld`

OrbitControls' default mapping is `LEFT: null, MIDDLE: null, RIGHT: ROTATE` (see `src/main.js:322`). We momentarily flip LEFT to ROTATE while G is held, so left-drag orbits. Grab system is suppressed during hold.

- [ ] **Step 1: Add G key handlers in `App.init()`**

In `src/main.js`, find the existing arrow-key handler block (around line 411-428). **After** the existing `keyup` block, insert:

```js
    // G-key: hold-to-orbit (momentary). LEFT mouse becomes ROTATE while
    // held; grab is suppressed via app._gKeyHeld (read by Grabber.onDown).
    // Mirrors the input-field guard from the arrow-key handlers above so
    // typing "g" in a GUI field doesn't trigger orbit mode.
    addEventListener("keydown", (e) => {
      if (e.code !== "KeyG") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (this._gKeyHeld) return;          // already armed — ignore key-repeat
      this._gKeyHeld = true;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: null,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    });
    addEventListener("keyup", (e) => {
      if (e.code !== "KeyG") return;
      this._gKeyHeld = false;
      // Restore default — see App.init() OrbitControls setup.
      this.controls.mouseButtons = {
        LEFT: null,
        MIDDLE: null,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    });
```

- [ ] **Step 2: Make Grabber bail when G is held**

In `src/grabber.js`, find `onDown` (line 100). At the **very top** of the function body — even before the middle-click branch — insert:

```js
    // Hold-G drag-rotate hand-off: during G-hold, OrbitControls owns
    // LEFT click for camera orbit. Don't start a grab.
    if (this.app._gKeyHeld) return;
```

- [ ] **Step 3: Test**

Hard-refresh. With no projects spawned, hold G + left-drag → camera orbits. Release G → left-drag does nothing (default).

Spawn Amogus, hover to grab, hold G mid-grab attempt → grab does NOT start; camera orbits.

Type "g" in the controls panel (e.g. the wind force slider gets focus and accepts arrow input — though G is unlikely to be typed there) — orbit mode does NOT activate.

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/grabber.js
git commit -m "feat(camera): hold-G drag-rotate (momentary orbit mode)

Hold G + left-drag orbits the camera around controls.target.
Grabber.onDown bails when app._gKeyHeld so grab and orbit don't
fight. Input-field guard mirrors the existing arrow-key handler.

Spec: §3.5"
```

### Task 3.3: Hide-labels toggle

**Files:**
- Modify: `src/projects/system.js` — add `_labelsHidden` field, `setLabelsHidden(v)`, guard in `update()` label loop, guard at label-append time in `spawn()`
- Modify: `src/controlsPanel.js` — add checkbox in Effects section, read/write localStorage, call setter

`localStorage["rex-labels-hidden"]` persists state. Default is `"0"` (visible).

- [ ] **Step 1: Add `_labelsHidden` and the setter to `ProjectSystem`**

In `src/projects/system.js`, in the constructor (around line 26, after `this._screenVec = new THREE.Vector3();`), add:

```js
    this._labelsHidden = false;
```

**After** the constructor, **before** `_installLabelHost()`, add the public setter:

```js
  setLabelsHidden(v) {
    this._labelsHidden = !!v;
    // Apply immediately so the next update() doesn't have to wait for the
    // user to scroll/move to flush the visibility — also makes the toggle
    // feel instant for static cameras.
    for (const slot of this.slots) {
      if (!slot.labelEl) continue;
      slot.labelEl.style.display = this._labelsHidden ? "none" : "";
    }
  }
```

- [ ] **Step 2: Guard the per-frame label loop**

In `update()` (around line 276), the per-slot label loop currently is:

```js
    for (const slot of this.slots) {
      if (!slot.project || !slot.labelEl) continue;
      slot.group.updateWorldMatrix(true, false);
```

Replace the `if` line with a guarded version:

```js
    for (const slot of this.slots) {
      if (!slot.project || !slot.labelEl) continue;
      if (this._labelsHidden) { slot.labelEl.style.display = "none"; continue; }
      slot.group.updateWorldMatrix(true, false);
```

- [ ] **Step 3: Guard label append at spawn time**

In `spawn()` (around line 187), find:

```js
    this._host.appendChild(labelEl);
    slot.labelEl = labelEl;
```

Insert a display-guard between them:

```js
    this._host.appendChild(labelEl);
    if (this._labelsHidden) labelEl.style.display = "none";
    slot.labelEl = labelEl;
```

- [ ] **Step 4: Add checkbox in `ControlsPanel` Effects section**

In `src/controlsPanel.js`, find the Effects section (around line 110-115):

```js
    // Effects
    const fx = this._sectionShell("Effects");
    fx.dataset.section = "effects";
    fx.appendChild(this._row("Trajectory Trails", this._toggle("trails", (v) => { this._set("trails", v); this.app.trails?.setEnabled(v); })));
    fx.appendChild(this._row("Impact Sparks", this._toggle("sparks", (v) => { this._set("sparks", v); this.app.sparks?.setEnabled(v); })));
    root.appendChild(fx);
```

Add a third row for hide-labels — between the existing two rows is fine, or after — your call. Insert this line **before** `root.appendChild(fx);`:

```js
    // Hide-labels: persisted in localStorage["rex-labels-hidden"].
    // Default false. The setter guards both the per-frame loop and the
    // append-at-spawn path inside ProjectSystem.
    const initialHidden = (() => { try { return localStorage.getItem("rex-labels-hidden") === "1"; } catch { return false; } })();
    if (this.app.params) this.app.params.labelsHidden = initialHidden;
    fx.appendChild(this._row("Hide labels", this._toggle("labelsHidden", (v) => {
      this._set("labelsHidden", v);
      this.app.projectSystem?.setLabelsHidden(v);
      try { localStorage.setItem("rex-labels-hidden", v ? "1" : "0"); } catch {}
    })));
```

You also need to apply the persisted state once `ProjectSystem` exists. The `ControlsPanel` is constructed before `ProjectSystem.onSceneLoaded()` finishes mounting slots, so the `setLabelsHidden(initialHidden)` needs to be called after **both** are ready.

In `src/controlsPanel.js`, the `ControlsPanel` constructor calls `this._build()` then `this.refresh()`. The `refresh()` method is called again from `App.switchScene` after `projectSystem.onSceneLoaded()`. Add the application call inside `refresh()`:

Find the `refresh()` method in `controlsPanel.js`. At the top of its body, add:

```js
    // Re-apply hide-labels from params so a scene reload preserves the state.
    if (this.app.projectSystem && this.app.params) {
      this.app.projectSystem.setLabelsHidden(!!this.app.params.labelsHidden);
    }
```

- [ ] **Step 5: Test**

Hard-refresh. Spawn 2-3 projects. Toggle "Hide labels" in Effects → all label pills disappear within one frame. Toggle off → they return.

Reload the page → state persists (whatever you left it).

Spawn a new project while hidden → its label is hidden at append time (no flicker).

- [ ] **Step 6: Commit**

```bash
git add src/projects/system.js src/controlsPanel.js
git commit -m "feat(projects): Hide-labels toggle in Effects panel

Persisted in localStorage[\"rex-labels-hidden\"]. ProjectSystem
gains _labelsHidden flag, setLabelsHidden setter, guards in the
per-frame label loop and at append-at-spawn time. ControlsPanel
adds the checkbox + reads localStorage on construction; refresh()
re-applies after scene reloads.

Spec: §3.1"
```

### Task 3.4: Sprite mesh raycast → open card

**Files:**
- Modify: `src/projects/system.js` — extend `_bindEvents()` with mousedown/mouseup pair

With labels hidden, sprites have no click-to-open path. Add a window-level mousedown→mouseup gate that distinguishes a click (≤200ms, <4px movement) from a drag, and on click raycasts against `app.getGrabbables()` to find the slot.

- [ ] **Step 1: Extend `_bindEvents()`**

In `src/projects/system.js`, find `_bindEvents()` (lines 47-57). **Inside** the function, after the existing `mousedown` listener, append:

```js
    // Sprite mesh click → open card. Required so labels-hidden users can
    // still open project cards. Click vs drag gating: ≤200ms and <4px
    // qualifies as a click. Mousedown does NOT consume the event — grab
    // still receives its pointerdown and starts as normal; if the user
    // drags, we fail the click test on mouseup. If the user just clicks,
    // grab releases on mouseup with no displacement and we fire the card.
    let downX = 0, downY = 0, downT = 0, downBtn = -1;
    addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      downX = e.clientX; downY = e.clientY; downT = performance.now(); downBtn = e.button;
    });
    addEventListener("mouseup", (e) => {
      if (e.button !== 0 || downBtn !== 0) return;
      const dt = performance.now() - downT;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      const moved = Math.hypot(dx, dy);
      downBtn = -1;
      if (dt > 200 || moved >= 4) return;     // drag, not click

      // Skip clicks on UI surfaces — labels and the open card already
      // handle their own clicks; the controls panel is its own subtree.
      if (e.target.closest("#project-card")) return;
      if (e.target.closest(".rex-project-label")) return;
      if (e.target.closest("#rex-controls")) return;

      const grabbables = this.app.getGrabbables?.() || [];
      if (!grabbables.length) return;

      // Build a Raycaster from screen-space NDC to the camera.
      const rect = this.app.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, this.app.camera);
      const hits = raycaster.intersectObjects(grabbables, false);
      if (!hits.length) return;
      const bodyID = hits[0].object.bodyID;
      if (!bodyID || bodyID < 0) return;

      const slot = this.slots.find((s) => s.bodyID === bodyID && s.project);
      if (slot) this.showCard(slot);
    });
```

(Add `THREE.Vector2` and `THREE.Raycaster` — both already imported at the top of `system.js` via the `import * as THREE from "three"` statement.)

- [ ] **Step 2: Test with labels visible**

Hard-refresh. Spawn Amogus. Click directly on the Amogus mesh → card opens. Click and drag the mesh → grab starts, card does NOT open on release. Click somewhere outside the mesh → nothing happens.

- [ ] **Step 3: Test with labels hidden**

Toggle "Hide labels" on. Spawn another project. Click its sprite → card opens.

If the card opens twice (label-click and sprite-click both fire when labels are visible): that's expected and harmless per spec §3.10. If the card opens on every grab-release: the click-vs-drag gate is too lax — verify `dt > 200 || moved >= 4` is the OR direction, not AND.

- [ ] **Step 4: Commit**

```bash
git add src/projects/system.js
git commit -m "feat(projects): sprite mesh raycast → open card

Window-level mousedown/mouseup pair distinguishes click (<=200ms,
<4px) from drag. Click raycasts against getGrabbables(); first hit
whose bodyID matches a slot.project opens that slot's card. Skips
UI surfaces (#project-card, .rex-project-label, #rex-controls) so
existing handlers aren't bypassed.

Required so hide-labels mode (§3.1) doesn't make sprites
inaccessible.

Spec: §3.10"
```

---

## Chunk 4: Musicity voxel apartment, Oliver Wyman extruded logo + roomba

These two sprite rebuilds are independent of the FBX work and each other. Musicity adds the new `onSpawn` hook (idle palette cycle); Oliver Wyman adds a new `roomba` ability and removes `sprint`.

### Task 4.1: ProjectSystem honours `def.onSpawn`

**Files:**
- Modify: `src/projects/system.js:106-205` (the `spawn` method)

After the mesh is mounted and the label is appended, call `def.onSpawn?.(slot, ctx)` if present and push the returned tick into `_activeAbilities` with a `_slotBodyID` tag and `_isIdle` flag.

- [ ] **Step 1: Patch `spawn()` to call `onSpawn`**

In `src/projects/system.js`, at the **very end** of `spawn()` (just before `return slot;`), insert:

```js
    // Idle hooks — abilities are user-fired; onSpawn is automatic. The
    // returned tick (if any) lives in _activeAbilities with the same
    // _slotBodyID tag _fireAbility uses, so _park can cancel it.
    if (typeof def.onSpawn === "function") {
      const tick = def.onSpawn(slot, { app: this.app, mesh: slot.meshGroup });
      if (tick && typeof tick.tick === "function") {
        tick._slotBodyID = slot.bodyID;
        tick._isIdle = true;
        this._activeAbilities.push(tick);
      }
    }
```

The existing `_park` (line 225-233) filters `_activeAbilities` by `_slotBodyID`, so idle ticks are cancelled when the slot is parked — no extra code needed.

The existing `onSceneLoaded` (line 60-65) cancels and clears `_activeAbilities`. Idle ticks naturally die with their sprites since the spawn flow doesn't auto-re-spawn after scene reload — explicitly noted in the spec §3.6.

- [ ] **Step 2: Smoke-test (no defs use onSpawn yet)**

Hard-refresh. Spawn each project. Behaviour should be identical to before (no onSpawn defs exist yet, so the new branch never fires).

- [ ] **Step 3: Commit**

```bash
git add src/projects/system.js
git commit -m "feat(projects): ProjectSystem honours optional def.onSpawn

If a def declares onSpawn(slot, ctx), it's called after the mesh is
mounted; the returned { tick(dt) } object is registered in
_activeAbilities tagged _slotBodyID + _isIdle. Cancelled by _park
and onSceneLoaded via the existing _slotBodyID filter.

Used by §3.6 (Musicity palette cycle).

Spec: §3.6"
```

### Task 4.2: Musicity — voxel apartment + palette cycle

**Files:**
- Modify: `src/projects/catalog/musicity/proportions.js` — replace skyline constants with apartment + palettes
- Modify: `src/projects/catalog/musicity/build.js` — InstancedMesh voxel apartment generator
- Modify: `src/projects/catalog/musicity/index.js` — add `onSpawn` hook for cycle; drop `footprintOffset`

The `chord` ability still flashes; we update its restoration to snapshot current colour at flash-time (so it doesn't fight the cycle).

- [ ] **Step 1: Rewrite `proportions.js`**

Replace the entire file with:

```js
// Musicity — voxel apartment block + palette cycle.
// See spec §3.6.

export const VOXEL_SIZE = 0.06;     // MJ-units per voxel
export const GRID = { w: 10, h: 10, d: 10 };

// Voxel layout helper. Returns Uint8Array[w*h*d] where each cell is:
//   0 = empty
//   1 = wall
//   2 = window
//   3 = balcony
// Floors at y = 0, 3, 6, 9. Walls on perimeter. One door cut at front-
// middle of ground floor. Two windows per cardinal face on each non-
// ground floor. One balcony tile in front-middle of each non-ground floor.
export function generateApartment() {
  const W = GRID.w, H = GRID.h, D = GRID.d;
  const v = new Uint8Array(W * H * D);
  const idx = (x, y, z) => x + W * (y + H * z);

  const FLOORS = [0, 3, 6, 9];
  for (const fy of FLOORS) {
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        // Floor slab.
        v[idx(x, fy, z)] = 1;
        // Perimeter walls one voxel above the floor (only on non-top floors).
        if (fy < H - 1) {
          const onPerim = (x === 0 || x === W - 1 || z === 0 || z === D - 1);
          if (onPerim) {
            v[idx(x, fy + 1, z)] = 1;
            v[idx(x, fy + 2, z)] = 1;
          }
        }
      }
    }
  }

  // Door cut: ground floor (fy = 0), front face (z = 0), middle x.
  const midX = Math.floor(W / 2);
  v[idx(midX, 1, 0)] = 0;
  v[idx(midX, 2, 0)] = 0;

  // Windows on non-ground floors. Two per cardinal face per floor.
  for (let i = 1; i < FLOORS.length; i++) {
    const fy = FLOORS[i];
    const winY = fy + 1;
    // Front (z=0) and back (z=D-1).
    v[idx(2, winY, 0)] = 2;       v[idx(W - 3, winY, 0)] = 2;
    v[idx(2, winY, D - 1)] = 2;   v[idx(W - 3, winY, D - 1)] = 2;
    // Left (x=0) and right (x=W-1).
    v[idx(0, winY, 2)] = 2;       v[idx(0, winY, D - 3)] = 2;
    v[idx(W - 1, winY, 2)] = 2;   v[idx(W - 1, winY, D - 3)] = 2;
  }

  // Balcony tile: front-middle of each non-ground floor, extruded one
  // voxel forward (z = -1, but we model as z = 0 with type=3 and let
  // the per-instance matrix push it forward at build time).
  for (let i = 1; i < FLOORS.length; i++) {
    const fy = FLOORS[i];
    v[idx(midX, fy, 0)] = 3;
  }

  return v;
}

export const PALETTES = [
  { wall: "#d4a05a", window: "#f3d27a", balcony: "#8b6a3a" }, // current Musicity warm
  { wall: "#5a7d8c", window: "#a8d4e0", balcony: "#2c4148" }, // teal
  { wall: "#c97064", window: "#f4c5b8", balcony: "#7a3429" }, // terracotta
  { wall: "#7e6b9e", window: "#cdb8e0", balcony: "#3d2e54" }, // mauve
  { wall: "#6b8e5a", window: "#c5d9b0", balcony: "#3a4d2c" }, // moss
];

export const PALETTE_PERIOD_MS = 2500;
```

- [ ] **Step 2: Rewrite `build.js`**

Replace the entire file with:

```js
// Musicity — voxel apartment built with three InstancedMesh instances
// (one per material type). See spec §3.6.

import { generateApartment, GRID, VOXEL_SIZE, PALETTES } from "./proportions.js";

export function buildMesh({ THREE }) {
  const voxels = generateApartment();
  const W = GRID.w, H = GRID.h, D = GRID.d;

  // Three materials — one per type. Initial colours from PALETTES[0].
  // The onSpawn cycle mutates material.color directly, so geometry
  // is not rebuilt across palette changes.
  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTES[0].wall),
    roughness: 0.65, metalness: 0.05,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTES[0].window),
    transparent: true, opacity: 0.65,
    roughness: 0.2, metalness: 0.4,
    emissive: new THREE.Color(PALETTES[0].window),
    emissiveIntensity: 0.15,
  });
  const balconyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTES[0].balcony),
    roughness: 0.7, metalness: 0.05,
  });

  // Count per type so we can size the InstancedMesh count exactly.
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < voxels.length; i++) counts[voxels[i]]++;

  const cubeGeom = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

  const wallMesh    = new THREE.InstancedMesh(cubeGeom, wallMat,    Math.max(1, counts[1]));
  const windowMesh  = new THREE.InstancedMesh(cubeGeom, windowMat,  Math.max(1, counts[2]));
  const balconyMesh = new THREE.InstancedMesh(cubeGeom, balconyMat, Math.max(1, counts[3]));
  wallMesh.castShadow = true;    wallMesh.receiveShadow = true;
  balconyMesh.castShadow = true; balconyMesh.receiveShadow = true;
  // Windows shouldn't cast hard shadows.

  // Centre the apartment so its xz centre is at slot origin and base at y=0.
  const offsetX = -((W - 1) * VOXEL_SIZE) / 2;
  const offsetZ = -((D - 1) * VOXEL_SIZE) / 2;
  const offsetY = 0;

  const m = new THREE.Matrix4();
  const cursors = [0, 0, 0, 0];
  for (let z = 0; z < D; z++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = voxels[x + W * (y + H * z)];
        if (t === 0) continue;
        // Balcony tiles extrude one voxel forward (z direction).
        const zPush = (t === 3) ? -VOXEL_SIZE : 0;
        m.makeTranslation(
          offsetX + x * VOXEL_SIZE,
          offsetY + y * VOXEL_SIZE,
          offsetZ + z * VOXEL_SIZE + zPush,
        );
        const mesh = t === 1 ? wallMesh : t === 2 ? windowMesh : balconyMesh;
        mesh.setMatrixAt(cursors[t]++, m);
      }
    }
  }
  wallMesh.count = cursors[1];
  windowMesh.count = cursors[2];
  balconyMesh.count = cursors[3];
  wallMesh.instanceMatrix.needsUpdate = true;
  windowMesh.instanceMatrix.needsUpdate = true;
  balconyMesh.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.name = "musicity_mesh";
  group.add(wallMesh, windowMesh, balconyMesh);

  // Stash material refs so the onSpawn cycle (and chord) can mutate them
  // without re-traversing.
  group.userData.musicityMats = { wall: wallMat, window: windowMat, balcony: balconyMat };

  return group;
}
```

- [ ] **Step 3: Rewrite `index.js`**

Replace the entire file with:

```js
// Musicity — Encode AI Hackathon. Voxel apartment with palette cycle.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import { PALETTES, PALETTE_PERIOD_MS } from "./proportions.js";

export default {
  id: "musicity",
  label: "Musicity",
  title: "Musicity — Encode AI Hackathon",
  subtitle: "city + music × AI",
  meta: "Encode · hackathon · music",
  accent: "#d4a05a",
  description:
    "Musicity was an Encode AI Hackathon entry at the intersection of cities and music — the skyline below and the floating note above are the sprite's shorthand. Full project writeup pending.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/musicity" },
  ],
  abilityLabel: "Play!",
  ability: "chord",
  // Hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE }),
  // Idle palette cycle. Crossfades between PALETTES every PALETTE_PERIOD_MS.
  onSpawn(slot, ctx) {
    const mats = ctx.mesh?.userData?.musicityMats;
    if (!mats) return null;
    let elapsed = 0;
    // Working colour objects so we don't allocate per frame.
    const tmpCol = new THREE.Color();
    const colA = new THREE.Color();
    const colB = new THREE.Color();
    return {
      tick(dtMs) {
        elapsed += dtMs;
        const phase = elapsed / PALETTE_PERIOD_MS;
        const i = Math.floor(phase) % PALETTES.length;
        const j = (i + 1) % PALETTES.length;
        const f = phase - Math.floor(phase);
        for (const key of ["wall", "window", "balcony"]) {
          colA.set(PALETTES[i][key]);
          colB.set(PALETTES[j][key]);
          tmpCol.copy(colA).lerp(colB, f);
          mats[key].color.copy(tmpCol);
        }
        return true;     // run forever (cancelled by _park)
      },
      cancel() { /* nothing to restore — colours don't need preserving */ },
    };
  },
};
```

- [ ] **Step 4: Update `chord` to snapshot colour at flash-time, not stash a stale baseline**

In `src/projects/abilities/chord.js`, the current `chord` reads the music note's emissive intensity. The voxel rebuild deletes the music note entirely — so `note.userData.baseY` and `userData.material` won't exist. The current `chord` will fail soft (it returns the no-op tick when `note` isn't found).

For now, accept that the "Play!" button on the new Musicity will be a no-op — but this is bad UX. Decision to surface to the user: should "Play!" do something on the voxel apartment too?

**Spec §3.6 says:** "Play!" button still fires `chord` and the palette cycle resumes after — implying chord still works. But with no music note, it can't. Two options:

  - **(a)** Repurpose `chord` to flash all three materials' emissive intensity briefly (snapshot current colours, lerp to a brighter version, restore from snapshot).
  - **(b)** Replace the ability with a no-op so the spec acceptance criterion ("Play! still fires chord and the palette cycle resumes") holds vacuously.

**Recommend (a).** Modify `chord.js` to detect `mesh.userData.musicityMats` and, if present, flash all three. Keep the music-note path as fallback for any future caller.

Replace `src/projects/abilities/chord.js` with:

```js
// Chord ability — flashes Musicity's materials briefly, then restores
// from a colour snapshot taken at flash-time (so the idle palette cycle
// in onSpawn doesn't fight the restore). See spec §3.6 chord handoff note.

import * as THREE from "three";

const DURATION_MS = 1200;
const FLASH_HZ = 3.0;

export function chord({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  // Voxel-apartment path (current Musicity).
  const mats = mesh.userData?.musicityMats;
  if (mats) {
    // Snapshot at flash-time so the cycle's mutation doesn't get clobbered.
    const snap = {
      wall: mats.wall.color.clone(),
      window: mats.window.color.clone(),
      balcony: mats.balcony.color.clone(),
    };
    let elapsed = 0;
    let disposed = false;
    function restore() {
      if (disposed) return;
      disposed = true;
      // Restore from snapshot — the cycle's tick will overwrite again
      // next frame, which is exactly what we want.
      mats.wall.color.copy(snap.wall);
      mats.window.color.copy(snap.window);
      mats.balcony.color.copy(snap.balcony);
    }
    const flashCol = new THREE.Color("#ffe8b0");
    return {
      tick(dtMs) {
        if (disposed) return false;
        elapsed += dtMs;
        const t = elapsed / 1000;
        const k = 0.5 + 0.5 * Math.sin(2 * Math.PI * FLASH_HZ * t);
        // Lerp each material colour from its snapshot toward warm white.
        for (const key of ["wall", "window", "balcony"]) {
          mats[key].color.copy(snap[key]).lerp(flashCol, k * 0.6);
        }
        if (elapsed >= DURATION_MS) {
          restore();
          return false;
        }
        return true;
      },
      cancel() { restore(); },
    };
  }

  // Legacy music-note path (any future caller).
  let note = null;
  mesh.traverse((o) => { if (o.name === "musicity-note") note = o; });
  if (!note) return { tick() { return false; } };
  const baseY = note.userData.baseY ?? note.position.y;
  let mat = note.userData.material;
  if (!mat) note.traverse((o) => { if (o.isMesh && !mat) mat = o.material; });
  const baseEmissive = mat?.emissiveIntensity ?? 0.5;
  let elapsed = 0; let disposed = false;
  function restore() {
    if (disposed) return;
    disposed = true;
    if (note) note.position.y = baseY;
    if (mat) mat.emissiveIntensity = baseEmissive;
  }
  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      const t = elapsed / 1000;
      note.position.y = baseY + 0.30 * Math.sin(2 * Math.PI * 2.0 * t);
      if (mat) mat.emissiveIntensity = 0.4 + 0.4 * Math.sin(2 * Math.PI * 3.0 * t);
      if (elapsed >= 2500) { restore(); return false; }
      return true;
    },
    cancel() { restore(); },
  };
}
```

- [ ] **Step 5: Test**

Hard-refresh. Spawn Musicity. Expected:
- Tiny voxel apartment appears (10×10×10 cubes, three colours: walls/windows/balcony)
- Palette crossfades smoothly between 5 palettes every 2.5s
- Click "Play!" → all three materials flash warm-white for ~1.2s, then return to whatever palette colour the cycle is at
- Sprite is grabbable; the cycle continues while held

If the apartment is microscopic or huge: tweak `VOXEL_SIZE` in `proportions.js`. Spec says 0.06 MJ-units → 0.6 total. If it's offset wrong: check the `offsetX/offsetY/offsetZ` math.

If the cycle dies after a flash (cycle stops): the `chord` restore is wiping over the cycle's writes. Verify that the cycle is still in `_activeAbilities` after `chord` ends — the chord dispose shouldn't touch the cycle's idle tick.

- [ ] **Step 6: Commit**

```bash
git add src/projects/catalog/musicity/ src/projects/abilities/chord.js
git commit -m "feat(musicity): voxel apartment with palette cycle + flash chord

Replaces the three-block skyline with a 10x10x10 voxel apartment
built from three InstancedMesh instances (wall/window/balcony).
onSpawn registers an idle tick that crossfades through 5 palettes
every 2.5s. chord ability now snapshots material colours at
flash-time so the cycle and the flash coexist; legacy music-note
path retained as fallback for any future caller.

Spec: §3.6"
```

### Task 4.3: Roomba ability + Oliver Wyman extruded logo rebuild

**Files:**
- Create: `src/projects/abilities/roomba.js`
- Modify: `src/projects/abilities/index.js` — register `roomba`, drop `sprint`
- Delete: `src/projects/abilities/sprint.js`
- Modify: `src/projects/catalog/oliver-wyman/proportions.js` — replace track/dots with logo + plate
- Modify: `src/projects/catalog/oliver-wyman/build.js` — extruded logo + backing plate + pedestal
- Modify: `src/projects/catalog/oliver-wyman/index.js` — `ability: "roomba"`, `abilityLabel: "Roomba!"`

The roomba ability writes linear x/y velocities (and a small z bump on heading change) for 2.5s. Sprite stays grounded.

- [ ] **Step 1: Create `src/projects/abilities/roomba.js`**

```js
// Roomba ability — Oliver Wyman sprite skids around the playground floor
// for 2.5s, changing heading every ~400ms. See spec §3.7a.

const DURATION_MS = 2500;
const HEADING_CHANGE_MS = 400;
const SPEED = 1.5;            // m/s in MJ x/y plane
const SKID_BUMP = 0.4;        // upward kick (MJ z) on each heading change
const TURN_LERP = 0.15;       // currentHeading lerp per tick

export function roomba({ app, slot }) {
  const model = app.model, data = app.data;
  if (!model || !data) return { tick() { return false; } };

  const jntAdr = model.body_jntadr[slot.bodyID];
  if (jntAdr < 0 || model.jnt_type[jntAdr] !== 0) {
    // Not a freejoint body — bail.
    return { tick() { return false; } };
  }
  const dofAdr = model.jnt_dofadr[jntAdr];

  let currentHeading = Math.random() * Math.PI * 2;
  let targetHeading = Math.random() * Math.PI * 2;
  let elapsed = 0;
  let lastChangeAtMs = -HEADING_CHANGE_MS;     // forces an initial bump

  return {
    tick(dtMs) {
      elapsed += dtMs;
      if (elapsed >= DURATION_MS) return false;

      // Don't fight the grab spring.
      if (app.grabber?.active && app.grabber?.bodyID === slot.bodyID) {
        return true;
      }

      const dtSec = Math.max(0.0001, dtMs / 1000);
      const prevHeading = currentHeading;

      // Heading change.
      if (elapsed - lastChangeAtMs > HEADING_CHANGE_MS) {
        targetHeading = Math.random() * Math.PI * 2;
        lastChangeAtMs = elapsed;
        // Skid bump.
        data.qvel[dofAdr + 2] = SKID_BUMP;
      }

      // Smooth turn toward target.
      // Pick the shorter angular delta so we don't loop the long way.
      let delta = targetHeading - currentHeading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      currentHeading += delta * TURN_LERP;

      // Linear x/y velocity.
      data.qvel[dofAdr + 0] = Math.cos(currentHeading) * SPEED;
      data.qvel[dofAdr + 1] = Math.sin(currentHeading) * SPEED;
      // Angular yaw matches the turn rate (MJ z is up — angular DOF index 5).
      data.qvel[dofAdr + 5] = (currentHeading - prevHeading) / dtSec;

      return true;
    },
    cancel() {
      // Optional: zero the linear velocity on cancel so the sprite stops
      // sliding when the ability ends mid-flight.
      try {
        data.qvel[dofAdr + 0] = 0;
        data.qvel[dofAdr + 1] = 0;
      } catch (_) {}
    },
  };
}
```

- [ ] **Step 2: Register roomba and drop sprint in the registry**

Replace `src/projects/abilities/index.js` with:

```js
// Ability registry — string-keyed lookup table.
import { stab } from "./stab.js";
import { topple } from "./topple.js";
import { pulse } from "./pulse.js";
import { swarm } from "./swarm.js";
import { cycle } from "./cycle.js";
import { heatmap } from "./heatmap.js";
import { dispatch } from "./dispatch.js";
import { settle } from "./settle.js";
import { launch } from "./launch.js";
import { chord } from "./chord.js";
import { roomba } from "./roomba.js";

export const ABILITIES = {
  stab, topple, pulse, swarm, cycle,
  heatmap, dispatch, settle, launch, chord,
  roomba,
};
```

(`sprint` removed from imports and the export object.)

- [ ] **Step 3: Delete `sprint.js`**

```bash
git rm src/projects/abilities/sprint.js
```

- [ ] **Step 4: Rewrite `oliver-wyman/proportions.js`**

Replace the entire file with:

```js
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
```

- [ ] **Step 5: Rewrite `oliver-wyman/build.js`**

Replace with:

```js
// Oliver Wyman — extruded brand mark + backing plate + pedestal.
// See spec §3.7.

function buildOWLogoShape(THREE) {
  // Hand-traced approximation of the OW mark — two stylised "V" forms
  // meeting at a centre point. Refine if visual QA flags it; spec only
  // requires "reads as the OW mark from 3m away".
  const s = new THREE.Shape();
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

export function buildMesh({ THREE, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const logoMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.logo),
    roughness: 0.45, metalness: 0.2,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.plate),
    roughness: 0.7, metalness: 0.05,
  });
  const pedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.pedestal),
    roughness: 0.8, metalness: 0.1,
  });

  const group = new THREE.Group();
  group.name = "oliver_wyman_mesh";

  // Pedestal (base).
  const pedY = SIZES.pedestalBaseY + SIZES.pedestalH / 2;
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.pedestalR, SIZES.pedestalR, SIZES.pedestalH, 40),
    pedMat,
  );
  ped.position.y = pedY;
  ped.castShadow = true; ped.receiveShadow = true;
  group.add(ped);

  // Backing plate, sitting on the pedestal. Centred upright so its xy
  // plane faces +Z.
  const plateBaseY = SIZES.pedestalBaseY + SIZES.pedestalH;
  const plateCentreY = plateBaseY + SIZES.plateH / 2;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.plateW, SIZES.plateH, SIZES.plateD),
    plateMat,
  );
  plate.position.y = plateCentreY;
  plate.castShadow = true; plate.receiveShadow = true;
  group.add(plate);

  // Extruded logo, in front of the plate. Shape lives in the X/Y plane
  // (per the helper), extruded along +Z. We orient it so the extrude
  // axis points +Z (toward the viewer) and translate it just proud of
  // the plate's front face.
  const shape = buildOWLogoShape(THREE);
  const logoGeom = new THREE.ExtrudeGeometry(shape, {
    depth: SIZES.logoExtrude,
    bevelEnabled: false,
  });
  // Scale the unit-ish shape down to fit the plate. Shape spans roughly
  // x:-0.5..0.5, y:-0.3..0.3 — scale to fit ~80% of plate width.
  const targetW = SIZES.plateW * 0.8;
  const k = targetW / 1.0;       // shape width is 1.0 in the helper
  const logo = new THREE.Mesh(logoGeom, logoMat);
  logo.scale.setScalar(k);
  logo.position.set(0, plateCentreY, SIZES.plateD / 2 + 0.001);
  logo.castShadow = true;
  group.add(logo);

  return group;
}
```

- [ ] **Step 6: Rewrite `oliver-wyman/index.js`**

Replace with:

```js
// Oliver Wyman Datathon — 1st place. Extruded logo + backing plate.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";

export default {
  id: "oliver-wyman",
  label: "Oliver Wyman Datathon",
  title: "Oliver Wyman Datathon — 1st place",
  subtitle: "marathon performance · 14-variable regression",
  meta: "datathon · regression · endurance",
  accent: "#e6372a",
  description:
    "A 14-variable linear regression on marathon performance data — splits, pace, elevation, weather, fuelling, sleep — teasing out which signals actually move finish time and which are just gym folklore. Took 1st place at the Oliver Wyman Datathon.",
  links: [],
  abilityLabel: "Roomba!",
  ability: "roomba",
  // Hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE, proportions }),
};
```

- [ ] **Step 7: Test**

Hard-refresh. The Oliver Wyman tile in the controls panel still appears (no validator errors). Spawn it:
- Sprite reads as a navy extruded "OW-shaped" mark on a white plate atop a grey pedestal
- Sprite lands flush on the floor (auto-derived offset)
- Click "Roomba!" — sprite skids around the floor for 2.5s with sharp turns; angular yaw matches the turn; small z-bumps on heading changes; stays grounded
- Grabbing during roomba doesn't fight the spring (per the `app.grabber.active` check)

If sprint shows up as "missing in registry" anywhere: there's a stale reference. Grep:

```bash
grep -rn "sprint" src/projects/
```

The only legitimate matches should be in this commit's diff or the `_ralph_subagent_prompt.md` doc.

If the logo extrude looks like a meaningless lump: the hand-traced shape needs refinement. Adjust the control points in `buildOWLogoShape`.

- [ ] **Step 8: Commit**

```bash
git add src/projects/abilities/roomba.js src/projects/abilities/index.js src/projects/abilities/sprint.js src/projects/catalog/oliver-wyman/
git commit -m "feat(oliver-wyman): extruded logo + roomba ability

Replaces the running-track + scatter-dots procedural sprite with a
navy ExtrudeGeometry brand mark on a white backing plate atop the
existing pedestal. Sprint ability deleted (no other consumer);
new roomba ability skids the sprite around the floor for 2.5s
with sharp turns, smooth heading lerp, and small z-bumps per
heading change. Grab-arbitration via app.grabber.active check.

Spec: §3.7, §3.7a"
```

---

## Chunk 5: Olympic Way Bombardier S Stock dune-worm train + attribution

This chunk is self-contained: download an FBX from Sketchfab, register `dune-worm` ability, swap Olympic Way's `pulse` to it, append CC-BY attribution to PortfolioOverlay + README. The Olympic Way roundel sprite stays unchanged (only the ability and the catalog def's `abilityFbx`/`ability` change).

### Task 5.1: Download Bombardier S Stock FBX, verify licence, save asset

**Files:**
- Create: `assets/models/bombardier-s-stock.fbx`

This is a manual step — Sketchfab's `gh` doesn't apply, and Rex needs to fetch the file from a logged-in browser session.

- [ ] **Step 1: Open the Sketchfab asset page**

URL: [Bombardier S Stock London Underground](https://sketchfab.com/3d-models/bombardier-s-stock-london-underground-a6718eff2dc843c48fd54376b4c70b06)

- [ ] **Step 2: Verify the licence on the page**

Look for the "License" badge in the right sidebar. Spec assumes **CC-BY 4.0** — confirm. If the licence has changed (e.g. to CC-BY-NC, CC-BY-SA, or Standard) **stop**, surface to Rex, do not download. The attribution copy in step 5 assumes CC-BY 4.0.

- [ ] **Step 3: Download the FBX export**

Sign in to Sketchfab if needed. Click "Download 3D Model" → choose "FBX" format → save the archive. Extract.

- [ ] **Step 4: Save the FBX to `assets/models/bombardier-s-stock.fbx`**

Move the extracted FBX file to `assets/models/bombardier-s-stock.fbx`. If the archive contains sibling textures (PNG/JPG files), save them alongside, preserving original filenames.

```bash
ls -lh assets/models/
```

Expected: `bombardier-s-stock.fbx` exists. Size will vary; anything under ~5MB is fine.

- [ ] **Step 5: Commit the asset**

```bash
git add assets/models/
git commit -m "chore(assets): add Bombardier S Stock FBX (timblewee, CC-BY 4.0)

Source: https://sketchfab.com/3d-models/bombardier-s-stock-london-underground-a6718eff2dc843c48fd54376b4c70b06"
```

### Task 5.2: Add attribution to PortfolioOverlay + README

**Files:**
- Modify: `src/portfolioOverlay.js` — append attribution line in the footer
- Modify: `README.md` — add a "Third-party assets" section

CC-BY requires attribution. Spec §3.8 specifies the exact line:

> Bombardier S Stock by timblewee — CC-BY 4.0 (sketchfab.com/timblewee)

If the Amogus FBX licence also requires attribution (verify on its source page — `https://www.cgian.com/2018/10/free-among-us-3d-model.html` or similar), add a second line for it. Spec leaves this conditional.

- [ ] **Step 1: Find the PortfolioOverlay footer**

```bash
grep -n "footer\|<footer\|attribution\|credit" src/portfolioOverlay.js
```

Open `src/portfolioOverlay.js` and locate the footer / bottom-area markup. The exact insertion point depends on the file's structure — pick the existing footer or, if no footer exists, add a small `<div class="rex-overlay-credits">` at the bottom of the overlay's panel.

- [ ] **Step 2: Append the attribution line**

In whatever footer/credits block exists, append (preserving the file's existing markup style):

```html
<div class="rex-overlay-credit">Bombardier S Stock by timblewee — CC-BY 4.0 (<a href="https://sketchfab.com/timblewee" target="_blank" rel="noopener noreferrer">sketchfab.com/timblewee</a>)</div>
```

If no footer/credits container exists, add minimal CSS in the same file (or in `src/ui.js`'s injected stylesheet) so the line reads small and unobtrusive — `font-size: 11px; opacity: 0.6; padding: 8px 12px;`.

- [ ] **Step 3: Add a "Third-party assets" section to README.md**

```bash
cat README.md | head -20
```

Open `README.md`. At the bottom (or in an appropriate location), add:

```markdown
## Third-party assets

- Bombardier S Stock London Underground by [timblewee](https://sketchfab.com/timblewee) — CC-BY 4.0 (https://sketchfab.com/3d-models/bombardier-s-stock-london-underground-a6718eff2dc843c48fd54376b4c70b06)
```

If the Amogus FBX requires attribution per its source-page licence, add a bullet for it too.

- [ ] **Step 4: Commit**

```bash
git add src/portfolioOverlay.js README.md
git commit -m "docs: add CC-BY attribution for Bombardier S Stock FBX

PortfolioOverlay footer + README \"Third-party assets\" section per
Sketchfab licence requirements.

Spec: §3.8"
```

### Task 5.3: Wire `abilityFbx` for Olympic Way + create dune-worm ability

**Files:**
- Modify: `src/projects/catalog/olympic-way/index.js` — add `abilityFbx`, swap `ability: "pulse"` → `"dune-worm"`, swap `abilityLabel`
- Create: `src/projects/abilities/dune-worm.js`
- Modify: `src/projects/abilities/index.js` — register `dune-worm`

The train mesh is preloaded by `assets.js` into `modelCache.bombardier` (via the `cacheKey: "bombardier"` field). The ability clones it on fire, parents it to the scene root, runs the trajectory, applies bbox-vs-bbox knockback to the humanoid root, then disposes.

- [ ] **Step 1: Update `olympic-way/index.js`**

Replace with:

```js
// Olympic Way — Susquehanna Datathon 2026 · 1st place.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "olympic-way",
  label: "Olympic Way",
  title: "Olympic Way Interchange — Susquehanna Datathon 2026 · 1st place",
  subtitle: "2026 · graph-theoretic station siting",
  meta: "datathon · graph theory · Monte Carlo",
  accent: "#dc241f",
  description:
    "A new tube station, sited by graph theory rather than planning politics. Given a 358-node underground network, the model treats every candidate Olympic Way interchange as a shortest-path shift across the system and runs Monte Carlo over passenger flow to score which location relieves the most load with the fewest dominoes. Took 1st place at the Susquehanna Datathon 2026.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/london_lsoa_map" },
  ],
  abilityLabel: "Summon Train!",
  ability: "dune-worm",
  // Ability mesh — Bombardier S Stock train (preloaded into
  // modelCache.bombardier). Sprite mesh stays procedural (the roundel +
  // plinth from build.js); only the ability uses the FBX.
  abilityFbx: {
    url: "./assets/models/bombardier-s-stock.fbx",
    target: { axis: "z", value: 3.0 },
    cacheKey: "bombardier",
  },
  // Sprite hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
```

- [ ] **Step 2: Create `src/projects/abilities/dune-worm.js`**

```js
// Dune-worm train ability — Olympic Way summons a Bombardier S Stock
// train that bursts up from one scene edge, arcs through the playground,
// and dives back into the ground at the opposite edge, knocking down
// anything in its path. See spec §3.8.

import * as THREE from "three";
import { modelCache } from "../assets.js";
import { findBody } from "./impulse.js";

const TOTAL_MS = 3500;
const EMERGE_MS = 500;
const DIVE_MS = 500;
const ARC_PEAK_Y = 1.6;
const SUBTERRANEAN_Y = -1.0;
const EMERGE_Y = 0.4;
const HIT_COOLDOWN_MS = 200;

export function duneWorm({ app }) {
  const cached = modelCache.bombardier;
  if (!cached) {
    console.warn("[dune-worm] modelCache.bombardier missing — preload failed?");
    return { tick() { return false; } };
  }

  // Clone parented to scene root (not slot.group) so the train moves
  // through the world independently of the Olympic Way roundel sprite.
  const trainGroup = cached.clone(true);
  trainGroup.name = "dune_worm_train";
  app.scene.add(trainGroup);

  // Trajectory: pick one of two opposite scene-edge endpoints. Random
  // sign so successive fires alternate direction.
  const sign = Math.random() < 0.5 ? -1 : 1;
  const startPos = new THREE.Vector3(-4 * sign, SUBTERRANEAN_Y, 0);
  const emergePos = new THREE.Vector3(-4 * sign, EMERGE_Y, 0);
  const peakPos = new THREE.Vector3(0, ARC_PEAK_Y, 0);
  const overEdgePos = new THREE.Vector3(4 * sign, EMERGE_Y, 0);
  const endPos = new THREE.Vector3(4 * sign, SUBTERRANEAN_Y, 0);

  // Hit cooldown per humanoid body.
  const lastHitMs = new Map();

  // Velocity finite-difference state.
  const prevPos = trainGroup.position.clone();
  prevPos.copy(startPos);
  const trainBox = new THREE.Box3();
  const bodyBox = new THREE.Box3();
  const trainVel = new THREE.Vector3();

  let elapsed = 0;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (trainGroup.parent) trainGroup.parent.remove(trainGroup);
    trainGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose?.());
    });
  }

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      if (elapsed >= TOTAL_MS) {
        dispose();
        return false;
      }

      // Phase calculation.
      let pos;
      let pitch = 0;        // rotation around the X axis (nose up/down)
      if (elapsed < EMERGE_MS) {
        // Emergence — ease-out lerp from start to emergePos.
        const t = elapsed / EMERGE_MS;
        const e = 1 - Math.pow(1 - t, 2);
        pos = startPos.clone().lerp(emergePos, e);
        pitch = (Math.PI / 3) * (1 - e);    // 60° → 0° as emergence completes
      } else if (elapsed < TOTAL_MS - DIVE_MS) {
        // Arc — parabola through peakPos.
        const t = (elapsed - EMERGE_MS) / (TOTAL_MS - EMERGE_MS - DIVE_MS);
        // Quadratic Bezier through emerge, peak, overEdge.
        const omt = 1 - t;
        pos = new THREE.Vector3()
          .addScaledVector(emergePos, omt * omt)
          .addScaledVector(peakPos, 2 * omt * t)
          .addScaledVector(overEdgePos, t * t);
      } else {
        // Dive — mirrored emergence.
        const t = (elapsed - (TOTAL_MS - DIVE_MS)) / DIVE_MS;
        const e = t * t;
        pos = overEdgePos.clone().lerp(endPos, e);
        pitch = -(Math.PI / 3) * e;
      }

      trainGroup.position.copy(pos);

      // Pitch + heading. Heading = atan2 of velocity (xz).
      const dx = pos.x - prevPos.x;
      const dz = pos.z - prevPos.z;
      const heading = Math.atan2(-dx, -dz);    // facing motion direction
      trainGroup.rotation.set(pitch, heading, 0, "YXZ");

      // Velocity for knockback (THREE frame).
      const dtSec = Math.max(0.0001, dtMs / 1000);
      trainVel.subVectors(pos, prevPos).divideScalar(dtSec);
      prevPos.copy(pos);

      // Bbox-vs-bbox knockback on humanoid root only.
      trainGroup.updateMatrixWorld(true);
      trainBox.setFromObject(trainGroup);
      const torsoBody = findBody(app, "torso");
      if (torsoBody && app.model && app.data) {
        // Find torso bodyID via scan (mirrors stab.js's pattern).
        let torsoBodyID = -1;
        for (const [id, g] of Object.entries(app.bodies || {})) {
          if (g?.name === "torso") { torsoBodyID = Number(id); break; }
        }
        if (torsoBodyID > 0) {
          const torsoGroup = app.bodies[torsoBodyID];
          torsoGroup.updateWorldMatrix(true, false);
          bodyBox.setFromObject(torsoGroup);
          const last = lastHitMs.get(torsoBodyID) ?? -Infinity;
          if (trainBox.intersectsBox(bodyBox) && performance.now() - last > HIT_COOLDOWN_MS) {
            lastHitMs.set(torsoBodyID, performance.now());
            const torsoJnt = app.model.body_jntadr[torsoBodyID];
            const torsoIsFree = torsoJnt >= 0 && app.model.jnt_type[torsoJnt] === 0;
            if (torsoIsFree) {
              const torsoDof = app.model.jnt_dofadr[torsoJnt];
              // THREE → MJ swizzle: (x, y, z)_three → (x, -z, y)_mj.
              const mjVx = trainVel.x;
              const mjVy = -trainVel.z;
              const mjVz = trainVel.y;
              app.data.qvel[torsoDof + 0] = mjVx * 0.6;
              app.data.qvel[torsoDof + 1] = mjVy * 0.6;
              app.data.qvel[torsoDof + 2] = 6.0;
              app.data.qvel[torsoDof + 3] = (Math.random() - 0.5) * 8;
              app.data.qvel[torsoDof + 4] = (Math.random() - 0.5) * 8;
              app.data.qvel[torsoDof + 5] = (Math.random() - 0.5) * 8;
            }
          }
        }
      }

      return true;
    },
    cancel() { dispose(); },
  };
}
```

- [ ] **Step 3: Register dune-worm**

In `src/projects/abilities/index.js`, add the import and registry entry:

```js
import { duneWorm } from "./dune-worm.js";
```

Then in the export object, add `"dune-worm": duneWorm`. Hyphenated key is intentional — the def's `ability: "dune-worm"` string maps directly. Final state of the exports:

```js
export const ABILITIES = {
  stab, topple, pulse, swarm, cycle,
  heatmap, dispatch, settle, launch, chord,
  roomba,
  "dune-worm": duneWorm,
};
```

- [ ] **Step 4: Hard-refresh and verify the train preloads**

Hard-refresh. Open DevTools console:

```js
const m = await import("./src/projects/assets.js");
console.log(Object.keys(m.modelCache));   // expect "amogus", "bombardier"
console.log(m.modelCache.bombardier);     // expect a THREE.Group
```

If `bombardier` is missing: the validator rejected the def — check console for `[projects] catalog/olympic-way/index.js: …` errors. Most likely the `abilityFbx.target` or `cacheKey` shape was malformed.

- [ ] **Step 5: Spawn-test the train**

Spawn Olympic Way. Click "Summon Train!". Expected:
- Train (Bombardier S Stock silhouette) bursts up from one scene edge
- Arcs through the playground over ~2.5s, peaking at y≈1.6
- Dives back into the ground at the opposite edge
- Train despawns cleanly within 3.5s
- If the humanoid is in the path, it gets knocked over (one knockback per 200ms)

If the train is gigantic: `target.value = 3.0` was too generous — try smaller. If it's microscopic: bigger.

If the train doesn't render at all: `modelCache.bombardier` is empty (preload failed) — check console for the `[assets] bombardier preload failed` log.

If the train passes through the humanoid without effect: bbox-vs-bbox failed. Check that `trainBox.intersectsBox(bodyBox)` is being evaluated and that the torso group has the `name: "torso"` (mirror what `stab.js` does — see lines 86-89 of stab.js).

- [ ] **Step 6: Commit**

```bash
git add src/projects/catalog/olympic-way/index.js src/projects/abilities/dune-worm.js src/projects/abilities/index.js
git commit -m "feat(olympic-way): summon Bombardier S Stock dune-worm train

Olympic Way's Pulse! ability replaced with dune-worm. Train mesh
loaded from FBX (preloaded into modelCache.bombardier via the new
abilityFbx field on the def). 3.5s sequence: emerge from scene
edge, parabolic arc through the playground at y≈1.6, dive at
opposite edge. Bbox-vs-bbox knockback on humanoid root with 200ms
per-body cooldown. Velocity computed by finite difference between
frames — no special t=0 handling needed (prevPos == currentPos →
zero velocity, no knockback that frame).

Spec: §3.8"
```

---

## Final integration check

After all 5 chunks land, run a full-circuit verification:

- [ ] **Step 1: Hard-refresh and confirm boot splash**

Page loads → splash visible → splash fades within ~240ms after preload settles → playground interactive.

- [ ] **Step 2: Spawn each of the 11 projects in turn**

Every project tile in the controls panel spawns its sprite. Every sprite lands flush on the floor. Every sprite is grabbable (raycast lands on visible silhouette). Every sprite's name label appears at its world position above the mesh.

- [ ] **Step 3: Toggle "Hide labels" and confirm**

All labels disappear within one frame; toggle off and they return; reload and the state persists.

- [ ] **Step 4: Click each sprite (with labels hidden)**

Each sprite click opens its card. Drag does NOT open the card.

- [ ] **Step 5: Test each ability that changed**

- **Amogus → Stab!**: short and long range both reach in ~0.5s; long range pinwheels harder; red blood spray on contact.
- **Musicity → Play!**: warm flash on apartment, then returns to whatever palette colour the cycle is at.
- **Oliver Wyman → Roomba!**: 2.5s of skidding around the floor.
- **Olympic Way → Summon Train!**: 3.5s train sequence with knockback.

- [ ] **Step 6: Hold-G drag-rotate**

Hold G + left-drag → camera orbits. Release G → orbit stops.

- [ ] **Step 7: Confirm no console errors**

DevTools console should be clean across all the above interactions. Anything red or yellow → investigate.

- [ ] **Step 8: Final commit (optional)**

If the integration check exposed any quick fixes, batch them in a final commit:

```bash
git status
# stage anything left
git commit -m "fix(integration): polish from end-to-end verification pass"
```

---

## Risks summary (carried forward from spec §6)

- **FBX preload latency** — the splash masks ~100ms-2s. If a slow connection makes this annoying, defer to a streaming-load (preload Amogus immediately, defer Bombardier until first Olympic Way spawn). Not in scope for this plan.
- **Sparks burst vs setEnabled mid-flight** — flipping Sparks OFF while a blood burst is in flight wipes those particles. Acceptable per spec.
- **Auto-hitbox on flying parts** (e.g. Amogus antenna) — bbox grows beyond visible silhouette. Override on a per-def basis if it bothers anyone.
- **Train hit detection** — bbox-vs-bbox is approximate; phantom knockback in extreme poses is acceptable.
- **Hold-G + arrow-key conflict** — none expected (G isn't an arrow), but mirror the input-field guard exactly.
