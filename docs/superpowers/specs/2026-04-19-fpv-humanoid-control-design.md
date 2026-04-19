# FPV / TPV Humanoid Control — Design Spec

**Date:** 2026-04-19
**Author:** Rex + Claude
**Status:** Proposed

## 1. Goal

Let the user drive the DeepMind humanoid around the MuJoCo scene with standard
FPS controls — **WASD** to move, **Space** to jump, **Ctrl** to crouch, mouse
to look — while keeping the character physically embodied in the scene (other
bodies, the floor, wind, etc. still affect it; the humanoid still *can* be
knocked over and will need to recover).

Two camera modes:

- **First-person (FPV)** — camera attached to the humanoid's head, looking
  down the gaze vector. Mouse rotates the head; WASD moves the body relative
  to the current gaze.
- **Third-person (TPV)** — camera sits behind the humanoid at shoulder-height,
  orbits around the torso, follows from a fixed offset. WASD moves relative
  to the camera's forward, not the humanoid's facing.

Toggle with **V** (the industry-standard "view" key in TABS, Source engine,
GTA, etc.).

Press **G** to enter/exit control mode. When not in control mode, the scene
behaves exactly as today (orbit camera, grab, replay, etc.). When in control
mode, the humanoid is "yours" — orbit controls release to the keyboard /
pointer-lock.

## 2. Non-goals

- **No RL-based policy.** Research-grade MuJoCo walking uses NMPC at 100Hz +
  WBC at 500Hz + PD at 1000Hz. That's not viable in a browser tab at 60 Hz.
  This is a scripted / assisted locomotion system, not physically-pure
  dynamic balance.
- **No state-of-the-art gait realism.** The character will waddle like TABS,
  not walk like Boston Dynamics. That's explicitly the aesthetic we want.
- **No per-body-part physics-free kinematic control.** Limbs stay physical
  (PD-tracked) so collisions, grabs, and wind still feel honest. Only the
  root body gets optional kinematic assistance.
- **No pathfinding or AI.** The humanoid only moves when the user inputs.

## 3. The hybrid control approach (and why)

Prior iterations of this same humanoid (see `PROGRESS.md` iter 36–40) proved
that a pure-PD scripted controller cannot induce body rotation on a floating
root freejoint — limbs just flail. The successful solution was **PD-tracked
joint targets + kinematic root assist** for scripted get-up sequences. We use
the same hybrid here:

**Layer 1 — Joint targets (PD, physical).** A gait state machine writes
per-joint angle targets each frame. A PD loop translates `(target − current)`
into motor torques via `ctrl = (Kp·Δ − Kd·qd) / gear`. Physics solves for
everything downstream — this is the same stack iter 36 already proved works
with max error ~2°.

**Layer 2 — Root drive (hybrid).** The root freejoint has no actuator so it
can't be PD'd the same way. Two modes:

- **Assisted (default)** — we write an xfrc_applied wrench on the pelvis each
  frame to propel + steady the body: horizontal force along the requested
  direction (WASD), vertical force to counter gravity if we detect ground
  contact, and a yaw torque to rotate toward the requested facing. The
  character is still a physical ragdoll — hit it and it falls over — but it
  has an "invisible puppeteer" keeping it upright and moving.
- **Hardcore** — same, but the assisted upright torque is disabled and the
  character genuinely has to balance via gait-induced momentum. This almost
  certainly won't be usable; it's a toggle for demonstration.

Default is assisted. This matches TABS (their "wobbler" units are
assisted-upright ragdolls with animation-driven limbs).

