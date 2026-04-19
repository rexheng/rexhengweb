# Code Review Study Guide — MuJoCo × Three.js Playground

A mechanism-by-mechanism map of every feature in this codebase, paired with 1–2 external references (papers, engineering blogs, or design writeups) showing how the broader game/physics-engine community approaches the same problem, plus the relevant MuJoCo documentation.

Features are grouped where the underlying mechanism is shared — the grouping itself is the first piece of review material, because it tells the reviewer what to compare against what.

---

## Group 1 — Interactive body manipulation (spring-force grab + gravity/physics gun)

**Our code:** `src/grabber.js` (click-to-drag spring with `r × F` torque and `cvel` damping); `src/main.js` gravity-gun punt (middle-click `qvel` injection along camera ray); phys-gun rotate (E/Q spin held body around camera axis); freeze-all button (zeroes all `qvel`).

**Mechanism.** All four features are variations on the same pattern: read a body's state from MuJoCo, compute a target based on camera/mouse input, and write back either a Cartesian wrench (`data.xfrc_applied`, 6 floats per body) or a velocity (`data.qvel` at the free-joint DOF offset). The spring-damper grab is `F = k·Δx − c·v` with world-frame lever arm; the punt is a one-shot velocity write; freeze is `qvel[:] = 0`.

**What to understand for the review:**
- Why `xfrc_applied` is in *world* frame at the body CoM — this is why the lever arm must come from `matrixWorld`, not local rotation. (See the iter-9 bug note in `PROGRESS.md` about the parent-chain fix.)
- Why velocity damping (`−c·v` from `data.cvel`) is needed at all: pure spring forces oscillate around the target; engineers call this the "rubber-band wobble" and always pair the spring with a damper.
- Why `mj_resetData` must be called *before* `qvel` injection in the cannonball path — it zeroes `xfrc_applied` along with state.

