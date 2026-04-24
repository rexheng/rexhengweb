// Republic project def.
// See spec §4.3 + §6.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "republic",
  label: "Republic",
  title: "The Republic — a standing order",
  subtitle: "2026 · a marble column, loosely installed",
  meta: "three.js · procedural · lathe",
  // Placeholder accent pulled from spec §6 (warm sandstone).
  accent: "#c9b58a",
  // PLACEHOLDER ABSTRACT — Rex to supply the real copy. Republic has no
  // corresponding card on projects/index.html. Current text positions it
  // as an experiment in procedural Roman/Greek architecture.
  description:
    "An experiment in procedural classical architecture — a single Doric column, entasis and flutes and all, composed from Three.js lathes and primitives and grafted onto the ragdoll playground as a toppling landmark. Placeholder abstract; real copy pending.",
  links: [
    { label: "Source", href: "#" },
  ],
  abilityLabel: "Topple!",
  ability: "topple",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
