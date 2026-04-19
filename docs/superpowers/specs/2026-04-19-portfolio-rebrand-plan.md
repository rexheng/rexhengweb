# Portfolio Rebrand — Implementation Plan

Spec: `2026-04-19-portfolio-rebrand-design.md`
Execution mode: autonomous, parallelized where possible.

## Execution order

### Phase 1 — Independent groundwork (parallelizable, two agents)

**Agent A — Portfolio overlay + branding**
1. Read `assets/` or `_old/src/data/aboutData.js` for Rex's name / links reference (confirm identity fields).
2. Write `src/portfolioOverlay.js` — class with expand/collapse, injects DOM, own styles via inline `<style>` or style-on-construct.
3. Edit `index.html`:
   - `<title>` → "Rex Heng".
   - Remove `body::after` bullet-time vignette CSS.
   - Remove `#hud` header block (overlay replaces it); OR keep HUD but change h1 to "Rex Heng".
4. Rewrite `README.md` — one-page portfolio framing.

**Agent B — main.js + audio + replay rewrite**

All edits to `src/main.js`, `src/audio.js`, `src/replay.js`, plus file deletions. Must be done as a single coherent pass because everything touches `main.js`.

1. **Strip removed features from main.js:**
   - Remove imports: `HumanoidController`, `GetUpFSM`.
   - Delete from `params`: `screenShake`, `autoReplay`, `autoGetUp`, `bulletTime`, `toggleBulletTime`, `fireCannon`, `spawn`, `freezeAll`, `launch`, `launchAngle`, `launchSpeed`, `holdQuadruped`, `engageGetUpSupine`, `engageGetUpProne`, `releaseHumanoidPD`.
   - Delete App methods: `setBulletTime`, plus any methods only called by removed features (grep-verify each before deletion).
   - Remove Space / B / F keydown handlers (F stays if punchAtAim is useful — but spec says remove B and Space; F punch isn't mentioned, keep for now).
   - Remove bullet-time blend math from animate loop.
   - Remove screen shake accumulator + offset math.

2. **Fix initial pose + reset:**
   - After `loadSceneFromURL`, call `mj_resetData` then check if humanoid.xml has a stable upright keyframe. Inspect keyframes: `squat`, `stand_on_left_leg`, `prone`, `supine`. Use `stand_on_left_leg` or if a full-stand keyframe isn't present, investigate. If none work, zero qvel and hope; fall back to letting it settle pre-render.
   - `resetSim()` re-applies the same init logic + zeros `xfrc_applied`.

3. **Add presets for gravity, timescale, wind direction:**
   - `GRAVITY_PRESETS = { Earth: -9.81, Moon: -1.62, Space: 0 }`. GUI `.add(params, 'gravity', Object.keys(GRAVITY_PRESETS))` with onChange updating `model.opt.gravity[2]`.
   - `TIMESCALE_PRESETS = { "0.25×": 0.25, "0.5×": 0.5, "1×": 1.0, "2×": 2.0 }`.
   - Wind compass: 8 buttons, each sets `params.windDir` to `k * Math.PI/4` for k in 0..7. Arrange via custom DOM inserted into the Physics folder (lil-gui supports custom HTML via folder `.$children` or we create a plain div appended after the folder).

4. **Fix cinematic orbit:**
   - In `updateCinematicOrbit(dtSec)`:
     - Get humanoid torso world position each frame (`bodies[torsoId]` or find by name "torso").
     - Update `this.controls.target` to torso position.
     - Then do existing polar rotation math around `controls.target`.

5. **Rebuild GUI with folders** (replace flat list with `addFolder` groups as per spec §3.3).

6. **Audio tuning (`src/audio.js`):**
   - Constructor / default options — set enabled=true by default.
   - `MIN_GAP_MS` 45 → 150.
   - Gain envelope: scale `0.8 + 0.6t` attack level by `Math.min(1, depth / 0.004)` so smaller impacts are quieter.
   - Ensure `params.audio = true` in main.js default.

7. **Replay cleanup (`src/replay.js`):**
   - Remove `AUTO_SPIKE_THRESHOLD`, `AUTO_COOLDOWN_MS`, `AUTO_MIN_SAMPLES`, `_checkAutoTrigger`, `setAutoEnabled`, `autoEnabled`, `_prevDepths`.
   - Keep manual R-key replay functional.

8. **File deletions:**
   - `src/humanoidController.js`
   - `src/sceneGen.js`
   - `assets/scenes/humanoid_getup.xml`
   - Remove from `SCENE_FILES` + `SCENE_FRAMING`.

### Phase 2 — Merge (sequential)
- Agent B's main.js imports the new `PortfolioOverlay` from Agent A's file.
- Instantiate after `init()` with Rex's identity data.
- Run both agents, then I do the merge myself since it's just adding 2 lines to main.js.

### Phase 3 — Verification
- Check existing dev server running (netstat :8765).
- If running, reload browser.
- Walk the test checklist from spec §6.
- Screenshot proof of humanoid standing, overlay open, GUI folders.

## Commits

- After Agent A lands: `feat: portfolio overlay + branding`
- After Agent B lands: `refactor: rebuild playground GUI and strip removed features`
- After merge: `feat: wire portfolio overlay into main app`
- Final if any fixups: `fix: ...`
