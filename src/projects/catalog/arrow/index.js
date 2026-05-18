// Arrow — LSE Build.

import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "arrow",
  label: "Arrow",
  title: "Arrow — LSE Build",
  subtitle: "Phala TEE inference marketplace",
  meta: "LSE Build · Phala · TEE",
  accent: "#8a6ad9",
  icon:
    '<path d="M7 5 H17 V11 Q17 16 12 19 Q7 16 7 11 Z"/>'
    + '<path d="M3 20 L21 4"/>'
    + '<path d="M17 4 H21 V8"/>'
    + '<path d="M3 20 L6 18 M3 20 L5 22"/>',
  description:
    "Arrow is a marketplace for confidential inference: Phala's TEE nodes serve model calls that neither the provider nor the operator can inspect, and the marketplace matches buyers who want privacy to providers who can prove isolation. Built at LSE Build.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/arrow-solver" },
  ],
  abilityLabel: "Launch!",
  ability: "launch",
  // Glass cube silhouette: 1.80D × 1.80D × 1.80D (D=0.26) centred on body
  // origin (cubeBaseY = -0.90D, half-extent 0.234 each axis).
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
