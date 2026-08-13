// Manusman — Manus Vibecoding Hackathon 2026 · Most Commercial Product.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "manusman",
  label: "Manusman",
  title: "Manusman — Manus Vibecoding Hackathon 2026 · Most Commercial Product",
  subtitle: "2026 · AI client meeting prep",
  meta: "Manus · parallel agents · Electron",
  accent: "#c17a3a",
  icon:
    '<path d="M6 5 H16 V19 H6 Z"/>'
    + '<path d="M8 8 H14 M8 11 H13 M8 14 H12"/>'
    + '<path d="M12 15 H19 V21 H12 Z"/>',
  description:
    "Manusman is an AI client meeting prep platform. Parallel research agents stream company and contact briefings into exportable PDFs, and a Google Meet-style overlay carries the research into the call. Built at the Manus Vibecoding Hackathon 2026, where it took Most Commercial Product, 1st of 60.",
  links: [
    { label: "Live site", href: "https://manusman.manus.space" },
  ],
  abilityLabel: "Brief!",
  ability: "launch",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
