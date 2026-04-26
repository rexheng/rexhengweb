// Oliver Wyman — official wordmark on a backing plate atop a pedestal.
// See spec §3.7. The wordmark is the official OW SVG (Wikimedia Commons,
// PD-textlogo) rasterised to a CanvasTexture at module load time so the
// build is synchronous and the cached texture is shared across all
// future spawns.

const SVG_URL = "./assets/models/oliver-wyman-logo.svg";

// Module-level promise: resolves to a HTMLImageElement once the SVG has
// loaded. buildMesh() awaits-not-needed because the texture renders the
// image lazily — the first frame may be plate-only, but the SVG paint
// lands within ~50ms of mount on a modern browser.
let _imgPromise = null;
function loadLogoImage() {
  if (!_imgPromise) {
    _imgPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = SVG_URL;
    });
  }
  return _imgPromise;
}

function buildWordmarkTexture(THREE, COLOURS) {
  // 4:1 aspect — matches the SVG's natural ratio (791 × 75 ≈ 10.5:1)
  // padded vertically to look right on a square-ish plate.
  const W = 1024, H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Plate-coloured background.
  ctx.fillStyle = COLOURS.plate;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  // Paint the SVG wordmark once it's loaded. The texture's `needsUpdate`
  // flag tells Three.js to re-upload to the GPU on the next frame.
  loadLogoImage()
    .then((img) => {
      // Fit the wordmark inside the canvas with horizontal padding.
      const pad = W * 0.06;
      const targetW = W - pad * 2;
      const ratio = img.naturalHeight / img.naturalWidth;
      const targetH = targetW * ratio;
      const x = pad;
      const y = (H - targetH) / 2;
      ctx.drawImage(img, x, y, targetW, targetH);
      tex.needsUpdate = true;
    })
    .catch((err) => {
      // Fallback: paint a sans-serif "Oliver Wyman" so the plate still
      // reads as the brand even if the SVG fetch failed.
      console.warn("[oliver-wyman] wordmark SVG failed, falling back to text", err);
      ctx.fillStyle = COLOURS.logo;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 110px 'Helvetica Neue', Helvetica, Arial, sans-serif";
      ctx.fillText("Oliver Wyman", W / 2, H / 2);
      tex.needsUpdate = true;
    });

  return tex;
}

export function buildMesh({ THREE, proportions }) {
  const { SIZES, COLOURS } = proportions;

  const plateMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.plate),
    roughness: 0.7, metalness: 0.05,
  });
  const wordmarkTex = buildWordmarkTexture(THREE, COLOURS);
  const plateFrontMat = new THREE.MeshStandardMaterial({
    map: wordmarkTex,
    roughness: 0.6, metalness: 0.05,
  });
  const pedMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(COLOURS.pedestal),
    roughness: 0.8, metalness: 0.1,
  });

  const group = new THREE.Group();
  group.name = "oliver_wyman_mesh";

  // Pedestal (base).
  const pedY = SIZES.pedestalBaseY + SIZES.pedestalH / 2;
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(SIZES.pedestalR, SIZES.pedestalR, SIZES.pedestalH, 40),
    pedMat,
  );
  ped.position.y = pedY;
  ped.castShadow = true; ped.receiveShadow = true;
  group.add(ped);

  // Backing plate. Three.js BoxGeometry material order is:
  //   [+x, -x, +y, -y, +z, -z]
  // The wordmark texture goes on the +Z (front) face; the rest are plain.
  const plateBaseY = SIZES.pedestalBaseY + SIZES.pedestalH;
  const plateCentreY = plateBaseY + SIZES.plateH / 2;
  const plateMaterials = [
    plateMat, plateMat,
    plateMat, plateMat,
    plateFrontMat, plateMat,
  ];
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(SIZES.plateW, SIZES.plateH, SIZES.plateD),
    plateMaterials,
  );
  plate.position.y = plateCentreY;
  plate.castShadow = true; plate.receiveShadow = true;
  group.add(plate);

  return group;
}
