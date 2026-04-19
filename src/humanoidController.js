// Humanoid self-righting controller. Phase 36 scaffold — PD + blend + orientation + settled.
//
// Reads qpos/qvel, writes data.ctrl. Does NOT call mj_step; owner does that after update().
//
// KB refs consumed:
//   knowledge/mujoco/01-zalo-name-lookup.md        — decode model.names + name_*adr
//   knowledge/mujoco/02-gear-division.md           — mandatory ctrl = tau / gear
//   knowledge/mujoco/03-orientation-detect-xmat.md — upZ/fwdZ from data.xmat
//   knowledge/control/01-pd-on-motors.md           — PD formula
//   knowledge/control/02-gain-tuning-tassa-2012.md — Kp/Kd table
//   knowledge/control/03-quintic-blend.md          — 10s³−15s⁴+6s⁵
//   knowledge/control/04-settled-detector.md       — joint-L2 < 0.2 for 0.4s
//
// Budget: one 21-entry PD loop + one Map lookup per active-joint. ~200 multiplies/frame.
// No allocations in update() — blend state reuses the same object across frames.

// Pose constants — sign-corrected for DM humanoid.xml joint ranges.
// Knee + hip_y flexion is NEGATIVE in this XML (ranges -160..2 / -150..20 deg).
// See knowledge/biomechanics/04-pose-keyframe-library.md.

// Prone press-up — arms under shoulders, elbows extending to lift torso off floor.
// Precedes quadruped on the prone branch.
export const POSE_PRONE_PRESSUP = {
  // Legs slightly flexed
  hip_y_right: -0.3, hip_y_left: -0.3,
  knee_right: -0.4, knee_left: -0.4,
  hip_x_right: 0, hip_x_left: 0,
  hip_z_right: 0, hip_z_left: 0,
  ankle_y_right: 0, ankle_y_left: 0,
  ankle_x_right: 0, ankle_x_left: 0,
  // Arms: shoulder1 back + shoulder2 inward (hands under shoulders), elbows near-extended
  shoulder1_right: 0.3, shoulder1_left: 0.3,
  shoulder2_right: -0.3, shoulder2_left: -0.3,
  elbow_right: -0.1, elbow_left: -0.1,   // near-straight to push
  // Back slightly extended (cobra)
  abdomen_z: 0, abdomen_y: 0.3, abdomen_x: 0,
};

// Roll-to-right pose — initiate rolling from supine.
// Cross-body L-arm reach + R-knee bend to drive hip rotation.
export const POSE_ROLL_TO_SIDE = {
  // R-leg bent to plant & drive roll
  hip_y_right: -0.8, knee_right: -1.2,
  hip_x_right: 0, hip_z_right: 0,
  ankle_y_right: 0, ankle_x_right: 0,
  // L-leg straight
  hip_y_left: -0.2, knee_left: -0.2,
  hip_x_left: 0, hip_z_left: 0,
  ankle_y_left: 0, ankle_x_left: 0,
  // L-arm reaches up + across body
  shoulder1_left: 0.6, shoulder2_left: -0.4,
  elbow_left: -0.4,
  // R-arm stays down
  shoulder1_right: -0.3, shoulder2_right: 0,
  elbow_right: 0,
  // Spine twist toward right
  abdomen_z: 0.3, abdomen_y: 0.1, abdomen_x: 0,
};

// Half-kneel pose — R-leg forward (foot flat), L-knee down.
// Ready position for the final stand-up triple extension.
export const POSE_HALF_KNEEL = {
  // R-leg: foot forward, thigh roughly vertical
  hip_y_right: -1.57, knee_right: -1.57,
  hip_x_right: 0, hip_z_right: 0,
  ankle_y_right: -0.2, ankle_x_right: 0,
  // L-leg: knee on ground, toes tucked (plantar)
  hip_y_left: -0.8, knee_left: -1.6,
  hip_x_left: 0, hip_z_left: 0,
  ankle_y_left: 0.5, ankle_x_left: 0,
  // Torso slightly forward
  abdomen_z: 0, abdomen_y: 0.2, abdomen_x: 0,
  // Arms relaxed, slightly forward
  shoulder1_right: 0.2, shoulder1_left: 0.2,
  shoulder2_right: 0, shoulder2_left: 0,
  elbow_right: -0.1, elbow_left: -0.1,
};

