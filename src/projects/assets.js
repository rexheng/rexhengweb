// Catalog-driven asset preload + cache.
// Lives at the module level (NOT on App) so catalog build.js files can
// import { modelCache } directly without threading `app` through the DI
// bag — keeps the zero-arg def.buildMesh() call site at system.js:123
// unchanged. See spec §3.11.

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const loader = new FBXLoader();

/** Module-level cache. Catalog build.js files import this directly. */
export const modelCache = {};

/**
 * Preload an FBX, scale-normalise it, and recentre it so its bbox bottom
 * sits at local y=0 and its xz centre is at origin. The returned scene
 * is the canonical cached copy — callers should `.clone(true)` it before
 * adding to their slot group.
 *
 * @param {{ url: string, target: { axis: "x"|"y"|"z", value: number } }} cfg
 */
export async function preloadFBX({ url, target }) {
  const scene = await loader.loadAsync(url);

  // 1. Scale.
  scene.updateMatrixWorld(true);
  const box1 = new THREE.Box3().setFromObject(scene);
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
  const box2 = new THREE.Box3().setFromObject(scene);
  const centre = box2.getCenter(new THREE.Vector3());
  scene.position.set(-centre.x, -box2.min.y, -centre.z);

  // 3. Shadow flags.
  scene.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return scene;
}

/**
 * Catalog-driven preload. Iterates the projects list, finds defs that
 * declare an `fbx` (sprite mesh) or `abilityFbx` (ability-only mesh)
 * field, and preloads each into modelCache.
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
        preloadFBX(def.fbx)
          .then((scene) => { modelCache[def.id] = scene; })
          .catch((err) => console.error(`[assets] ${def.id} preload failed`, err)),
      );
    }
    if (def.abilityFbx) {
      const { cacheKey, ...rest } = def.abilityFbx;
      tasks.push(
        preloadFBX(rest)
          .then((scene) => { modelCache[cacheKey] = scene; })
          .catch((err) => console.error(`[assets] ${cacheKey} preload failed`, err)),
      );
    }
  }
  await Promise.allSettled(tasks);
}
