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
  footprintOffset: 0.22,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
