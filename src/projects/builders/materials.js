// Shared material factories.
//
// `forProject(THREE, opts)` is the per-project entry point. Each catalog
// entry passes its palette from `proportions.js` and gets back a named map
// of THREE materials. Builders never construct materials inline — all hex
// values live in proportions.js and flow through this factory.
//
// See docs/superpowers/specs/2026-04-24-project-sprite-workflow-design.md §3.

export function forProject(THREE, {
  body,
  shadow,
  visorGlass,
  visorFrame,
  packTrim,
  antennaTip,
  antennaTipEm,
  highlight,
  marble,
  marbleShadow,
} = {}) {
  const out = {};

  if (body !== undefined) {
    out.body = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(body),
      roughness: 0.58,
      metalness: 0.04,
      clearcoat: 0.22,
      clearcoatRoughness: 0.55,
    });
  }
  if (shadow !== undefined) {
    out.shadow = new THREE.MeshStandardMaterial({
      color: new THREE.Color(shadow),
      roughness: 0.8,
      metalness: 0.05,
    });
  }
  if (visorGlass !== undefined) {
    out.visorGlass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(visorGlass),
      roughness: 0.1,
      metalness: 0.15,
      transmission: 0.5,
      thickness: 0.35,
      ior: 1.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.2,
    });
  }
  if (visorFrame !== undefined) {
    out.visorFrame = new THREE.MeshStandardMaterial({
      color: new THREE.Color(visorFrame),
      roughness: 0.55,
      metalness: 0.2,
    });
  }
  if (packTrim !== undefined) {
    out.packTrim = new THREE.MeshStandardMaterial({
      color: new THREE.Color(packTrim),
      roughness: 0.75,
      metalness: 0.05,
    });
  }
  if (antennaTip !== undefined) {
    out.antennaTip = new THREE.MeshStandardMaterial({
      color: new THREE.Color(antennaTip),
      emissive: new THREE.Color(antennaTipEm ?? antennaTip),
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.3,
    });
  }
  if (highlight !== undefined) {
    out.highlight = new THREE.MeshStandardMaterial({
      color: new THREE.Color(highlight),
      roughness: 0.1,
      metalness: 0,
      emissive: new THREE.Color(highlight),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.85,
    });
  }
  if (marble !== undefined) {
    out.marble = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(marble),
      roughness: 0.85,
      metalness: 0.0,
      clearcoat: 0.0,
    });
  }
  if (marbleShadow !== undefined) {
    out.marbleShadow = new THREE.MeshStandardMaterial({
      color: new THREE.Color(marbleShadow),
      roughness: 0.9,
      metalness: 0.0,
    });
  }
  return out;
}
