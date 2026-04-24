// Amogus procedural mesh — as-is port from the pre-refactor src/projects.js.
// Magic numbers intentionally preserved; the catalog contract (no inline
// literals in build.js) is suspended for this file per spec §2 closing note
// and §8 step 4. Step 6 rewrites this as a dependency-injected builder
// that reads every dimension from proportions.js.

import * as THREE from "three";

export function buildAmogus() {
  const group = new THREE.Group();
  group.name = "amogus_mesh";

  const red = new THREE.MeshPhysicalMaterial({
    color: 0xd94a52,
    roughness: 0.62,
    metalness: 0.04,
    clearcoat: 0.28,
    clearcoatRoughness: 0.5,
  });
  const darkRed = new THREE.MeshStandardMaterial({
    color: 0x7a2228,
    roughness: 0.75,
    metalness: 0.05,
  });
  const visorGlass = new THREE.MeshPhysicalMaterial({
    color: 0x7ad5e0,
    roughness: 0.12,
    metalness: 0.1,
    transmission: 0.55,
    thickness: 0.4,
    ior: 1.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });
  const visorFrame = new THREE.MeshStandardMaterial({
    color: 0x2a3844,
    roughness: 0.6,
    metalness: 0.2,
  });

  // Torso — scaled sphere bean
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.26, 40, 32), red);
  torso.scale.set(1, 1.55, 1);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Dark band at base for grounding
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 16, 48), darkRed);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.22;
  rim.castShadow = true;
  group.add(rim);

  // Visor
  const visorGroup = new THREE.Group();
  visorGroup.position.set(0, 0.08, 0.205);

  const frameGeo = new THREE.BoxGeometry(0.28, 0.14, 0.06);
  frameGeo.translate(0, 0, -0.015);
  const frame = new THREE.Mesh(frameGeo, visorFrame);
  frame.castShadow = true;
  visorGroup.add(frame);

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    visorGlass,
  );
  glass.scale.set(0.12, 0.055, 0.05);
  glass.rotation.x = -Math.PI / 2;
  glass.position.set(0, 0, 0.01);
  visorGroup.add(glass);

  const highlight = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.85,
    }),
  );
  highlight.position.set(-0.06, 0.02, 0.035);
  highlight.rotation.z = -0.18;
  visorGroup.add(highlight);
  group.add(visorGroup);

  // Stub legs
  for (const sign of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.14), darkRed);
    leg.position.set(sign * 0.10, -0.29, -0.01);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }

  // Backpack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.11), red);
  pack.position.set(0, 0.03, -0.21);
  pack.castShadow = true;
  pack.receiveShadow = true;
  group.add(pack);

  // Antenna
  const antennaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12),
    visorFrame,
  );
  antennaBase.position.set(0.05, 0.16, -0.21);
  antennaBase.castShadow = true;
  group.add(antennaBase);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xffc860,
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.3,
    }),
  );
  antennaTip.position.set(0.05, 0.19, -0.21);
  group.add(antennaTip);

  return group;
}
