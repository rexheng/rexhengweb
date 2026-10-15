// Mechanica — the toolbox ring.
//
// Six parts, cycled by the `morph` ability in this order:
//   Wheel → Engine → Axle → Gear → Piston → Spanner → (back to Wheel)
//
// Wheel, Axle and Spanner come from one baked GLB (see REFS.md); Engine,
// Gear and Piston are procedural. Every part is re-skinned onto the shared
// PALETTE below so the set reads as one family: brushed steel, dark cast
// metal, rubber, and a machined-orange accent.
//
// Frame: Three y-up, part bottom at y=0, xz-centred. The physics body is
// yawed so its local +x faces the camera at spawn, so each part shows its
// best face toward +x (wheel rim, engine side covers, gear face).

export const PALETTE = {
  steel:     { color: "#c3c9d2", metalness: 0.62, roughness: 0.30 },
  darkSteel: { color: "#545a64", metalness: 0.45, roughness: 0.52 },
  rubber:    { color: "#26272b", metalness: 0.00, roughness: 0.86 },
  accent:    { color: "#ef7f2d", metalness: 0.30, roughness: 0.38 },
};

// Ring order + display sizing. `size` is the part's largest bbox extent in
// MJ metres after normalisation; `yaw` is a display turn about +y so the
// camera gets a three-quarter view instead of a flat silhouette.
export const PARTS = [
  { id: "wheel",   name: "Wheel",   source: "glb",        size: 0.46, yaw: 0.55 },
  { id: "engine",  name: "Engine",  source: "procedural", size: 0.48, yaw: 0.45 },
  { id: "axle",    name: "Axle",    source: "glb",        size: 0.56, yaw: 0.25 },
  { id: "gear",    name: "Gear",    source: "procedural", size: 0.44, yaw: 0.50 },
  { id: "piston",  name: "Piston",  source: "procedural", size: 0.44, yaw: 0.45 },
  { id: "spanner", name: "Spanner", source: "glb",        size: 0.56, yaw: 0.35 },
];

// Envelope every part fits inside (half-extents, MJ frame). The hitbox is
// fixed at spawn and never resized during a morph, so the body never pops.
export const HITBOX = { hx: 0.21, hy: 0.27, hz: 0.21 };

export function makeMaterials(THREE) {
  const out = {};
  for (const [key, p] of Object.entries(PALETTE)) {
    out[key] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.color),
      metalness: p.metalness,
      roughness: p.roughness,
    });
    out[key].name = `mechanica_${key}`;
  }
  return out;
}

// Map a baked Kenney colour (material named k_<hex>) or the spanner's steel
// onto a palette role. Dark greys become rubber on the wheel and dark steel
// elsewhere; saturated warm colours become the accent; everything else steel.
export function roleForBakedMaterial(partId, mat) {
  const c = mat.color;
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
  const sat = max > 0 ? (max - min) / max : 0;
  if (sat > 0.45 && c.r >= c.g && c.r > c.b) return "accent";
  if (max < 0.08) return partId === "wheel" ? "rubber" : "darkSteel";
  if (partId === "axle" && max < 0.3) return "darkSteel";
  return "steel";
}

// ── Procedural geometry (built once, shared by every instance) ──────────
// Geometry is immutable after build, so caching it at module level avoids
// re-allocating GPU buffers on every spawn. Materials stay per-instance.

let GEOM = null;

