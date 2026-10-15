// Cultivate project def. Sprite is the 1903 Wright Flyer (GLB); see REFS.md.

import { buildMesh } from "./build.js";

const THREE_QUARTER_YAW = 0.87;   // rad (~50°) past the spawn's face-the-camera yaw

export default {
  id: "cultivate",
  label: "Cultivate",
  title: "Cultivate — Pop the Bubble 2026",
  subtitle: "2026 · LinkedIn for events",
  meta: "Next.js · LLM enrichment · Pop the Bubble London",
  accent: "#8cc63f",
  // Hairline biplane, top view: rounded wing, canard on its booms ahead,
  // twin tail booms behind, and the two pusher propellers.
  icon:
    '<path d="M4 9 H20 Q21.5 9 21.5 11 Q21.5 13 20 13 H4 Q2.5 13 2.5 11 Q2.5 9 4 9 Z"/>'
    + '<path d="M9.5 3.5 H14.5 Q15.5 3.5 15.5 4.5 Q15.5 5.5 14.5 5.5 H9.5 Q8.5 5.5 8.5 4.5 Q8.5 3.5 9.5 3.5 Z"/>'
    + '<path d="M10.5 5.5 V9 M13.5 5.5 V9"/>'
    + '<path d="M11 13 V20.5 M13 13 V20.5"/>'
    + '<path d="M5.5 15.8 H9.5 M14.5 15.8 H18.5"/>',
  description:
    "Cultivate is LinkedIn for events — one scan, no typing. Attendees join an event by QR or scan each other's badges; profiles are enriched from LinkedIn with Llama-3.3-70B and land in a D3 graph of everyone you've met across events, alongside notes, a People hub, Luma import, Stripe unlocks and CSV / ICS / Obsidian export. Built in 36 hours at Pop the Bubble, London (June 2026). The Wright Flyer is the mascot: double-click it for a test flight.",
  links: [
    { label: "Live", href: "https://tryattend.vercel.app/" },
    { label: "Source", href: "https://github.com/rexheng/networkcapture" },
  ],
  abilityLabel: "Fly!",
  ability: "fly",
  // 1903 Wright Flyer, Smithsonian NASM scan (CC0). Scaled by wingspan
  // (glTF +X); nose is glTF +Z. Hitbox + floor offset auto-derived.
  fbx: { url: "./assets/models/wright-flyer.glb", target: { axis: "x", value: 0.8 } },
  buildMesh: () => buildMesh(),
  // Spawn yaws every sprite so its body +X faces the camera. For the Flyer
  // (nose = body −Y) that is wingtip-on, its least readable angle; turn it a
  // further ~50° so it lands in a front three-quarter view, both wings and
  // the canard on show. Nothing to tick afterwards.
  onSpawn(slot, { app }) {
    const model = app?.model, data = app?.data;
    if (!model || !data) return;
    const jnt = model.body_jntadr[slot.bodyID];
    if (jnt < 0 || model.jnt_type[jnt] !== 0) return;
    const q = model.jnt_qposadr[jnt];
    const yaw = 2 * Math.atan2(data.qpos[q + 6], data.qpos[q + 3]) + THREE_QUARTER_YAW;
    data.qpos[q + 3] = Math.cos(yaw / 2);
    data.qpos[q + 4] = 0;
    data.qpos[q + 5] = 0;
    data.qpos[q + 6] = Math.sin(yaw / 2);
    app.mujoco?.mj_forward?.(model, data);
  },
};
