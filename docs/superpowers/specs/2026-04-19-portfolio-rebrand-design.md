# Portfolio Rebrand + Playground Polish — Design Spec

**Date:** 2026-04-19
**Author:** Rex + Claude
**Status:** Approved, ready for implementation plan

## 1. Goal

Convert the existing MuJoCo × Three.js playground (`src/main.js` + friends) into a single-page portfolio for Rex Heng. The playground IS the portfolio — no multi-page React restoration. A minimal collapsible left-anchored overlay surfaces identity and contact. Along the way, fix ~15 UX bugs, tune audio, strip removed/broken features, and clean up the GUI into something presentable.

## 2. Non-goals

- No restoration of the `_old/` React portfolio (Home/Experience/Projects/Writing/Contact pages).
- No RL / autonomous get-up work. The getup FSM is stripped entirely.
- No new scenes. `humanoid.xml` is the only scene; all other scenes (sandbox, catapult, pyramid, humanoid_getup) are removed.
- No scroll-down portfolio sections. The overlay is the only portfolio surface.

## 3. User-visible changes

### 3.1 Branding
- `<title>` → "Rex Heng".
- HUD header → "Rex Heng".
- GUI panel title → "Controls".
- `README.md` rewritten to describe the portfolio purpose.

### 3.2 Portfolio overlay (new)
- Fixed position: left edge, vertically centered-ish (top: 30%).
- **Collapsed state (default):** small circular icon button, ~44px, subtle dark translucent background matching existing HUD styling. Semi-transparent so it blends with the scene.
- **Expanded state:** panel widens to ~260px, shows:
  - Name: "Rex Heng"
  - Tagline: one line — "PPE at LSE · Building things at the intersection of finance, policy, and code."
  - Contact links: email, LinkedIn, GitHub (icon buttons in a row).
  - Small close (×) button top-right of the panel.
- Expand/collapse is click-triggered on the icon; animates width + opacity in ~220ms ease-out.
- Styled to match lil-gui panel aesthetic: dark translucent bg, light text, monospace font.

### 3.3 GUI (controls panel) reorganization
Single GUI panel, grouped into four folders:

**Scene**
- Reset (button) — working.
- Random perturb (button) — kept.

**Physics**
- Paused (checkbox).
- Timescale **dropdown**: 0.25× / 0.5× / 1× / 2×. Default 1×.
- Gravity **dropdown**: Earth (-9.81) / Moon (-1.62) / Space (0). Default Earth.
- Wind enabled (checkbox).
- Wind force (slider 0-40 N).
- Wind direction: **8-way compass buttons** (N / NE / E / SE / S / SW / W / NW). Click sets `windDir` to the corresponding angle. Selected button highlighted.

**Camera**
- Cinematic orbit (checkbox). When on, orbit around the humanoid torso.
- Orbit speed slider.

**Effects**
- Trajectory trails (checkbox).
- Contact audio (checkbox, **default ON**).
- Impact sparks (checkbox).

### 3.4 Removed from GUI entirely
- Contact vectors.
- Screen shake.
- Auto slo-mo.
- Auto get-up.
- Bullet time (+ Space keybind + vignette CSS).
- Fire cannonball.
- Spawn body.
- Freeze all.
- Launch (catapult) + launch angle + launch speed.
- Hold quadruped.
- Get up from supine.
- Get up from prone.
- Release PD.
- Scene dropdown (only one scene left).

### 3.5 Keybinds removed
- `Space` (bullet time) — removed.
- `B` (aim spawn) — removed. Was crashing.

### 3.6 Behavior fixes
- **Humanoid stands at load.** `resetSim()` and initial load call `mj_resetData` then apply keyframe 0 if one exists that keeps the humanoid upright on its feet. If default pose is unstable, investigate XML for an upright keyframe or add one. Fall-back: zero qvel and accept minor sway, as long as it doesn't immediately collapse.
- **Reset button works.** Calls `mj_resetData` + re-applies the upright-init logic + zeroes any residual forces.
- **Cinematic orbit** tracks humanoid torso world position every frame, not the static `controls.target`. When orbit is ON, `controls.target` is also updated to the torso position so OrbitControls math stays consistent.
- **Contact audio default ON.** `MIN_GAP_MS` raised from 45 → 150. Gain scaled by normalized impact depth so light contacts are quiet and big hits are loud.

## 4. Architecture changes

