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
