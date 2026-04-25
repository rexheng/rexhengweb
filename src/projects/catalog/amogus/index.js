// Amogus project def.
// See spec §4.3. The catalog glob in src/projects/index.js imports this
// default export, validates it, and adds it to PROJECTS.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "amogus",
  label: "Amogus",
  title: "Amogus — Cursor Hack London 2026 · 2nd place",
  subtitle: "2026 · MCP server for Vibecoding",
  meta: "MCP · multi-agent · Cursor Hack London",
  accent: "#e25d63",
  // Project abstract — what the project is, not what the sprite looks like.
  description:
    "Amogus is an MCP server for Vibecoding — it orchestrates four parallel Claude agents that deliberate in isolation, then come together for 'emergency meeting' rounds where an evolutionary scoring pass votes the weakest branch out and evolves the rest. Built at Cursor Hack London 2026, where it took 2nd place. The sus red crewmate is the mascot: spawn it in the playground and give it a stab.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/amogus" },
  ],
  abilityLabel: "Stab!",
  ability: "stab",
  // Hitbox tuned to actual silhouette (D=0.26):
  //   width  ≈ bodyRadius D = 0.26 → hx 0.27
  //   depth  ≈ body + backpack reach behind ≈ 0.30 → hy 0.30
  //   height ≈ feet (-1.74D) to body top (1.20D) = 2.94D → hz 0.382
  // Mesh visual extends from local-y -0.452 (feet) to +0.312 (dome top).
  // Geom bottom at body-z -hz = -0.382. To align mesh feet to geom bottom:
  //   offset = meshBaseY + hz = -0.452 + 0.382 = -0.07 → mesh shifts UP 0.07.
  hitbox: { hx: 0.27, hy: 0.30, hz: 0.382 },
  footprintOffset: -0.07,
  // Wrap the DI builder so the ProjectSystem can call `def.buildMesh()`
  // with no arguments (legacy shape — system.js doesn't need to know about
  // proportions/primitives/materials).
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