function mesh(THREE, geom, mat) {
  const m = new THREE.Mesh(geom, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function roundedRectShape(THREE, w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Extrude a 2D shape (drawn in the part's z/y side plane, shape-x → part-z)
// so its thickness runs along part +x, centred on x=0.
function extrudeSide(THREE, shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 18,
  });
  g.translate(0, 0, -depth / 2);
  g.rotateY(Math.PI / 2);  // extrusion z → x; shape x → -z
  return g;
}

function gearShape(THREE, { teeth, rOuter, rRoot, rHole, holes }) {
  const s = new THREE.Shape();
  const pitch = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * pitch;
    const pts = [
      [a - pitch * 0.27, rRoot],
      [a - pitch * 0.14, rOuter],
      [a + pitch * 0.14, rOuter],
      [a + pitch * 0.27, rRoot],
      [a + pitch * 0.5, rRoot * 0.995],
    ];
    pts.forEach(([ang, r], k) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, rHole, 0, Math.PI * 2, true);
  s.holes.push(hole);
  for (let i = 0; i < holes.count; i++) {
    const a = (i / holes.count) * Math.PI * 2 + Math.PI / holes.count;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * holes.at, Math.sin(a) * holes.at, holes.r, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}

function conrodShape(THREE, { smallR, bigR, length, beamW }) {
  // Small eye centred at (0, length), big eye at (0, 0); tapered beam joins.
  const s = new THREE.Shape();
  const sw = smallR * 1.75, bw = bigR * 1.55;
  s.moveTo(-bw, 0);
  s.absarc(0, 0, bw, Math.PI, Math.PI * 2, false);
  s.lineTo(beamW * 0.75, length * 0.35);
  s.lineTo(beamW * 0.55, length - sw * 0.8);
  s.absarc(0, length, sw, -0.35, Math.PI + 0.35, false);
  s.lineTo(-beamW * 0.55, length - sw * 0.8);
  s.lineTo(-beamW * 0.75, length * 0.35);
  s.lineTo(-bw, 0);
  const small = new THREE.Path();
  small.absarc(0, length, smallR, 0, Math.PI * 2, true);
  const big = new THREE.Path();
  big.absarc(0, 0, bigR, 0, Math.PI * 2, true);
  s.holes.push(small, big);
  return s;
}

function buildGeometry(THREE) {
  const G = {};

  // Engine — air-cooled V-twin seen side-on. Crank axis along x.
  G.crankcase = extrudeSide(THREE, roundedRectShape(THREE, 0.40, 0.17, 0.07), 0.16, 0.014);
  G.coverBig = new THREE.CylinderGeometry(0.075, 0.08, 0.026, 32).rotateZ(Math.PI / 2);
  G.coverSmall = new THREE.CylinderGeometry(0.05, 0.054, 0.024, 28).rotateZ(Math.PI / 2);
  G.coverBolt = new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8).rotateZ(Math.PI / 2);
  G.barrel = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 24);
  G.fin = new THREE.CylinderGeometry(0.078, 0.078, 0.010, 28);
  G.head = extrudeSide(THREE, roundedRectShape(THREE, 0.13, 0.06, 0.02), 0.13, 0.008);
  G.rocker = new THREE.CapsuleGeometry(0.036, 0.06, 6, 16).rotateX(Math.PI / 2).rotateY(Math.PI / 2);
  G.plug = new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8);
  const exhaust = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0.33, -0.17),
    new THREE.Vector3(0.07, 0.27, -0.215),
    new THREE.Vector3(0.115, 0.13, -0.215),
    new THREE.Vector3(0.12, 0.035, -0.12),
    new THREE.Vector3(0.12, 0.03, 0.12),
    new THREE.Vector3(0.115, 0.05, 0.25),
  ]);
  G.exhaust = new THREE.TubeGeometry(exhaust, 48, 0.016, 10, false);
  G.sump = extrudeSide(THREE, roundedRectShape(THREE, 0.22, 0.05, 0.02), 0.13, 0.006);

  // Gear — 16-tooth spur gear on its edge, face toward +x.
  G.gear = extrudeSide(THREE, gearShape(THREE, {
    teeth: 16, rOuter: 0.22, rRoot: 0.19, rHole: 0.045,
    holes: { count: 5, at: 0.118, r: 0.034 },
  }), 0.05, 0.006);
  G.gearHub = new THREE.CylinderGeometry(0.068, 0.068, 0.085, 32, 1, true).rotateZ(Math.PI / 2);
  G.gearHubRing = new THREE.TorusGeometry(0.057, 0.012, 10, 32).rotateY(Math.PI / 2);
  G.gearKey = new THREE.BoxGeometry(0.09, 0.016, 0.016);
  // Keyed shaft stub through the bore: reads as "gear on its shaft" and
  // gives the centre something to hit, so a double-click there registers.
  G.gearShaft = new THREE.CylinderGeometry(0.04, 0.04, 0.13, 24).rotateZ(Math.PI / 2);

  // Piston — lathe-turned crown with ring grooves, gudgeon pin, con-rod.
  const R = 0.105, top = 0.42;
  const lathe = [
    [0.0, top], [R - 0.012, top], [R, top - 0.012],
    [R, top - 0.024], [R - 0.008, top - 0.024], [R - 0.008, top - 0.032], [R, top - 0.032],
    [R, top - 0.044], [R - 0.008, top - 0.044], [R - 0.008, top - 0.052], [R, top - 0.052],
    [R, top - 0.064], [R - 0.008, top - 0.064], [R - 0.008, top - 0.072], [R, top - 0.072],
    [R, top - 0.165], [R - 0.012, top - 0.172], [R - 0.016, top - 0.172], [R - 0.016, top - 0.06],
    [0.0, top - 0.06],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  G.piston = new THREE.LatheGeometry(lathe, 40);
  G.pistonRing = new THREE.TorusGeometry(R - 0.004, 0.0045, 6, 40).rotateX(Math.PI / 2);
  G.gudgeon = new THREE.CylinderGeometry(0.026, 0.026, 0.226, 20).rotateZ(Math.PI / 2);
  G.conrod = extrudeSide(THREE, conrodShape(THREE, {
    smallR: 0.026, bigR: 0.05, length: 0.27, beamW: 0.036,
  }), 0.032, 0.005);
  G.bigEndCap = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 28, 1, true).rotateZ(Math.PI / 2);
  G.bigEndBolt = new THREE.CylinderGeometry(0.009, 0.009, 0.06, 8).rotateZ(Math.PI / 2);

  return G;
}

