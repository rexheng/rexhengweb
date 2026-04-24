// Pulse ability — tick-based, ~2 seconds.
//
// Emits small spherical "node" markers in the slot's mesh group that travel
// radially outward in the horizontal plane and fade, then cleans up. Markers
// are added to the slot's mesh group so they inherit the slot's transform
// (they move with the physics body while the body tumbles).
//
// Metaphor: graph-theoretic station siting / Monte Carlo sampling lighting up.

import * as THREE from "three";

const DURATION_MS = 2000;
const NODE_COUNT = 4;
const START_R = 0.05;     // starting radius, MJ units
const END_R = 1.4;        // final radius
const NODE_RADIUS = 0.045;
const RISE = 0.15;        // slight vertical rise over life
const COLOUR = "#dc241f"; // London Underground red — matches olympic-way accent

export function pulse({ mesh }) {
  if (!mesh) return { tick() { return false; } };

  const group = new THREE.Group();
  group.name = "pulse_markers";
  mesh.add(group);

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOUR),
    emissive: new THREE.Color(COLOUR),
    emissiveIntensity: 1.2,
    roughness: 0.3,
    metalness: 0.0,
    transparent: true,
    opacity: 1.0,
  });

  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const ang = (i / NODE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
    const geom = new THREE.SphereGeometry(NODE_RADIUS, 12, 10);
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = false;
    group.add(m);
    nodes.push({ mesh: m, ang, geom });
  }

  let elapsed = 0;
  let disposed = false;

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;
      const t = Math.min(1, elapsed / DURATION_MS);

      const eased = 1 - Math.pow(1 - t, 2); // ease-out
      const r = START_R + (END_R - START_R) * eased;
      const y = RISE * eased;
      mat.opacity = Math.max(0, 1 - t);

      for (const n of nodes) {
        n.mesh.position.set(Math.cos(n.ang) * r, y, Math.sin(n.ang) * r);
      }

      if (t >= 1) {
        if (group.parent) group.parent.remove(group);
        for (const n of nodes) n.geom.dispose();
        mat.dispose();
        disposed = true;
        return false;
      }
      return true;
    },
  };
}
