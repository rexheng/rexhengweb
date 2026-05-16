// THREE's Object3D.clone() shares geometries AND materials by reference:
// every clone of a cached model points at the same Material instances as
// the prototype and as each other. Anything that mutates a material on one
// instance (HoverHighlight writes .emissive / .emissiveIntensity) then
// bleeds across every sibling instance — hover one, all light up.
//
// decoupleMaterials walks a freshly-cloned tree and gives it its own
// materials. A source→clone Map preserves *intra-tree* sharing (two meshes
// that shared a material in the prototype still share one clone here) while
// breaking *cross-instance* sharing. Source materials are never touched.
//
// Duck-typed (no THREE import) so it runs under node:test: it needs only
// .traverse, .isMesh, .material, and material.clone().

export function decoupleMaterials(root) {
  if (!root || typeof root.traverse !== "function") return root;
  const seen = new Map(); // source material -> cloned material
  const dupe = (m) => {
    if (!m || typeof m.clone !== "function") return m;
    let c = seen.get(m);
    if (!c) {
      c = m.clone();
      seen.set(m, c);
    }
    return c;
  };
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material = Array.isArray(o.material)
      ? o.material.map(dupe)
      : dupe(o.material);
  });
  return root;
}