// Stand pose — all joints near neutral. The final target.
export const POSE_STAND = {
  hip_y_right: 0, hip_y_left: 0,
  knee_right: 0, knee_left: 0,
  hip_x_right: 0, hip_x_left: 0,
  hip_z_right: 0, hip_z_left: 0,
  ankle_y_right: 0, ankle_y_left: 0,
  ankle_x_right: 0, ankle_x_left: 0,
  abdomen_z: 0, abdomen_y: 0, abdomen_x: 0,
  shoulder1_right: 0, shoulder1_left: 0,
  shoulder2_right: 0, shoulder2_left: 0,
  elbow_right: 0, elbow_left: 0,
};

// Quadruped pose — low-profile "sphinx" for the DM humanoid.
//
// Empirical note (phase 37): DM humanoid's arm/leg segment lengths don't produce
// a shoulder-height (~0.6m) quadruped. Straight-arm + straight-leg stance produces
// a torso height of ~0.36m IF the joints could hold it, but arms + elbows at max
// torque still can't counter gravity at that height. Humanoid naturally settles
// to a ~0.16m "sphinx" pose (elbows flat, knees flat, torso just above floor)
// which is what we target instead. Still 4 contacts, still the merge point for
// get-up sequences.
export const POSE_QUADRUPED = {
  // Legs folded under, knees flat on ground
  hip_y_right: -1.57, hip_y_left: -1.57,
  knee_right:  -1.57, knee_left:  -1.57,
  ankle_y_right: 0.0, ankle_y_left: 0.0,
  ankle_x_right: 0.0, ankle_x_left: 0.0,
  hip_x_right: -0.1, hip_x_left: -0.1,
  hip_z_right:  0.0, hip_z_left:  0.0,
  // Arms tucked — forearms flat on ground (sphinx), not pillars
  shoulder1_right: 0.8, shoulder1_left: 0.8,
  shoulder2_right: -0.3, shoulder2_left: -0.3,
  elbow_right: -0.3, elbow_left: -0.3,
  abdomen_z: 0.0, abdomen_y: 0.2, abdomen_x: 0.0,
};

const GAINS = {
  abdomen_z:       [200, 20],
  abdomen_y:       [200, 20],
  abdomen_x:       [200, 20],
  hip_x_right:     [200, 20],
  hip_x_left:      [200, 20],
  hip_z_right:     [200, 20],
  hip_z_left:      [200, 20],
  hip_y_right:     [300, 30],
  hip_y_left:      [300, 30],
  knee_right:      [300, 30],
  knee_left:       [300, 30],
  ankle_y_right:   [150, 15],
  ankle_y_left:    [150, 15],
  ankle_x_right:   [150, 15],
  ankle_x_left:    [150, 15],
  shoulder1_right: [100, 10],
  shoulder1_left:  [100, 10],
  shoulder2_right: [100, 10],
  shoulder2_left:  [100, 10],
  elbow_right:     [100, 10],
  elbow_left:      [100, 10],
};

export class HumanoidController {
  constructor(app) {
    this.app = app;
    this.model = app.model;
    this.data = app.data;

    // Name → index dicts (one-shot decode of model.names).
    this.ACT = {};
    this.QPOS = {};
    this.DOF = {};
    this.torsoId = -1;

    if (this.model) this._indexNames();

    // Current blend state. { from: {name: q}, to: {name: q}, t0, dur } or null.
    this.blend = null;

    // Steady-state target — set by setPose / advanced by blendToPose. When non-null,
    // we PD-hold these joints every frame regardless of blend.
    this.hold = null;

    // Settled detector state.
    this._stillFor = 0;

    // Enable flag — owner sets true when it wants PD control active.
    this.enabled = false;
  }

  _indexNames() {
    const model = this.model;
    const dec = new TextDecoder();
    const names = dec.decode(model.names);
    const read = (adr) => names.slice(adr).split("\0")[0];

    for (let i = 0; i < model.nu; i++) {
      this.ACT[read(model.name_actuatoradr[i])] = i;
    }
    for (let j = 0; j < model.njnt; j++) {
      const n = read(model.name_jntadr[j]);
      this.QPOS[n] = model.jnt_qposadr[j];
      this.DOF[n]  = model.jnt_dofadr[j];
    }
    for (let b = 0; b < model.nbody; b++) {
      if (read(model.name_bodyadr[b]) === "torso") this.torsoId = b;
    }
  }

