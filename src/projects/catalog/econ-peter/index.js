import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "econ-peter",
  label: "Econ Peter",
  title: "Econ Peter · Instagram (@econ.peter)",
  subtitle: "Instagram · Economics",
  meta: "instagram · education",
  accent: "#1e7a4f",
  description:
    "Educational content series on Instagram under the handle @econ.peter — part of the Peter Network, producing engaging learning resources across disciplines.",
  links: [
    { label: "Visit Profile", href: "https://www.instagram.com/econ.peter" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