### 4.1 Files touched
- `index.html` — title, remove bullet-time CSS.
- `README.md` — rewrite to portfolio framing.
- `src/main.js` — major: GUI rebuild, remove bullet time / screen shake / removed features, fix reset + initial pose, fix orbit target, gravity/timescale dropdowns, wind compass, overlay mount.
- `src/audio.js` — default-on, raise gap, scale gain by depth.
- `src/replay.js` — strip auto-trigger (keep manual R-key).

### 4.2 New files
- `src/portfolioOverlay.js` — `PortfolioOverlay` class. Constructor takes an options object `{ name, tagline, links }`. Builds DOM, appends to `document.body`, handles expand/collapse state.

### 4.3 Files deleted
- `src/humanoidController.js` — FSM and PD controller no longer used.
- `src/sceneGen.js` — only generated pyramid/catapult/sandbox, all removed.
- `assets/scenes/humanoid_getup.xml` — getup-specific scene no longer used.

### 4.4 Data trimmed
- `SCENE_FILES` → `["humanoid.xml"]`.
- `SCENE_FRAMING` → one entry.
- Removed `params` entries: `screenShake`, `autoReplay`, `autoGetUp`, `bulletTime`, `toggleBulletTime`, `fireCannon`, `spawn`, `freezeAll`, `launch`, `launchAngle`, `launchSpeed`, `holdQuadruped`, `engageGetUpSupine`, `engageGetUpProne`, `releaseHumanoidPD`.
- Removed `App` methods: `setBulletTime`, `fireCannon`, `spawnAtAim`, `spawnNext`, `freezeAll`, `launchProjectile`, `_updateCatapultScore`, `_updateCatapultHud`, `_updateTrajectoryPreview`, `punchAtAim`, `applyPunches`, `_autoEngageGetUp`, `_updateShake`, bullet-time blend logic.

## 5. Parallelization plan

Two parallel lanes, since every workstream except the overlay touches `src/main.js`:

**Lane A (parallel):** Portfolio overlay + branding
- New `src/portfolioOverlay.js`.
- Edit `index.html` (title, remove bullet CSS).
- Edit `README.md`.

**Lane B (sequential chain):** main.js rewrite in one coherent pass
1. Strip removed features (bullet time, shake, catapult, cannonball, spawn, freeze, getup FSM, sandbox).
2. Fix reset + initial humanoid pose.
3. Gravity + timescale + wind dropdowns in GUI.
4. Fix cinematic orbit to track torso.
5. Rebuild GUI with folder grouping.
6. Tune `src/audio.js` (default-on, gap, gain scaling).
7. Strip auto-trigger from `src/replay.js`.
8. Delete unused files.
9. Mount overlay.

The two lanes merge at step 9 — overlay is imported into `main.js` and instantiated after `init()`.

## 6. Testing strategy

After implementation:
1. `python -m http.server 8765` (Rex already has this running — verify via netstat first).
2. Load in Chrome.
3. Verify:
   - Title shows "Rex Heng".
   - Humanoid is standing upright at load (doesn't immediately fall).
   - Reset button restores the upright pose.
   - Overlay collapsed by default; click expands; close button collapses.
   - GUI shows four folders with correct contents.
   - Gravity dropdown: Earth / Moon / Space each changes physics visibly.
   - Timescale dropdown: 2× visibly faster, 0.25× visibly slower, no freeze.
   - 8-way compass wind buttons work.
   - Cinematic orbit rotates around the humanoid even if it moves.
   - Contact audio plays on impact, spaced out, louder on big hits.
   - No console errors.
   - Space / B keys no longer do anything.

## 7. Risks

- **Initial pose instability:** DeepMind humanoid is famously unstable without an upright keyframe. If keyframe 0 (`squat`) doesn't produce a standing pose, we may need to either use a lower stable pose or add a small initial settling period. Mitigation: investigate `assets/scenes/humanoid.xml` for existing keyframes before implementation; if none stand, accept a stable squat-like pose and move on (Rex approved low-profile poses in iter 37).
- **Orbit target tracking jitter:** if torso position jitters due to physics, orbit may wobble. Mitigation: low-pass filter the tracked position (exponential smoothing α=0.1) if visible jitter appears.
- **Wind compass accessibility:** 8 small buttons take space. Mitigation: arrange in a 3×3 grid (center empty or magnitude readout) inside a lil-gui folder.

## 8. Open questions

None remaining. Rex approved design and parallelization plan.