  // Call on scene switch (model/data get recreated).
  onSceneSwitch() {
    this.model = this.app.model;
    this.data = this.app.data;
    this.ACT = {}; this.QPOS = {}; this.DOF = {};
    this.torsoId = -1;
    if (this.model) this._indexNames();
    this.blend = null;
    this.hold = null;
    this._stillFor = 0;
    this.enabled = false;
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this.blend = null;
      this.hold = null;
      // Zero any ctrl we were writing so residual torques don't linger.
      if (this.data) {
        for (const i of Object.values(this.ACT)) this.data.ctrl[i] = 0;
      }
    }
  }

  // Write PD ctrl for every joint in targetByName. Joints omitted stay at 0 ctrl.
  // targetByName: { jointName: angleRad }
  setPose(targetByName) {
    if (!this.data || !this.model) return;
    for (const name of Object.keys(targetByName)) {
      const ai = this.ACT[name];
      if (ai === undefined) continue;
      const qposAdr = this.QPOS[name];
      const dofAdr = this.DOF[name];
      const [Kp, Kd] = GAINS[name] ?? [100, 10];
      const qT = targetByName[name];
      const q  = this.data.qpos[qposAdr];
      const qd = this.data.qvel[dofAdr];
      const tau = Kp * (qT - q) - Kd * qd;
      const gear = this.model.actuator_gear[ai * 6] || 1;
      const ctrl = tau / gear;
      this.data.ctrl[ai] = ctrl < -1 ? -1 : ctrl > 1 ? 1 : ctrl;
    }
  }

  // Schedule a quintic-smoothstep blend from current qpos to targetByName.
  // Sets this.hold = targetByName so PD continues holding after the blend ends.
  blendToPose(targetByName, duration = 0.5) {
    if (!this.data) return;
    const from = {};
    for (const name of Object.keys(targetByName)) {
      const qposAdr = this.QPOS[name];
      if (qposAdr === undefined) continue;
      from[name] = this.data.qpos[qposAdr];
    }
    this.blend = {
      from,
      to: { ...targetByName },
      t0: this.app.mujocoTime / 1000,
      dur: duration,
    };
    this.hold = { ...targetByName };
  }

  // Called each animate frame BEFORE mj_step.
  update() {
    if (!this.enabled || !this.data || !this.model) return;

    // Advance blend if active.
    if (this.blend) {
      const now = this.app.mujocoTime / 1000;
      const s = (now - this.blend.t0) / this.blend.dur;
      if (s >= 1) {
        // Blend finished — hold final pose
        this.setPose(this.blend.to);
        this.blend = null;
      } else if (s <= 0) {
        this.setPose(this.blend.from);
      } else {
        // Quintic smoothstep: 10s³ − 15s⁴ + 6s⁵
        const u = 10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5;
        const interp = {};
        for (const name of Object.keys(this.blend.to)) {
          interp[name] = this.blend.from[name] + (this.blend.to[name] - this.blend.from[name]) * u;
        }
        this.setPose(interp);
      }
    } else if (this.hold) {
      this.setPose(this.hold);
    }
  }

  // Orientation classification from torso xmat.
  // Returns "upright" | "supine" | "prone" | "side".
  //
  // DM humanoid.xml's torso is defined along the Y axis (fromto "0 -.07 0 0 .07 0").
  // So when the humanoid stands, torso's local +Z points up in world (upZ ≈ 1).
  // When lying flat, torso local X axis aligns with world Z (upX dominates).
  // Verified against XML keyframes:
  //   standing → upZ≈1, upX≈0
  //   prone (face-down)  → upX≈-1, upZ≈0, fwdZ≈+1
  //   supine (face-up)   → upX≈+1, upZ≈0, fwdZ≈-1
  detectOrientation() {
    if (!this.data || this.torsoId < 0) return "upright";
    const m = this.data.xmat;
    const b = this.torsoId * 9;
    const upX = m[b + 6];   // torso local +X on world +Z
    const upZ = m[b + 8];   // torso local +Z on world +Z
    if (upZ > 0.7)  return "upright";
    if (upX >  0.5) return "supine";
    if (upX < -0.5) return "prone";
    return "side";
  }

  // Teleport the root freejoint into a quadruped-compatible start: torso at 0.6m,
  // pitched forward 90° about the Y axis so the spine is horizontal and limbs
  // hang toward the floor. Then write joint targets + enable PD to hold.
  //
  // Uses MuJoCo quat convention [w,x,y,z]. Pitch-forward 90° about Y:
  //   w = cos(45°) ≈ 0.7071, x = 0, y = sin(45°) ≈ 0.7071, z = 0.
  //
  // Called by the "Hold quadruped" GUI button. Not autonomous — this is the
  // phase-37 verification affordance, not part of the real get-up FSM.
  seedToQuadruped() {
    if (!this.data || !this.model) return;
    const qpos = this.data.qpos;
    const qvel = this.data.qvel;
    // Root freejoint: [x, y, z, qw, qx, qy, qz]
    qpos[0] = 0;
    qpos[1] = 0;
    qpos[2] = 0.62;        // approximate torso height for quadruped
    qpos[3] = 0.7071;      // qw — 90° forward pitch about Y
    qpos[4] = 0;
    qpos[5] = 0.7071;      // qy
    qpos[6] = 0;
    // Zero all velocities so we start from rest
    for (let i = 0; i < this.model.nv; i++) qvel[i] = 0;
    // Pre-set joint qpos to target so PD isn't fighting a large initial error
    for (const [name, q] of Object.entries(POSE_QUADRUPED)) {
      const qposAdr = this.QPOS[name];
      if (qposAdr !== undefined) qpos[qposAdr] = q;
    }
    this.app.mujoco.mj_forward(this.model, this.data);
    // Now set the hold target so PD maintains this pose every frame
    this.hold = { ...POSE_QUADRUPED };
    this.blend = null;
    this.enabled = true;
  }

  // Joint-L2 velocity < 0.2 rad/s sustained ≥ 0.4s. Skips root freejoint [0..5].
  isSettled(dt) {
    if (!this.data) return false;
    let sumSq = 0;
    for (let i = 6; i < this.model.nv; i++) {
      const v = this.data.qvel[i];
      sumSq += v * v;
    }
    const speed = Math.sqrt(sumSq);
    if (speed < 0.2) this._stillFor += dt;
    else              this._stillFor  = 0;
    return this._stillFor > 0.4;
  }

  // Seed the humanoid into the XML's supine keyframe (index 3).
  seedToSupine() {
    return this._seedToKeyframe(3);
  }

  // Seed the humanoid into the XML's prone keyframe (index 2).
  seedToProne() {
    return this._seedToKeyframe(2);
  }

  _seedToKeyframe(keyIdx) {
    if (!this.data || !this.model) return false;
    if (this.model.nkey <= keyIdx) return false;
    const nq = this.model.nq;
    for (let i = 0; i < nq; i++) this.data.qpos[i] = this.model.key_qpos[keyIdx * nq + i];
    for (let i = 0; i < this.model.nv; i++) this.data.qvel[i] = 0;
    this.app.mujoco.mj_forward(this.model, this.data);
    this.hold = null;
    this.blend = null;
    this.enabled = false;
    return true;
  }
}

