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
  title: "The Republic — research intelligence platform",
  subtitle: "2026 · ETH Oxford",
  meta: "research · intelligence · ETH Oxford",
  // Warm sandstone accent.
  accent: "#c9b58a",
  icon:
    '<path d="M5 8 L12 3 L19 8 Z"/>'
    + '<path d="M5 9 H19 M5.5 10.5 H18.5"/>'
    + '<path d="M7.5 10.5 V19 M11 10.5 V19 M13 10.5 V19 M16.5 10.5 V19"/>'
    + '<path d="M5.5 19 H18.5 M5 20.5 H19"/>',
  description:
    "The Republic is a research intelligence platform built at ETH Oxford — built around the procedural Doric column that reads as both title and landmark. It ingests research literature and synthesises it into navigable briefs, so a user can walk into a new field and leave with a defensible position rather than a tab graveyard.",
  links: [],
  abilityLabel: "Topple!",
  ability: "topple",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
