// Musicity — Encode AI Hackathon.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "musicity",
  label: "Musicity",
  title: "Musicity — Encode AI Hackathon",
  subtitle: "city + music × AI",
  meta: "Encode · hackathon · music",
  accent: "#d4a05a",
  description:
    "Musicity was an Encode AI Hackathon entry at the intersection of cities and music — the skyline below and the floating note above are the sprite's shorthand. Full project writeup pending.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/musicity" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