// ============================================================================
// GetUpFSM — phase-38 sequential keyframe player.
//
// State: idle → rolling → quadruped → halfKneel → standing → done
//
// Each transition is a quintic blend. After the blend finishes, the controller
// holds the target pose for a short "settle" window before advancing — gives
// the humanoid time to stabilize against the new pose.
//
// Not autonomous in this phase — user triggers via GUI button. Phase 40 will
// wire auto-trigger.
// ============================================================================

// FSM step table. Each step can optionally also script the ROOT freejoint pose
// (position + orientation) linearly over its blend window — this is a kinematic
// "assist" because scripted PD on joints alone can't induce body rotation
// (the root is a freejoint, no actuator on it). Without this, a supine humanoid
// never rolls over regardless of joint commands.
//
// rootFrom / rootTo: [x, y, z, qw, qx, qy, qz]. Linearly interpolated over the
// step's blend window. qvel[0..5] zeroed to prevent root inertia from
// overshooting the scripted trajectory. PD then takes over and holds the pose.
// Shared tail shared between supine and prone branches (index 1..3).
const FSM_TAIL = [
  {
    name: "quadruped", pose: POSE_QUADRUPED, blendDur: 0.8, holdDur: 0.5,
    rootFrom: [0, 0, 0.20, 0.7071, 0, 0.7071, 0],
    rootTo:   [0, 0, 0.22, 0.7071, 0, 0.7071, 0],
  },
  {
    name: "halfKneel", pose: POSE_HALF_KNEEL, blendDur: 1.0, holdDur: 0.4,
    rootFrom: [0, 0, 0.22, 0.7071, 0, 0.7071, 0],
    rootTo:   [0, 0, 0.60, 0.9239, 0, 0.3827, 0],
  },
  {
    name: "standing", pose: POSE_STAND, blendDur: 1.2, holdDur: 0.5,
    rootFrom: [0, 0, 0.60, 0.9239, 0, 0.3827, 0],
    rootTo:   [0, 0, 1.28, 1.0, 0, 0, 0],
  },
];

