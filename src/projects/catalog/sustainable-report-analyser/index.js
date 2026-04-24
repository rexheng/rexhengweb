import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "sustainable-report-analyser",
  label: "Sustainable Report Analyser",
  title: "Sustainable Report Analyser — AI ESG-report pipeline",
  subtitle: "Prompt Engineering · AI · ESG",
  meta: "prompt engineering · ai · esg · nlp",
  accent: "#6b9b5f",
  description:
    "AI-powered prompt engineering solution for analyzing sustainability reports. Extract key ESG metrics and insights.",
  links: [
    {
      label: "View Documentation",
      href: "https://docs.google.com/document/d/1e5PgHN8UrYMhesZB3XK-g0LJO-lboEt4aJv-cW73s4Y/edit?usp=sharing",
    },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
