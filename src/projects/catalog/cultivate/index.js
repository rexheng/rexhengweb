// Cultivate — Pop the Bubble (London, June 2026). Live as tryattend.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "cultivate",
  label: "Cultivate",
  title: "Cultivate — Pop the Bubble · London 2026",
  subtitle: "event networking capture · tryattend",
  meta: "QR · graph · Pop the Bubble",
  accent: "#3d8a9e",
  icon:
    '<path d="M4 4 H10 V10 H4 Z"/>'
    + '<path d="M14 4 H20 V10 H14 Z"/>'
    + '<path d="M4 14 H10 V20 H4 Z"/>'
    + '<path d="M14 14 H16 V16 H14 Z M18 14 H20 V16 H18 Z M14 18 H16 V20 H14 Z M18 18 H20 V20 H18 Z"/>',
  description:
    "Cultivate captures who you met at an event: QR scan, enrichment, and a graph of those connections. Built at Pop the Bubble in London, June 2026. Live as tryattend.",
  links: [
    { label: "Live site", href: "https://tryattend.vercel.app" },
    { label: "Source", href: "https://github.com/rexheng/networkcapture" },
  ],
  abilityLabel: "Graph!",
  ability: "pulse",
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
