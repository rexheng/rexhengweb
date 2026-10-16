// Cultivate project def. Sprite is the 1903 Wright Flyer (GLB); see REFS.md.

import { buildMesh } from "./build.js";

const THREE_QUARTER_YAW = 0.87;   // rad (~50°) past the spawn's face-the-camera yaw

export default {
  id: "cultivate",
  label: "Cultivate",
  title: "Cultivate — Pop the Bubble 2026",
  subtitle: "2026 · LinkedIn for events",
  meta: "Next.js · LLM enrichment · Pop the Bubble London",
  accent: "#a6ca9b", // palette C · Sage
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/cultivate.svg
  icon: '<path d="M4 4H44V24H24V44H4Z M8 8V20H20V8Z M28 8V20H40V8Z M8 28V40H20V28Z M12 12H16V16H12Z M32 12H36V16H32Z M12 32H16V36H12ZM36 28A8 8 0 1 1 36 44A8 8 0 1 1 36 28Z"/>',
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
