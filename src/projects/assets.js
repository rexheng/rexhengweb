// Catalog-driven asset preload + cache.
// Lives at the module level (NOT on App) so catalog build.js files can
// import { modelCache } directly without threading `app` through the DI
// bag — keeps the zero-arg def.buildMesh() call site at system.js:123
// unchanged. See spec §3.11.

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

/** Module-level cache. Catalog build.js files import this directly. */
export const modelCache = {};

/**
 * Preload a model (FBX or GLB/GLTF — detected by URL extension),
 * scale-normalise it, and recentre it so its bbox bottom sits at
 * local y=0 and its xz centre is at origin. The returned scene is
 * the canonical cached copy — callers should `.clone(true)` it
 * before adding to their slot group.
 *
 * @param {{ url: string, target: { axis: "x"|"y"|"z", value: number } }} cfg
 */
export async function preloadModel({ url, target }) {
  const lower = url.toLowerCase();
  let scene;
  if (lower.endsWith(".glb") || lower.endsWith(".gltf")) {
    const gltf = await gltfLoader.loadAsync(url);
    scene = gltf.scene;
  } else {
    scene = await fbxLoader.loadAsync(url);
  }

  // Helper: bbox over visible meshes only. FBX scenes routinely include
  // empty helpers, lights, and "PivotNode" transforms that Box3.setFromObject
  // happily folds into the bbox — yielding a recentre that puts the visible
  // geometry well below local y=0 (which is what was making Amogus's legs
  // sink below the floor). We only care about renderable mesh geometry.
  const meshBox = (root) => {
    const b = new THREE.Box3();
    let any = false;
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      o.updateMatrixWorld(true);
      const child = new THREE.Box3().setFromObject(o);
      if (Number.isFinite(child.min.x) && Number.isFinite(child.max.x)) {
        if (any) b.union(child); else { b.copy(child); any = true; }
      }
    });
    return any ? b : new THREE.Box3().setFromObject(root);  // fallback
  };

  // 1. Scale.
  scene.updateMatrixWorld(true);
  const box1 = meshBox(scene);
  const size1 = box1.getSize(new THREE.Vector3());
  const current = size1[target.axis];
  if (current > 0 && Number.isFinite(current)) {
    scene.scale.setScalar(target.value / current);
  }

  // 2. Recentre. After scale, recompute bbox in scaled-frame, then
  // shift `scene.position` so the bbox bottom lands at y=0 and the
  // bbox xz centre lands at origin. Single assignment — no two-step
  // math that's easy to misread.
  scene.position.set(0, 0, 0);
  scene.updateMatrixWorld(true);
  const box2 = meshBox(scene);
  const centre = box2.getCenter(new THREE.Vector3());
  scene.position.set(-centre.x, -box2.min.y, -centre.z);

  // 3. Shadow flags + material upgrade. FBXLoader emits MeshPhongMaterial
  // (sometimes Lambert) which renders nearly black under our ACES tone-
  // mapping + soft ambient lighting. Convert to MeshStandardMaterial,
  // preserving the diffuse colour, so the model reads cleanly.
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const upgraded = mats.map((m) => {
      if (!m) return m;
      // Already PBR — leave it (GLB models come in as MeshStandardMaterial).
      if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) return m;
      // Phong/Lambert/Basic → Standard. Preserve diffuse colour and map.
      // FBX MTL files often have very dark Kd values (e.g. 0.33 0 0 for
      // Amogus' red) that crush to black under ACES tonemap + exposure
      // 0.9. Auto-boost the diffuse so the brightest channel reads ~0.9
      // — preserves hue, lifts the mesh out of the shadow zone.
      const c = m.color ? m.color.clone() : new THREE.Color(0xffffff);
      const peak = Math.max(c.r, c.g, c.b);
      if (peak > 0 && peak < 0.85) {
        const boost = 0.85 / peak;
        c.r = Math.min(1, c.r * boost);
        c.g = Math.min(1, c.g * boost);
        c.b = Math.min(1, c.b * boost);
      }
      const next = new THREE.MeshStandardMaterial({
        color: c,
        map: m.map || null,
        roughness: 0.55,
        metalness: 0.0,
        // Small emissive floor so the model reads even in low-light
        // areas of the scene.
        emissive: c.clone().multiplyScalar(0.08),
        transparent: !!m.transparent,
        opacity: m.opacity ?? 1,
        side: m.side ?? THREE.FrontSide,
      });
      m.dispose?.();
      return next;
    });
    o.material = Array.isArray(o.material) ? upgraded : upgraded[0];
  });

  return scene;
}

// Backwards-compat alias — Task 1.1 originally exposed preloadFBX.
export const preloadFBX = preloadModel;

/**
 * Catalog-driven preload. Iterates the projects list, finds defs that
 * declare an `fbx` (sprite mesh) or `abilityFbx` (ability-only mesh)
 * field, and preloads each into modelCache. Despite the legacy field
 * names, the loader auto-detects FBX vs GLB/GLTF from the URL extension.
 *
 * Returns a Promise that resolves once all preloads settle. Per-asset
 * errors are caught and logged; missing assets do NOT reject the boot
 * promise — the caller's splash hides on settle, and `buildMesh`/
 * ability-fire fall back to an empty Group on cache miss.
 */
export async function preloadCatalogAssets(projects) {
  const tasks = [];
  for (const def of projects) {
    if (def.fbx) {
      tasks.push(
        preloadModel(def.fbx)
          .then((scene) => { modelCache[def.id] = scene; })
          .catch((err) => console.error(`[assets] ${def.id} preload failed`, err)),
      );
    }
    if (def.abilityFbx) {
      const { cacheKey, ...rest } = def.abilityFbx;
      tasks.push(
        preloadModel(rest)
          .then((scene) => { modelCache[cacheKey] = scene; })
          .catch((err) => console.error(`[assets] ${cacheKey} preload failed`, err)),
      );
    }
  }
  await Promise.allSettled(tasks);
}
