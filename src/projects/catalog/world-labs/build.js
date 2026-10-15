// World Labs — the Earth. A textured globe (colour + normal + ocean-mask
// maps from the three.js example planets set, NASA Blue Marble derived)
// with a drifting cloud shell, 23.4° axial tilt and a soft fresnel limb
// glow baked into the surface shader (no extra halo mesh, so the auto-
// derived hitbox stays honest). See REFS.md for asset sources.
//
// Textures load ONCE at module import — i.e. during boot, while MuJoCo
// is still spinning up — and every clone shares them. Materials are
// created per instance so HoverHighlight's emissive tint only lights the
// globe under the cursor. If a sprite is built before the textures land,
// the globe shows as plain ocean blue (never a white ball) and the maps
// attach the moment they finish loading.
//
// Tilt is baked into the GEOMETRY, and the idle spin is a quaternion
// about the tilted axis that is identity at build time. That keeps the
// spawn-time bbox equal to the sphere (rotating a mesh in the hierarchy
// would inflate Box3.setFromObject to the rotated cube's AABB and float
// the globe ~8 cm off the floor).

import * as THREE from "three";

export const EARTH_RADIUS = 0.25;          // 0.50 MJ-unit diameter
export const CLOUD_SCALE = 1.012;          // cloud shell just above the surface
export const AXIAL_TILT = THREE.MathUtils.degToRad(23.44);

// Tilted spin axis: +Y rotated about Z by the tilt (matches geometry.rotateZ).
const SPIN_AXIS = new THREE.Vector3(-Math.sin(AXIAL_TILT), Math.cos(AXIAL_TILT), 0);

const FALLBACK_OCEAN = 0x1d4f8a;

// ── Shared textures (module level, loaded once) ─────────────────────────
const loader = new THREE.TextureLoader();
const texURL = (name) =>
  new URL(`../../../../assets/textures/earth/${name}`, import.meta.url).href;

function loadTexture(name, colorSpace) {
  const entry = { tex: null, loaded: false, ready: null };
  entry.ready = new Promise((resolve) => {
    entry.tex = loader.load(
      texURL(name),
      () => { entry.loaded = true; resolve(entry.tex); },
      undefined,
      (err) => console.error(`[world-labs] texture ${name} failed to load`, err),
    );
  });
  entry.tex.colorSpace = colorSpace;
  entry.tex.anisotropy = 8;                // clamped to GPU max by three
  return entry;
}

const TEX = {
  color:  loadTexture("earth_atmos_2048.jpg", THREE.SRGBColorSpace),
  normal: loadTexture("earth_normal_2048.jpg", THREE.NoColorSpace),
  ocean:  loadTexture("earth_specular_2048.jpg", THREE.NoColorSpace),
  clouds: loadTexture("earth_clouds_1024.png", THREE.SRGBColorSpace),
};

function whenLoaded(entry, apply) {
  if (entry.loaded) apply(entry.tex);
  else entry.ready.then(apply);
}

// ── Surface shader patch ────────────────────────────────────────────────
// 1. The "specular" map is white over ocean, black over land. Standard
//    roughnessMap multiplies by the G channel, which would make oceans
//    rough; invert it so oceans pick up a sun glint and land stays matte.
// 2. Fresnel limb glow: a thin blue atmosphere rim added to emissive.
// Module-level function → identical onBeforeCompile.toString() for every
// instance, so all globes share one compiled program.
function patchEarthShader(shader) {
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <roughnessmap_fragment>",
      `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	float wlOcean = texture2D( roughnessMap, vRoughnessMapUv ).g;
	roughnessFactor *= mix( 1.0, 0.42, wlOcean );
#endif`,
    )
    .replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
#ifndef FLAT_SHADED
	{
		float wlRim = 1.0 - clamp( dot( normalize( vNormal ), normalize( vViewPosition ) ), 0.0, 1.0 );
		totalEmissiveRadiance += vec3( 0.30, 0.58, 1.0 ) * ( pow( wlRim, 3.0 ) * 0.6 );
	}
#endif`,
    );
}

function tiltedSphere(radius) {
  const geo = new THREE.SphereGeometry(radius, 64, 48);
  geo.rotateZ(AXIAL_TILT);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function buildMesh() {
  const group = new THREE.Group();
  group.name = "world_labs_mesh";

  // Earth surface.
  const earthMat = new THREE.MeshStandardMaterial({
    color: FALLBACK_OCEAN,
    roughness: 0.9,
    metalness: 0.0,
  });
  earthMat.onBeforeCompile = patchEarthShader;
  whenLoaded(TEX.color, (tex) => {
    earthMat.map = tex;
    earthMat.color.set(0xffffff);
    earthMat.needsUpdate = true;
  });
  whenLoaded(TEX.normal, (tex) => {
    earthMat.normalMap = tex;
    // Negative Y matches the three.js planet example's map convention.
    earthMat.normalScale.set(0.85, -0.85);
    earthMat.needsUpdate = true;
  });
  whenLoaded(TEX.ocean, (tex) => {
    earthMat.roughnessMap = tex;
    earthMat.needsUpdate = true;
  });

  const earth = new THREE.Mesh(tiltedSphere(EARTH_RADIUS), earthMat);
  earth.name = "world-labs-earth";
  earth.castShadow = true;
  earth.receiveShadow = true;
  group.add(earth);

  // Cloud shell. Hidden until its alpha texture arrives — an untextured
  // transparent sphere would read as a white ball.
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    roughness: 1.0,
    metalness: 0.0,
  });
  const clouds = new THREE.Mesh(tiltedSphere(EARTH_RADIUS * CLOUD_SCALE), cloudMat);
  clouds.name = "world-labs-clouds";
  clouds.castShadow = false;
  clouds.receiveShadow = false;
  clouds.visible = false;
  whenLoaded(TEX.clouds, (tex) => {
    cloudMat.map = tex;
    cloudMat.needsUpdate = true;
    clouds.visible = true;
  });
  group.add(clouds);

  // Rotation rig shared by the idle onSpawn tick and the `spin` ability.
  // Angles stay 0 until spawn so the spawn-time bbox is the bare sphere.
  const rig = {
    earth,
    clouds,
    angle: 0,
    cloudAngle: 0,
    spinBoost: 0,          // extra rad/s written by the spin ability
    spinHandle: null,      // active spin ability (so a re-trigger supersedes it)
    apply() {
      earth.quaternion.setFromAxisAngle(SPIN_AXIS, rig.angle);
      clouds.quaternion.setFromAxisAngle(SPIN_AXIS, rig.cloudAngle);
    },
  };
  group.userData.worldLabs = rig;

  return group;
}
