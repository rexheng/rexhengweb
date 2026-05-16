// Amogus mesh — clone of the FBX-loaded crewmate, recentred and
// scale-normalised in src/projects/assets.js. See spec §3.4.

import * as THREE from "three";
import { modelCache } from "../../assets.js";
import { decoupleMaterials } from "../../materialClone.mjs";

export function buildMesh() {
  const cached = modelCache.amogus;
  if (!cached) return new THREE.Group();   // graceful fallback on load failure
  // clone(true) shares materials with the prototype and every sibling
  // clone; decoupleMaterials gives this instance its own so per-body
  // emissive highlight doesn't bleed across all spawned copies.
  return decoupleMaterials(cached.clone(true));
}
