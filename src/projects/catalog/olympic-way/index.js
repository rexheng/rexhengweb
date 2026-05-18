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
  accent: "#dc241f",
  icon:
    '<circle cx="10" cy="12" r="5"/>'
    + '<circle cx="10" cy="12" r="2.5"/>'
    + '<path d="M14 9 L18 5"/>'
    + '<path d="M14 15 L18 19"/>'
    + '<circle cx="19" cy="4.5" r="1.4"/>'
    + '<circle cx="19" cy="19.5" r="1.4"/>',
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
