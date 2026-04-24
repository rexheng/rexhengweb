import * as THREE from "three";
import { buildMesh } from "./build.js";
import * as proportions from "./proportions.js";
import * as materials from "../../builders/materials.js";
import * as primitives from "../../builders/primitives.js";

export default {
  id: "sustainalytics-scraper",
  label: "Sustainalytics Scraper",
  title: "Sustainalytics Scraper — ESG data pipeline",
  subtitle: "Python · web scraping · ESG",
  meta: "python · scraping · esg",
  accent: "#6b9b5f",
  description:
    "Python-based web scraper for extracting ESG data from Sustainalytics platform. Automated data collection for sustainability metrics analysis.",
  links: [
    { label: "View on GitHub", href: "https://github.com/rexheng/sustainlyticsscraper/tree/main" },
  ],
  ability: null,
  buildMesh: () => buildMesh({ THREE, materials, primitives, proportions }),
};