**References:**
- [Gravity Gun — Combine OverWiki (design + mechanics)](https://combineoverwiki.net/wiki/Zero_Point_Energy_Field_Manipulator) — canonical writeup of Half-Life 2's primary/secondary-fire split (punt vs. hold-and-drag). Our middle-click punt and left-click drag are the same two modes.
- [Garry's Mod Physgun — facepunch wiki](https://wiki.facepunch.com/gmod/Using_your_Physgun) — the freeze-in-midair and rotate-while-held mechanics that our E/Q rotate + freeze-all button are modeled on. Origin story (David Speyrer interview in the [Wikipedia Gravity Gun entry](https://en.wikipedia.org/wiki/Gravity_gun)): the physgun started as an internal dev tool for *moving props around during level construction* — same motivation as our debug grabber.
- [Laumania/Unity3d-PhysicsGun (reference implementation)](https://github.com/Laumania/Unity3d-PhysicsGun) — a Unity port of the Gmod physgun; useful for seeing the spring-force + orientation-lock math in a language other than ours.

**MuJoCo docs:**
- [MuJoCo API — xfrc_applied / qfrc_applied](https://mujoco.readthedocs.io/en/stable/APIreference/APIfunctions.html) and [deepmind/mujoco discussion #2350](https://github.com/google-deepmind/mujoco/discussions/2350?sort=top) — explains the crucial distinction: `xfrc_applied` is always world-frame Cartesian; `qfrc_applied` is joint-space.
- [`mjv_applyPerturbForce` discussion](https://github.com/google-deepmind/mujoco/discussions/2358) — MuJoCo's built-in perturbation helper; useful to read alongside `grabber.js` to check we re-implemented the same math.

---

## Group 2 — Contact visualization & impact feedback (debug arrows, impact sound, spark VFX, shockwave)

**Our code:** `src/contacts.js` (instanced contact spheres + normal arrows, color-coded by penetration depth); `src/audio.js` (procedural WebAudio impact ticks); `src/sparks.js` (GPU-point spark burst on high-velocity contacts); iter-29 impact shockwave ring (planned in `IDEAS.md`).

**Mechanism.** All four read `data.contact` each frame (an Emscripten `std::vector` wrapper, accessed via `data.contact.get(i)`), pull out `pos`, `frame` (3×3 with normal as first row), and `dist` (signed penetration — negative means overlapping), and fan that data out to three different presentation channels: visual (instanced mesh), audio (synthesized tick), and VFX (point cloud). Because our mujoco-js build does not export `HEAPF64`, we cannot call `mj_contactForce` to get the actual contact force; instead we use `|dist|` and its *delta* frame-to-frame as a proxy for impact magnitude.

**What to understand for the review:**
- Why `frustumCulled = false` on the contact `InstancedMesh` — instanced bounding spheres are cached from the first batch and become stale when contacts move around.
- Why per-pair keys (`geom1 + "_" + geom2`) in `audio.js` prevent the "resting contact buzz" — a ball on the floor has an active contact every frame, but only re-triggers sound when the delta-penetration crosses threshold.
- The z-up → y-up swizzle has to be applied to *both* position and normal vectors; contacts were the feature that forced us to handle this systematically.

**References:**
- [Ming-Lun "Allen" Chou — Game Physics: Contact Generation via EPA](https://allenchou.net/2013/12/game-physics-contact-generation-epa/) — the canonical engineering blog on where contact points, normals, and penetration depth actually come from inside a physics engine. Reading this explains *why* MuJoCo gives you the data we're visualizing.
- [Unity Manual — Physics Debug window reference](https://docs.unity3d.com/Manual/PhysicsDebugVisualization.html) — industry-standard debug-viz pattern we're re-implementing: color by collision state, arrows for normals, toggleable overlay. Good side-by-side for `contacts.js`.
- [DEV — Procedural audio effects with Web Audio API](https://dev.to/hexshift/how-to-create-procedural-audio-effects-in-javascript-with-web-audio-api-199e) — noise buffer + biquad bandpass + gain envelope is exactly our `audio.js` architecture. The article also covers the `AudioContext` gesture-unlock trap we hit in iter-7.
- [ACM / Audio Mostly 2023 — Neural Audio Synthesis of Impact Sound Effects](https://dl.acm.org/doi/fullHtml/10.1145/3616195.3616221) — academic treatment of *what an impact sound physically is* (short-lasting impulsive noise from collision). Context for why "noise burst + bandpass + short envelope" is a reasonable physical model, not just an audio-engineering trick.
- [Wicked Engine — GPU-based particle simulation](https://wickedengine.net/2017/11/gpu-based-particle-simulation/) — how high-end engines do collision-driven spark bursts. Our `sparks.js` is the CPU-side, low-count version of the same idea.

**MuJoCo docs:**
- [MuJoCo computation — contact model](https://mujoco.readthedocs.io/en/stable/computation/index.html) — explains that `dist` is signed penetration from a *soft* contact model, not a hard constraint, which is why our penetration-depth proxy is actually meaningful (deeper overlap = stiffer penalty = harder impact).
- [MuJoCo issue #282 — How to visualize xfrc_applied](https://github.com/google-deepmind/mujoco/issues/282) — covers the visualization hooks MuJoCo provides natively (`mjVIS_PERTFORCE`, `mjVIS_CONTACTFORCE`); useful to compare against our hand-rolled approach.

---

## Group 3 — Motion trails & trajectory rendering

**Our code:** `src/trails.js` — per-body world-space ring buffer of 240 points (~4 s at 60 Hz), rendered as vertex-colored `THREE.Line` with newest=bright oldest=dim gradient.

**Mechanism.** Sample each tracked body's world position every 16 ms (with a `MIN_SEGMENT=0.0015` early-out for nearly-stationary bodies), push into a ring buffer indexed by `bodyID`, rebuild the `BufferGeometry.attributes.position` each frame with the buffer walked oldest→newest, and write a matching vertex-color gradient so the tail fades via `t*t`. Group attached directly to `scene` (not `mujocoRoot`) so the sampled world coords don't accumulate ancestor transforms.

**What to understand for the review:**
- Why world-space sampling, not local: MuJoCo bodies are parented under `bodies[0]`, so `group.position` is a local offset. `updateWorldMatrix` + `setFromMatrixPosition(matrixWorld)` is the only correct read.
- `depthWrite: false` stops the trail from fighting with its own body's z-buffer.
- Ring-buffer cost: 16 bodies × 240 pts × 60 Hz ≈ 230 k vertex writes/s — negligible, which is why we didn't bother with a fancier tri-strip.

**References:**
- [Unity Manual — TrailRenderer](https://docs.unity3d.com/Manual/class-TrailRenderer.html) — the industry-standard trail component. Worth reading because it makes explicit design choices we *didn't* make (billboarded quad-strip with thickness, world-space emission) and justifies them: "emphasize motion, highlight trajectory of moving objects."
- [GameDev.net — Creating a motion trail effect](https://gamedev.net/forums/topic/394761-creating-a-motion-trail-effect/394761/) — foundational technique (triangle strip + alpha blend). Our line-with-vertex-colors is a simpler variant; the article's discussion of alpha-fade gradient maps directly to our `t*t` tail.

**MuJoCo docs:** n/a — this is purely a renderer-side feature; MuJoCo just supplies the positions.

---

## Group 4 — Time manipulation (bullet time, pause, timescale)

**Our code:** `src/main.js` bullet-time (Spacebar / button), exponential blend 0→1 over ~300 ms, multiplies `wallDt` by `1 − 0.85·blend` (so full blend = 0.15× real-time), ramps bloom strength and fades in a red vignette via CSS. Timescale slider is a separate multiplier; pause is a hard gate.

**Mechanism.** Bullet time is a *multiplicative layer* on the physics wall-clock delta fed to MuJoCo's stepper, not a change to `model.opt.timestep`. The timestep stays fixed (deterministic physics); the *number of steps per rAF frame* is what shrinks. This is the same split every game engine uses. An exponential blend (rather than linear fade) gives the "whoosh" easing.

**What to understand for the review:**
- Why bullet-time slows `wallDt` and not `params.timescale` — it composes cleanly with the user-facing slider instead of fighting it.
- Why visuals (bloom ramp, vignette) matter: Remedy's Max Payne retrospective makes the case that bullet time reads as a *mode change* to the player only because sound, color, and animation all shift together — the physics slow-down alone isn't legible.
- The fixed-timestep-plus-substeps pattern is the same one Gaffer on Games formalized ("Fix Your Timestep"); any reviewer with physics-engine experience will check for it immediately.

**References:**
- [Gizmodo — The Art of Bullet Time: Mechanics Behind Max Payne's Signature Feature](https://gizmodo.blog/the-art-of-bullet-time-mechanics-behind-max-payne-s-signature-feature/) — design-level writeup of the first game that made this a reusable mechanic. Covers the multi-channel reinforcement (camera, animation, AI) that our bloom + vignette riff on.
- [Time Extension — Max Payne Producer Reveals How 'Bullet-Time' Was Born](https://www.timeextension.com/news/2023/03/max-payne-producer-reveals-how-bullet-time-mechanic-was-born) — origin story; interesting for the "we already had slow-mo for death animations, then tied it to gameplay" design insight.

**MuJoCo docs:**
- [MuJoCo simulation docs — programming](https://mujoco.readthedocs.io/en/stable/programming/simulation.html) — `mj_step` and `model.opt.timestep` semantics. Confirms the fixed-timestep principle: MuJoCo's integrator expects a constant `dt`, and the way to go slow-mo is to step it fewer times, not to shrink `dt`.

---

## Group 5 — Scene & model construction (MJCF at runtime, destructible pyramid, scene framing)

**Our code:** `src/sceneGen.js` (generates a full MJCF string at runtime for a 6-row brick pyramid + cannonball, written to MuJoCo's virtual FS as `__pyramid.xml`); `src/mujocoLoader.js` (ports of `loadSceneFromURL` from zalo/mujoco_wasm, builds Three.js mesh tree from compiled `mjModel`); per-scene camera-framing table + eased tween in `main.js`.

**Mechanism.** MuJoCo's virtual filesystem lets you feed it an XML string as if it were a file, so procedural scene construction is purely a string-templating problem. On load, `model.nbody`, `model.ngeom`, etc. give us the size of every flat array we need to index into; `getPosition` / `getQuaternion` swizzle from MuJoCo's z-up to Three's y-up. Camera framing is a per-scene lookup of target + radius + angle, tweened over 900 ms on scene switch.

**What to understand for the review:**
- Why `<size njmax>/<nconmax>` bumps matter for the pyramid: 21 bricks in partial collision can overflow the default contact buffer.
- Why the cannonball uses direct `qvel` injection rather than `xfrc_applied`: the browser's rAF throttling makes impulse-from-force fragile, and `qvel` is deterministic.
- Why our loader parents every body under `bodies[0]`: matches the MuJoCo body tree and lets us hang effects (trails, hover highlight) off group nodes instead of individual meshes.

**References:**
- [Aalborg University — Simulating Object Stacking Using Stack Stability (PDF)](https://projekter.aau.dk/projekter/files/198080087/Full_Report.pdf) — thesis-length treatment of what makes stacks stable or unstable in rigid-body simulators. Directly relevant to why our 6-row pyramid holds up in MuJoCo.
- [Little Polygon — Tech Breakdown: Third-Person Cameras](https://blog.littlepolygon.com/posts/cameras/) and [GameDev.net — A Simple Third-Person Camera](https://gamedev.net/tutorials/programming/general-and-gameplay-programming/a-simple-third-person-camera-r1591/) — background for the polar-coords orbit framing we use. Pitch/yaw/radius is the standard parameterization; the Little Polygon article's point about "spherical parameters as a blending space" is exactly why our per-scene framing tween interpolates those values and not world-space camera positions.

**MuJoCo docs:**
- [MuJoCo Modeling](https://mujoco.readthedocs.io/en/stable/modeling.html) and [MJCF XML Reference](https://mujoco.readthedocs.io/en/stable/XMLreference.html) — authoritative for the XML we're generating in `sceneGen.js`.
- [MJCF / XML handling — DeepWiki](https://deepwiki.com/google-deepmind/mujoco/2.1-mjcf-and-xml-handling) — good structural summary; useful if the reviewer asks "why XML strings instead of `mjSpec`?" (Answer: mujoco-js@0.0.7 predates `mjSpec`; the VFS string path is our only option.)

---

## Group 6 — Input & selection (raycast picking, hover highlight, crosshair, context hints)

**Our code:** `src/grabber.js` (raycast on pointerdown, filter by `bodyID > 0`); `src/hoverHighlight.js` (emissive-on-hover via the same raycast); `src/crosshair.js` (center reticle); HUD context hints + wind compass in `main.js`.

**Mechanism.** Every pick-like interaction funnels through one `THREE.Raycaster.setFromCamera(ndc, camera)` call and an `intersectObjects(candidates, false)` against body group meshes. The non-recursive intersection is correct because bodies are groups whose top-level children are the pickable geom meshes. Hover and grab share the same candidate list — that's why hover-highlight state can cleanly hand off to the grabber on click.

**What to understand for the review:**
- Why `recursive: false`: MuJoCo-loader hierarchies have nested groups; recursive would double-count.
- Why window-level `pointermove` + `setPointerCapture` in iter-9's grabber rework: events get eaten by overlay panels otherwise. Classic web foot-gun, called out in the iter-9 "Learned" notes.
- NDC conversion must use the canvas's bounding rect, not `window.innerWidth`, whenever the canvas isn't full-page.

**References:**
- [three.js manual — Picking](https://threejs.org/manual/en/picking.html) — official doc. Clean reference for the raycaster flow we use.
- [Three.js Raycaster — DeepWiki](https://deepwiki.com/mrdoob/three.js/5.1-raycasting-and-picking) — deeper internals (BVH, face-culling gotchas). Good to have in mind when the reviewer asks about performance on larger scenes.

**MuJoCo docs:** n/a — picking is pure renderer-side.

---

## Group 7 — Environmental forces (wind, gravity slider, random perturb)

**Our code:** Gravity slider (`model.opt.gravity[2]`), random-perturb button (writes random vector to `qfrc_applied`), wind system with compass indicator (`src/main.js` — applies `xfrc_applied` force to every body each step, direction given by `params.windDir`, magnitude `params.wind`).

**Mechanism.** Global force fields are just a per-frame loop over all bodies writing the same Cartesian force into `xfrc_applied[bodyID*6 + 0..2]`. Wind direction is a 2D angle on the ground plane; gravity is scalar (we only touch the z-component). Random perturb is a one-shot impulse via `qfrc_applied`, which is *generalized* force (joint-space) — different semantics from `xfrc_applied` and worth naming in the review.

**What to understand for the review:**
- Why wind is applied as a constant force rather than a drag (`F ∝ v_rel`): the drag model would need exposed surface area per body, which we don't have. Constant force is the standard *game* simplification and matches what the GameDev.net thread below describes.
- The compass indicator is DOM, not WebGL; perf note in iter-28 confirms zero cost on steady wind (float-diff early-return before any `setAttribute`).

**References:**
- [GameDev.net — how do I simulate wind?](https://www.gamedev.net/forums/topic/188457-how-do-i-simulate-wind/) — the standard approximations: constant force, drag-based, or Perlin-modulated. Matches our implementation choice.
- [Project Borealis — Technology Demonstration: Wind and Air Drag System (PDF)](https://projectborealis.com/docs/WADS.pdf) — a more ambitious game-side system for reference; explains when you'd upgrade from our simple constant-force wind to surface-area-aware drag.

**MuJoCo docs:** same `xfrc_applied` reference as Group 1.

---

## Group 8 — Rendering pipeline (lighting, PMREM, bloom, film grain, sky)

**Our code:** Key/fill/rim directional + hemisphere lights; `RoomEnvironment` PMREM for PBR reflections (`environmentIntensity = 0.35`); `UnrealBloomPass` (threshold 0.92, strength 0.28, ramped by bullet time); `src/filmPass.js` (custom noise/scanline pass); 3-stop sky-gradient shader; ACES tone mapping.

**Mechanism.** Standard Three.js `EffectComposer` chain: render pass → bloom pass → film pass → output. Iter-2's "Learned" note captures the main lesson: stacking PMREM + hemi light + bloom at defaults blows out to white — you have to *budget* the three contributions. Environment intensity is the single knob that scales all material env reflections (Three r181+), so we push almost all tuning through that instead of per-material `envMapIntensity`.

**What to understand for the review:**
- Why bloom threshold is 0.92, not 1.0: with ACES tone mapping compressing highlights, values below 1.0 can still be visually "the brightest thing" and deserve to bloom.
- Pass order matters: film grain *after* bloom means grain doesn't get bloomed; swapping the order would look completely different.
- HUD elements (trail guide, contact arrows, grab dot) set `toneMapped: false` so they don't get crushed by ACES.

**References:**
- [three.js docs — UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html) and [EffectComposer](https://threejs.org/docs/pages/EffectComposer.html) — canonical API.
- [Wael Yasmina — Post-Processing with Three.js: the What and How](https://waelyasmina.net/articles/post-processing-with-three-js-the-what-and-how/) — clear engineering-blog walkthrough of the composer chain and pass-order gotchas we hit.

**MuJoCo docs:** n/a.

---

## Group 9 — HUD & instrumentation (metrics overlay, pause chip, crosshair, wind compass, context hints)

**Our code:** `src/metricsHud.js` (real-time peak speed, impact, contacts, motion overlay); iter-24 crosshair; iter-25 pause chip; iter-27 context hints; iter-28 wind compass. All DOM, all state-change-gated (float-diff early-return before writes).

**Mechanism.** Every HUD widget is an HTML element positioned with CSS `fixed` over the canvas. The update function computes a fresh state snapshot each frame but compares against a cached `_last*` value with epsilon tolerances; only on change does it actually write to the DOM. This pattern is what makes all five HUD widgets fit inside a single-digit millisecond budget.

**What to understand for the review:**
- Why DOM instead of canvas-drawn HUD: crisp typography for free, accessibility for free, no font-atlas machinery. The cost is CSS cascade discipline — see the z-index choices in `index.html`.
- The iter-28 perf test (median 59.9 FPS / p5 59.5 FPS with compass visible) is the template: every HUD addition should be followed by a comparable rAF sample to prove no regression.
- State-change gating is not a premature optimization — it's what lets us keep adding widgets without a per-frame DOM-write pile-up.

**References:**
- [Intel GPA — Heads-Up Display (HUD) UI Reference](https://www.intel.com/content/www/us/en/docs/gpa/user-guide/2023-1/heads-up-display-hud-ui-reference.html) — industrial reference for what a performance HUD should show (FPS, CPU, GPU, custom metrics). Our `metricsHud.js` is the game-state analogue.
- [Meta Developers — OVR Metrics Tool](https://developers.meta.com/horizon/documentation/unity/ts-ovrmetricstool/) — user-defined custom metrics via overlay is exactly the pattern we're implementing.

**MuJoCo docs:** n/a — HUD reads state but doesn't talk back to the solver.

---

## Cross-cutting: MuJoCo itself

Independent of any one feature group, a reviewer will want context on *why* MuJoCo behaves the way it does — specifically the soft-contact model that makes our penetration-depth proxy meaningful and our grab-spring stable.

- [Todorov, Erez & Tassa — MuJoCo: A Physics Engine for Model-Based Control (IROS 2012, PDF)](https://roboti.us/lab/papers/TodorovICRA14.pdf) — the original paper. Explains the convex-optimization reformulation of contact dynamics and why MuJoCo's contacts are *soft* by design (pushing harder → larger acceleration, always).
- [MuJoCo documentation — Computation](https://mujoco.readthedocs.io/en/stable/computation/index.html) — the canonical modern reference for the solver, contact model, and constraint system.
- [arXiv 2506.14186 — Hard Contacts with Soft Gradients](https://arxiv.org/html/2506.14186v1) — recent research context on how MuJoCo's soft contacts relate to differentiable physics and where the field is going.

---

## How to use this doc in the review

1. Open the relevant source file side-by-side with the linked reference for its group.
2. For each feature, be ready to answer: *what's the minimum correct mechanism, and what did we add on top?* The references define the minimum; `PROGRESS.md` documents what we added and why.
3. The MuJoCo-specific gotchas (frame conventions, free-joint layout, VFS paths, missing `HEAPF64`) are the most likely sources of reviewer questions — all are captured in the per-iteration "Learned" notes in `PROGRESS.md` and should be cross-referenced back to the relevant doc link above.
