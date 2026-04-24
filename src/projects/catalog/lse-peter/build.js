// LSE Peter — Peter avatar with an academic book-stack emblem.

export function buildMesh({ THREE, materials, primitives, proportions }) {
  const { SIZES, COLOURS, D } = proportions;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLOURS.body),
    roughness: 0.55,
    metalness: 0.06,
    clearcoat: 0.2,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.headSkin),
    roughness: 0.6,
    metalness: 0.02,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.accentTrim),
    roughness: 0.7,
    metalness: 0.05,
  });
  const bookMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.bookColour),
    roughness: 0.75,
  });
  const giltMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.bookGilt),
    emissive: new THREE.Color(COLOURS.bookGilt),
    emissiveIntensity: 0.15,
    roughness: 0.3,
    metalness: 0.6,
  });

  const emblemBuilder = (THREE_, { headTopY }) => {
    const g = new THREE_.Group();
    let y = headTopY + SIZES.bookLift;
    const books = [
      { w: SIZES.book1W, h: SIZES.book1H, d: SIZES.book1D },
      { w: SIZES.book2W, h: SIZES.book2H, d: SIZES.book2D },
      { w: SIZES.book3W, h: SIZES.book3H, d: SIZES.book3D },
    ];
    for (const b of books) {
      const mesh = new THREE_.Mesh(new THREE_.BoxGeometry(b.w, b.h, b.d), bookMat);
      mesh.position.y = y + b.h / 2;
      mesh.castShadow = true;
      g.add(mesh);
      // Gilt trim — thin plate on top edge.
      const trim = new THREE_.Mesh(
        new THREE_.BoxGeometry(b.w * 0.92, b.h * 0.15, b.d * 0.04),
        giltMat,
      );
      trim.position.set(0, y + b.h * 0.5, b.d / 2 - b.d * 0.02);
      g.add(trim);
      y += b.h + 0.01 * D;
    }
    return g;
  };

  return primitives.peterAvatar(THREE, {
    bodyMat,
    headMat,
    accentMat,
    emblemBuilder,
    D,
  });
}