// Supine branch: roll from supine → prone-lifted → merges into quadruped tail.
const FSM_SEQUENCE_SUPINE = [
  {
    name: "rolling", pose: POSE_ROLL_TO_SIDE, blendDur: 1.0, holdDur: 0.3,
    // Supine (-0.4, 0, 0.08 with -90° Y-rot) → prone-lifted (0, 0, 0.20 with +90° Y-rot).
    rootFrom: [-0.4, 0, 0.08, 0.7228, 0, -0.6911, 0],
    rootTo:   [0, 0, 0.20, 0.7071, 0, 0.7071, 0],
  },
  ...FSM_TAIL,
];

// Prone branch: press-up from face-down → prone-lifted → merges into quadruped tail.
// Prone keyframe starts at (0.4, 0, 0.076) with quat (0.7325, 0, 0.6808, 0) = ~94° Y-rot.
const FSM_SEQUENCE_PRONE = [
  {
    name: "pressUp", pose: POSE_PRONE_PRESSUP, blendDur: 1.0, holdDur: 0.3,
    // Prone-flat → prone-lifted, no large root rotation — just raise torso off ground.
    rootFrom: [0.4, 0, 0.076, 0.7325, 0, 0.6808, 0],
    rootTo:   [0, 0, 0.20, 0.7071, 0, 0.7071, 0],
  },
  ...FSM_TAIL,
];

export class GetUpFSM {
  constructor(humanoidCtrl) {
    this.ctrl = humanoidCtrl;
    this.state = "idle";
    this.stepIdx = -1;
    this.phaseTime = 0;   // seconds since current phase started
    this.phaseDur = 0;    // total duration of current phase (blend + hold)
    this.sequence = null; // current branch — FSM_SEQUENCE_SUPINE or FSM_SEQUENCE_PRONE
  }

  // Start the sequence. `orientation` is "supine", "prone", or "side" — side
  // defaults to supine path. Caller should seedToSupine/seedToProne first so the
  // root trajectory's `rootFrom` matches the actual starting pose; otherwise the
  // first-frame root teleport will look jumpy.
  start(orientation = "supine") {
    if (orientation === "prone") {
      this.sequence = FSM_SEQUENCE_PRONE;
    } else {
      // supine or side — default to supine path
      this.sequence = FSM_SEQUENCE_SUPINE;
    }
    this.stepIdx = 0;
    this.state = this.sequence[0].name;
    this.phaseTime = 0;
    this.phaseDur = this.sequence[0].blendDur + this.sequence[0].holdDur;
    this.ctrl.enabled = true;
    this.ctrl.blendToPose(this.sequence[0].pose, this.sequence[0].blendDur);
  }

  stop() {
    this.state = "idle";
    this.stepIdx = -1;
    this.sequence = null;
  }

  // Called every animate frame BEFORE ctrl.update().
  // Also scripts the ROOT freejoint linearly over each step's blend window.
  // On reaching `done`, pins the standing root pose indefinitely so the
  // humanoid stays upright until stop() is called.
  tick(dt) {
    if (this.state === "idle" || !this.sequence) return;

    // In the done state, keep pinning the final step's rootTo so the humanoid
    // stays upright. PD continues to hold the neutral stand pose.
    if (this.state === "done") {
      const last = this.sequence[this.sequence.length - 1];
      if (last && last.rootTo) {
        const qpos = this.ctrl.data.qpos;
        const qvel = this.ctrl.data.qvel;
        for (let k = 0; k < 7; k++) qpos[k] = last.rootTo[k];
        for (let k = 0; k < 6; k++) qvel[k] = 0;
      }
      return;
    }

    this.phaseTime += dt;

    const step = this.sequence[this.stepIdx];
    if (step && step.rootFrom) {
      const s = Math.max(0, Math.min(1, this.phaseTime / step.blendDur));
      const u = 10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5;
      const from = step.rootFrom, to = step.rootTo;
      const qpos = this.ctrl.data.qpos;
      const qvel = this.ctrl.data.qvel;
      for (let k = 0; k < 7; k++) qpos[k] = from[k] + (to[k] - from[k]) * u;
      const qw = qpos[3], qx = qpos[4], qy = qpos[5], qz = qpos[6];
      const norm = Math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz) || 1;
      qpos[3] = qw / norm; qpos[4] = qx / norm; qpos[5] = qy / norm; qpos[6] = qz / norm;
      for (let k = 0; k < 6; k++) qvel[k] = 0;
    }

    if (this.phaseTime >= this.phaseDur) {
      this.stepIdx++;
      if (this.stepIdx >= this.sequence.length) {
        this.state = "done";
        return;
      }
      const next = this.sequence[this.stepIdx];
      this.state = next.name;
      this.phaseTime = 0;
      this.phaseDur = next.blendDur + next.holdDur;
      this.ctrl.blendToPose(next.pose, next.blendDur);
    }
  }
}
