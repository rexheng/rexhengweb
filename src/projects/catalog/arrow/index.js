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
  description:
    "Arrow is a marketplace for confidential inference: Phala's TEE nodes serve model calls that neither the provider nor the operator can inspect, and the marketplace matches buyers who want privacy to providers who can prove isolation. Built at LSE Build.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/arrow-solver" },
  ],
  abilityLabel: "Launch!",
  ability: "launch",
  // Glass cube silhouette: 1.80D × 1.80D × 1.80D (D=0.26) centred on body
  // origin (cubeBaseY = -0.90D, half-extent 0.234 each axis).
  hitbox: { hx: 0.234, hy: 0.234, hz: 0.234 },
  footprintOffset: 0,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
