// Amogus mesh — clone of the FBX-loaded crewmate, recentred and
// scale-normalised in src/projects/assets.js. See spec §3.4.

import * as THREE from "three";
import { modelCache } from "../../assets.js";

export function buildMesh() {
  const cached = modelCache.amogus;
  if (!cached) return new THREE.Group();   // graceful fallback on load failure
  return cached.clone(true);
}
