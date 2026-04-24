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
  // Wrap the DI builder so the ProjectSystem can call `def.buildMesh()`
  // with no arguments (legacy shape — system.js doesn't need to know about
  // proportions/primitives/materials).
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
