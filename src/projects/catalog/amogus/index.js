// Amogus project def. Sprite is FBX-loaded; see spec §3.4.

import { buildMesh } from "./build.js";

export default {
  id: "amogus",
  label: "Amogus",
  title: "Amogus — Cursor Hack London 2026 · 2nd place",
  subtitle: "2026 · MCP server for Vibecoding",
  meta: "MCP · multi-agent · Cursor Hack London",
  accent: "#e25d63",
  icon:
    '<path d="M8 7 Q8 4 12 4 Q16 4 16 7 V18 H14.5 V20 H13 V18 H11 V20 H9.5 V18 H8 V16 Q5.5 16 5.5 13 Q5.5 10 8 10 Z"/>'
    + '<ellipse cx="13" cy="9" rx="2.3" ry="1.5"/>',
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
