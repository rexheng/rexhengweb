import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "lawsuit-peter",
  label: "Lawsuit Peter",
  title: "Lawsuit Peter · Instagram (@lawsuit.peter)",
  subtitle: "Instagram · Law",
  meta: "instagram · education",
  accent: "#1a1a1f",
  description:
    "Educational content series on Instagram under the handle @lawsuit.peter — part of the Peter Network, producing engaging learning resources across disciplines.",
  links: [
    { label: "Visit Profile", href: "https://www.instagram.com/lawsuit.peter" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
