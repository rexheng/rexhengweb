// World Labs × Cesium — Spatial Intelligence Hackathon 2026.
// Sprite: a textured Earth with drifting clouds; double-click to spin it.

import { buildMesh, EARTH_RADIUS } from "./build.js";

// Idle turn rates (rad/s). Clouds drift a touch faster than the surface.
const IDLE_RATE = 0.22;
const CLOUD_RATE = 0.29;
const TAU = Math.PI * 2;

export default {
  id: "world-labs",
  label: "World Labs",
  title: "World Labs × Cesium — Spatial Intelligence Hackathon 2026",
  subtitle: "2026 · Photos into 3D worlds on a globe",
  meta: "CesiumJS · World Labs Marble · Gaussian splats",
  accent: "#77b6c8", // palette C · Atlantic
  // Panel mark: one filled path on the 48u grid; source docs/brand/marks/world-labs.svg
  icon: '<path d="M4 16H8V8H16V4H20V20H4ZM4 24H20V44H16V40H8V32H4ZM24 4A20 20 0 0 1 41.424 14.182A29 29 0 0 1 24 20ZM24 24A33 33 0 0 0 43.06 17.939A20 20 0 0 1 24 44Z"/>',
  description:
    "Turns geotagged photos into AI-generated 3D worlds and pins them where they were taken. A Python service reads GPS, altitude, time and compass bearing from each photo; a prompt builder computes the sun's position for that place and moment so World Labs' Marble generates a scene with matching light; the resulting Gaussian splat is converted, uploaded to Cesium ion and rendered on a CesiumJS 3D globe. Built at the Spatial Intelligence Hackathon in San Francisco (September 2026). Double-click the Earth to give it a spin.",
  links: [
    { label: "Source", href: "https://github.com/rexheng/world-labs-cesium-integration" },
  ],
  abilityLabel: "Spin!",
  ability: "spin",
  // Ball collider matching the visible Earth (the cloud shell sits 3 mm
  // proud of it), so the globe rolls when pushed, punted or thrown and its
  // surface rests exactly on the floor. The mesh is centred on the body.
  collider: { type: "sphere", radius: EARTH_RADIUS },
  buildMesh: () => buildMesh(),

  // Idle: slow west-to-east turn about the tilted axis, clouds drifting a
  // little faster. This is a local rotation of the visual meshes on top of
  // whatever the rolling body is doing; it never touches the physics.
  // The `spin` ability adds rig.spinBoost on top of the base rate.
  onSpawn(slot, ctx) {
    const rig = ctx.mesh?.userData?.worldLabs;
    if (!rig) return null;
    // Random starting longitude so repeat spawns don't all show one face.
    // Safe here: the hitbox was derived from the un-rotated sphere already.
    rig.angle = Math.random() * TAU;
    rig.cloudAngle = Math.random() * TAU;
    rig.apply();
    return {
      tick(dtMs) {
        const dt = dtMs / 1000;
        const boost = rig.spinBoost || 0;
        rig.angle = (rig.angle + (IDLE_RATE + boost) * dt) % TAU;
        rig.cloudAngle = (rig.cloudAngle + (CLOUD_RATE + boost) * dt) % TAU;
        rig.apply();
        return true;     // run forever (cancelled by _park)
      },
      cancel() {
        rig.spinHandle?.cancel();
        rig.spinBoost = 0;
      },
    };
  },
};
