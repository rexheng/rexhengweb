// Amogus project def. Sprite is FBX-loaded; see spec §3.4.

import { buildMesh } from "./build.js";

export default {
  id: "amogus",
  label: "Amogus",
  title: "Amogus — Cursor Hack London 2026 · 2nd place",
  subtitle: "2026 · MCP server for Vibecoding",
  meta: "MCP · multi-agent · Cursor Hack London",
  accent: "#dc836f", // palette C · Terracotta
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/amogus.svg
  icon: '<path d="M8 20A4 4 0 0 1 12 24V32A4 4 0 0 1 8 36A4 4 0 0 1 4 32V24A4 4 0 0 1 8 20ZM16 40V18A14 14 0 0 1 41.2 9.6A1.5 1.5 0 0 1 40 12H30A10 10 0 0 0 30 32H40A4 4 0 0 1 44 36V40A4 4 0 0 1 40 44H36A4 4 0 0 1 32 40V38A2 2 0 0 0 28 38V40A4 4 0 0 1 24 44H20A4 4 0 0 1 16 40ZM30 16H40A6 6 0 0 1 40 28H30A6 6 0 0 1 30 16Z"/>',
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