function geometry(THREE) {
  if (!GEOM) GEOM = buildGeometry(THREE);
  return GEOM;
}

// ── Procedural part builders ────────────────────────────────────────────

export function buildEngine(THREE, M) {
  const G = geometry(THREE);
  const g = new THREE.Group();
  g.name = "mechanica_engine";

  const crank = mesh(THREE, G.crankcase, M.darkSteel);
  crank.position.set(0, 0.105, 0.0);
  g.add(crank);
  const sump = mesh(THREE, G.sump, M.darkSteel);
  sump.position.set(0, 0.025, 0.02);
  g.add(sump);

  // Side covers on the camera face (+x): clutch cover + stator cover.
  const big = mesh(THREE, G.coverBig, M.steel);
  big.position.set(0.093, 0.11, 0.085);
  g.add(big);
  const small = mesh(THREE, G.coverSmall, M.accent);
  small.position.set(0.092, 0.10, -0.10);
  g.add(small);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = mesh(THREE, G.coverBolt, M.darkSteel);
    b.position.set(0.108, 0.11 + Math.sin(a) * 0.062, 0.085 + Math.cos(a) * 0.062);
    g.add(b);
  }

  // Two finned cylinders in a 45° V (front leans to -z, rear to +z).
  for (const sign of [-1, 1]) {
    const cyl = new THREE.Group();
    cyl.position.set(0, 0.17, sign * 0.06);
    cyl.rotation.x = sign * 0.40;  // positive x-rotation tips +y toward +z
    g.add(cyl);
    const barrel = mesh(THREE, G.barrel, M.darkSteel);
    barrel.position.y = 0.075;
    cyl.add(barrel);
    for (let f = 0; f < 6; f++) {
      const fin = mesh(THREE, G.fin, M.steel);
      fin.position.y = 0.025 + f * 0.022;
      cyl.add(fin);
    }
    const head = mesh(THREE, G.head, M.steel);
    head.position.y = 0.175;
    cyl.add(head);
    const rocker = mesh(THREE, G.rocker, M.accent);
    rocker.position.y = 0.215;
    cyl.add(rocker);
    const plug = mesh(THREE, G.plug, M.steel);
    plug.position.set(0.07, 0.17, 0);
    plug.rotation.z = Math.PI / 2;
    cyl.add(plug);
  }

  const exhaust = mesh(THREE, G.exhaust, M.steel);
  g.add(exhaust);
  return g;
}

export function buildGear(THREE, M) {
  const G = geometry(THREE);
  const g = new THREE.Group();
  g.name = "mechanica_gear";
  const gear = mesh(THREE, G.gear, M.steel);
  g.add(gear);
  const hub = mesh(THREE, G.gearHub, M.darkSteel);
  g.add(hub);
  for (const sx of [-1, 1]) {
    const ring = mesh(THREE, G.gearHubRing, M.accent);
    ring.position.x = sx * 0.043;
    g.add(ring);
  }
  const shaft = mesh(THREE, G.gearShaft, M.darkSteel);
  g.add(shaft);
  const key = mesh(THREE, G.gearKey, M.darkSteel);
  key.position.y = 0.045;
  g.add(key);
  g.position.y = 0.226;  // stand on its teeth (rOuter + bevel)
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

export function buildPiston(THREE, M) {
  const G = geometry(THREE);
  const g = new THREE.Group();
  g.name = "mechanica_piston";
  const piston = mesh(THREE, G.piston, M.steel);
  g.add(piston);
  for (const y of [0.392, 0.372, 0.352]) {
    const ring = mesh(THREE, G.pistonRing, M.darkSteel);
    ring.position.y = y;
    g.add(ring);
  }
  const pin = mesh(THREE, G.gudgeon, M.steel);
  pin.position.y = 0.32;
  pin.rotation.y = Math.PI / 2;  // pin runs along z, perpendicular to the rod
  g.add(pin);
  // Con-rod hangs from the pin: small eye at y=0.32, big eye at y=0.05.
  const rod = mesh(THREE, G.conrod, M.accent);
  rod.position.y = 0.05;
  g.add(rod);
  const cap = mesh(THREE, G.bigEndCap, M.darkSteel);
  cap.position.y = 0.05;
  g.add(cap);
  for (const sz of [-1, 1]) {
    const bolt = mesh(THREE, G.bigEndBolt, M.steel);
    bolt.position.set(0, 0.012, sz * 0.068);
    g.add(bolt);
  }
  return g;
}
