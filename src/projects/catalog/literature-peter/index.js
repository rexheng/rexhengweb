import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "literature-peter",
  label: "Literature Peter",
  title: "Literature Peter · Instagram (@literature.peter)",
  subtitle: "Instagram · Literature",
  meta: "instagram · education",
  accent: "#6e1f2e",
  description:
    "Educational content series on Instagram under the handle @literature.peter — part of the Peter Network, producing engaging learning resources across disciplines.",
  links: [
    { label: "Visit Profile", href: "https://www.instagram.com/literature.peter" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
