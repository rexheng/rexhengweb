import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "govt-peter",
  label: "Govt Peter",
  title: "Govt Peter · Instagram (@govt.peter)",
  subtitle: "Instagram · Government & politics",
  meta: "instagram · education",
  accent: "#1b3561",
  description:
    "Educational content series on Instagram under the handle @govt.peter — part of the Peter Network, producing engaging learning resources across disciplines.",
  links: [
    { label: "Visit Profile", href: "https://www.instagram.com/govt.peter" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
