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
  title: "Amogus — 2nd Cursor Hackathon",
  subtitle: "2024 · a sus little guy",
  meta: "three.js · procedural",
  accent: "#e25d63",
  // Project abstract — what the project is, not what the sprite looks like.
  description:
    "Amogus was a weekend test from the 2nd Cursor Hackathon (2024) — a quick attempt at pushing procedural Three.js primitives far enough to produce a recognisable character without an asset pipeline. The only output is the red crewmate you can spawn in this ragdoll playground; the experiment was whether shape fidelity is achievable from geometry alone, with no textures, rigs or imported meshes.",
  links: [
    { label: "Source", href: "#" },
  ],
  abilityLabel: "Stab!",
  ability: "stab",
  // Wrap the DI builder so the ProjectSystem can call `def.buildMesh()`
  // with no arguments (legacy shape — system.js doesn't need to know about
  // proportions/primitives/materials).
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