**Layer 3 — Gait state machine (procedural walk cycle).** Four states:
`idle → stance → left_swing → right_swing → stance → …`. State transitions
driven by a phase timer (2 Hz for a stride). Each state has a pose preset
that gets PD-tracked: stance is knees slightly bent, left_swing lifts the
left knee and extends the right leg, etc. The whole thing loops. Arms swing
anti-phase for free (they're PD-driven too).

If input vector is zero, stay in `idle` with small-amplitude ankle-sway PD
targets so the character doesn't look frozen.

When grounded AND user presses Space: switch to a one-shot `jump` state that
(a) applies an impulse +z on the pelvis and (b) swings legs tuck-then-extend.
After flight, resume stance.

Ctrl: sets knee/hip targets to a deep crouch pose. PD holds it as long as
Ctrl is held.

## 4. Camera

**First-person.**
- Look-at target: head body's world position + a small forward offset.
- Camera position: same. (Camera sits inside the head, looking along gaze.)
- Pitch/yaw: accumulated from mouse deltas via pointer-lock API.
- Mouse yaw is *also* fed into the controller as the desired body-facing
  angle — so turning the mouse turns the character (clamped yaw delta per
  frame so the character can't spin infinitely fast).
- The humanoid's head bone isn't physically rotated by the mouse (the neck
  has no actuator in this XML). Instead, the camera rig inherits head world
  position but uses our own yaw+pitch accumulator for orientation. This
  decouples "where my avatar's head points" from "where my view points"
  which is standard in every FPS — the view always stays smooth even if the
  physical head is vibrating from footfalls.
- Pointer-lock is entered via click-on-canvas, exit with Esc. While locked,
  OrbitControls is disabled; WASD/Space/Ctrl/V/G are routed to the controller.

**Third-person.**
- Camera position: `torso + spherical offset (r=3.2m, θ, φ)` where θ/φ are
  accumulated from mouse deltas same as FPV.
- Look-at: `torso + shoulder-height offset`.
- Camera is raycast-clipped: if a raycast from torso to ideal camera pos hits
  the floor or another body at distance `d < r`, shorten to `d − 0.2m`. This
  is the standard third-person camera collision pattern.
- WASD direction is computed in camera-yaw space (XZ plane). Forward = "away
  from camera toward character's forward in view space."

Both modes: small camera-shake modulation on footfall (tiny, optional).
Inherit the existing ACES tonemap + bloom stack unchanged.

## 5. Input handling

Pointer-lock is the gate. Outside pointer-lock → normal orbit camera + the
old controls. Inside pointer-lock → FPS routing. This keeps the modes cleanly
separated so the existing grab/drag/replay systems don't need to know about
control mode.

Key map (all ignored while typing in `<input>`/`<textarea>`):

| Key     | FPV / TPV action |
|---------|------------------|
| W/S/A/D | Translate body relative to camera forward/right |
| Space   | Jump (one-shot; gated on ground contact) |
| Ctrl    | Crouch (hold) |
| V       | Toggle FPV ↔ TPV |
| G       | Toggle control mode on/off (exits pointer-lock, restores orbit cam) |
| R       | Replay (already wired) |
| Esc     | Always exits pointer-lock (browser-enforced) |

## 6. Data flow

```
┌──────────────┐   input vector
│ KeyboardInput├───────────────────┐
└──────────────┘                   ▼
┌──────────────┐  yaw/pitch ┌─────────────────┐  pose targets ┌──────────┐  ctrl[]   ┌────────┐
│ PointerLock  │──────────►│ HumanoidPilot    │──────────────►│ PD loop  │──────────►│ mj_step│
└──────────────┘            │  (gait FSM,      │               └──────────┘           └────────┘
                            │   jump/crouch)   │
                            │                  │  xfrc[pelvis]
                            │                  │─────────────────────────────────────►┐
                            └────────┬─────────┘                                      │
                                     │                                                │
                            ┌────────▼─────────┐                                      │
                            │ CameraRig        │ ◄── head body world transform ◄──────┘
                            │  (FPV/TPV)       │
                            └──────────────────┘
```

New module `src/humanoidPilot.js` owns:
- `KeyboardInput` subclass (tracks WASD/Space/Ctrl keystate).
- Gait state machine.
- PD loop (same formula as current `applyStandHold` — reuses the existing
  `_pdActIdx/_pdQposAdr/_pdDofAdr/_pdGear` caches; we extend not replace).
- Root wrench writer.
- Exposes `update(dt)` called before `stepPhysics`.

New module `src/cameraRig.js` owns:
- Pointer-lock handling.
- FPV/TPV mode switch + transition smoothing.
- Mouse delta → yaw/pitch accumulation.
- Each frame writes `camera.position` + `camera.quaternion` directly (not
  via OrbitControls — we temporarily disable OrbitControls when active).

## 7. Scaffolding plan — feature-by-feature

Rex asked for a procedural build-up so issues can be isolated. Seven stages,
each independently testable before the next one lands. Each stage gets its
own commit.

**Stage 0 — Input + mode toggle (no motion yet).**
`KeyboardInput` + `ControlMode` toggle with G key. A top-left status chip
shows "CONTROL: OFF / FPV / TPV". Pointer-lock enters on canvas click while
toggle is on. Proves: key events are captured, input is cleanly routed.

**Stage 1 — Camera rig (no locomotion yet).**
Implement FPV + TPV camera math. Entering FPV snaps the camera into the head
position and reads mouse deltas for yaw/pitch. TPV orbits around the torso.
V toggles. Humanoid is still held upright by the existing stand-hold PD.
Proves: camera math + pointer-lock are correct.

**Stage 2 — Horizontal drive (translation only, no gait).**
WASD applies a horizontal xfrc_applied wrench on the pelvis in the
camera-forward direction. No leg animation yet — the character slides across
the floor like a frozen T-pose. Proves: root-wrench propulsion works without
breaking the stand-hold PD.

**Stage 3 — Yaw drive.**
Mouse yaw writes a target facing angle; we apply a yaw torque on the pelvis
to rotate the whole character toward that angle. Clamped so the character
can't spin infinitely fast. Proves: we can turn.

**Stage 4 — Procedural walk cycle.**
Gait FSM writes leg + arm PD targets keyed off input magnitude. When
`||input|| > 0.1`, enter stance→swing cycle; at rest, stay in idle. Legs
lift and plant; arms swing anti-phase. Phase frequency scales with input
magnitude (slow walk vs run). Proves: the character LOOKS like it's
walking even though the root is still wrench-driven.

**Stage 5 — Jump.**
Ground-contact detector (is any foot geom colliding with the floor?). If
grounded and Space is pressed: impulse qvel on the root along +z + knee
tuck targets for 120 ms + extend targets for the rest of flight. On landing,
resume stance. Proves: a single discrete state transition works without
breaking the loop.

**Stage 6 — Crouch.**
While Ctrl is held: override leg PD targets to deep crouch pose. Camera
lowers by ~0.4m in FPV. Proves: modifier states compose with the walk cycle.

**Stage 7 — Polish.**
- Footstep cadence on audio (optional, disabled by default since audio was
  removed).
- Camera bob on footfall (tiny, in FPV only).
- Ground-clipping: if FPV camera ends up inside floor (fell over), fall back
  to a safe vantage until you stand back up.
- Replay integration: R still works while in control mode; replay scrubs
  all qpos including the character we were driving, and re-entering live
  resumes from the scrubbed state.

Each stage is ~30-80 lines of new code and can be visually verified in a few
seconds. If a later stage breaks, the previous commit is a working fallback.

## 8. Known pitfalls

**(a) Humanoid falling over when wrenched too hard.**
The pelvis mass is ~6.6 kg. A horizontal wrench of `F = m·a` for
a=5 m/s² is only 33 N, but the whole character is 40 kg, so to get
*whole-body* acceleration requires ~200 N applied to the pelvis — and the
resulting lever-arm torque against the neutral stance will topple the
character before the gait stabilizes. Mitigation: low-pass the input
acceleration + raise PD gains on the spine joints + add an always-on
small uprighting torque on the pelvis that fights pitch/roll away from
vertical. This is what TABS does; it's the "invisible puppeteer." We
verified empirically in iter 30 that 702 N on pelvis can lift the whole
40 kg ragdoll, so we have plenty of headroom for propulsion.

**(b) Pelvis CoM vs foot contact sync.**
The gait cycle needs ground contact to look correct — lifting a foot when
it's weight-bearing fights physics. Mitigation: detect which foot currently
has ground contact and bias the swing state to lift the non-weight-bearing
foot. Fallback if detection is unreliable: just alternate at fixed phase;
the wrench assist will paper over the discrepancy.

**(c) FPV camera nausea from root-wrench shakes.**
Wrench-driven motion is jerky. Mitigation: compute camera pose from an
exponentially-smoothed head position, not the raw head bone.
Alpha ≈ 0.2 cuts motion-sickness significantly without feeling laggy.

**(d) Pointer-lock + modal overlays.**
If the project-card modal is open, pointer-lock should release. We wire
`ProjectSystem.showCard` to exit pointer-lock; Esc closes card AND exits
control mode gracefully.

**(e) Control mode blocked by other keybinds.**
R (replay), the wind compass, etc. — existing keybinds must coexist. Route
through a single keydown dispatcher in `HumanoidPilot` that checks
`this.enabled` first and doesn't swallow keys it doesn't care about.

**(f) Scene-switch invalidating the head body reference.**
If the scene is reloaded (currently can't happen, only one scene), the
head bodyID might change. Use name-lookup (`bodies[i].name === "head"`)
each time we attach, not a cached index.

**(g) Gimbal lock at ±90° pitch.**
Standard FPS camera convention: clamp pitch to [−89°, +89°]. Done.

**(h) Sudden speed changes during a crouch-to-stand.**
PD target change from crouch pose to stance pose can snap up too fast.
Mitigation: same quintic-blend pose transitions we already have in the
PD loop (iter 36 verified 2.2° max tracking error across a blend).

## 9. Testing strategy

Each stage has a Playwright verification:
- Stage 0: `KeyboardEvent("keydown", {code:"KeyG"})` flips control mode.
- Stage 1: Enter FPV programmatically, read `camera.position` — should
  equal head body world position within 5 cm.
- Stage 2: Set input vector = (1, 0), step physics 60 frames, check
  `data.qvel[0]` (pelvis linear x) is positive and torso is still upright
  (z > 1.0 m).
- Stage 3: Set mouse yaw = π/2, check character faces +y after 1 s.
- Stage 4: Input = (1, 0), check leg qpos oscillates with expected phase
  cadence (≈2 Hz).
- Stage 5: Space keydown while grounded, check torso z rises above 1.5 m
  within 300 ms.
- Stage 6: Ctrl held, check torso z drops below 0.85 m.
- Stage 7: Run replay (R) while walking, check scrub path interpolates
  through recorded qpos smoothly.

## 10. Files touched

- New: `src/humanoidPilot.js` — gait FSM + PD + root wrench.
- New: `src/cameraRig.js` — FPV/TPV modes + pointer-lock.
- New: `src/keyboardInput.js` — central keystate tracker (Stage 0).
- Edit: `src/main.js` — instantiate pilot + rig; wire into animate loop;
  disable OrbitControls while `pilot.enabled`; remove standHold override
  when pilot owns control.
- Edit: `src/ui.js` — status chip "CONTROL: OFF / FPV / TPV" styled into
  existing design language.
- Edit: `src/controlsPanel.js` — add one row (toggle + current mode
  readout) in Scene section.

## 11. Commits

- `feat(fpv): stage 0 — keyboard input + control-mode toggle`
- `feat(fpv): stage 1 — fpv/tpv camera rig with pointer-lock`
- `feat(fpv): stage 2 — root-wrench horizontal drive`
- `feat(fpv): stage 3 — yaw drive from mouse`
- `feat(fpv): stage 4 — procedural walk cycle`
- `feat(fpv): stage 5 — jump with ground detection`
- `feat(fpv): stage 6 — crouch`
- `feat(fpv): stage 7 — polish + replay integration`

## 12. Open questions

None. All design decisions above are committed to defaults based on prior
project knowledge (iter 28–40 PD-tracking work, iter 9 grabber physics,
iter 32 replay infrastructure) + standard FPS conventions (V toggle, Esc
pointer-lock release, clamped pitch, pointer-lock-gated input routing).
