// Olympic Way — Susquehanna Datathon 2026 · 1st place.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "olympic-way",
  label: "Olympic Way",
  title: "Olympic Way Interchange — Susquehanna Datathon 2026 · 1st place",
  subtitle: "2026 · graph-theoretic station siting",
  meta: "datathon · graph theory · Monte Carlo",
  accent: "#d66f6a", // palette C · Brick
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/olympic-way.svg
  icon: '<path d="M7.319 16A18.5 18.5 0 0 1 40.681 16H30A10 10 0 0 0 18 16ZM0 20H48V28H0ZM40.681 32A18.5 18.5 0 0 1 7.319 32H18A10 10 0 0 0 30 32Z"/>',
  description:
    "A new tube station, sited by graph theory rather than planning politics. Given a 358-node underground network, the model treats every candidate Olympic Way interchange as a shortest-path shift across the system and runs Monte Carlo over passenger flow to score which location relieves the most load with the fewest dominoes. Took 1st place at the Susquehanna Datathon 2026.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/london_lsoa_map" },
  ],
  abilityLabel: "Summon Train!",
  ability: "dune-worm",
  // Ability mesh — Bombardier S Stock train (GLB, preloaded into
  // modelCache.bombardier). Sprite mesh stays procedural (the roundel +
  // plinth from build.js); only the ability uses the GLB.
  abilityFbx: {
    url: "./assets/models/bombardier-s-stock.glb",
    target: { axis: "z", value: 3.0 },
    cacheKey: "bombardier",
  },
  // Sprite hitbox + footprintOffset auto-derived (§3.9).
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
