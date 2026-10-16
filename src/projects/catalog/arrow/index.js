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
  accent: "#d59cc8", // palette C · Mauve
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/arrow.svg
  icon: '<path d="M4 16L16 4H44V32L32 44V16ZM4 20H25.172L4 41.172ZM28 22.828V44H6.828Z"/>',
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
