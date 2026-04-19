// Contact visualization — draws a small pulsing orb at every active contact point,
// plus a normal arrow. Color/size scale with penetration depth (proxy for force).
// Z-up MuJoCo world → Y-up THREE swizzle: (x, y, z)_mj → (x, z, -y)_three.
import * as THREE from "three";

const MAX_CONTACTS = 64;

export class ContactViz {
  constructor(app) {
    this.app = app;
    this.enabled = false;

    // Instanced sphere for contact points
    const sphereGeo = new THREE.SphereGeometry(0.02, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95 });
    this.points = new THREE.InstancedMesh(sphereGeo, sphereMat, MAX_CONTACTS);
    this.points.count = 0;
    this.points.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CONTACTS * 3), 3);
    this.points.visible = false;
    this.points.frustumCulled = false;
    app.scene.add(this.points);

    // Instanced arrow for normals — use a cylinder stretched along +Y
    const arrowGeo = new THREE.CylinderGeometry(0.004, 0.012, 1, 8);
    arrowGeo.translate(0, 0.5, 0); // base at origin, tip at +1y
    const arrowMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.9 });
    this.arrows = new THREE.InstancedMesh(arrowGeo, arrowMat, MAX_CONTACTS);
    this.arrows.count = 0;
    this.arrows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_CONTACTS * 3), 3);
    this.arrows.visible = false;
    this.arrows.frustumCulled = false;
    app.scene.add(this.arrows);

    this._scratch = {
      mat: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      scale: new THREE.Vector3(1, 1, 1),
      up: new THREE.Vector3(0, 1, 0),
      normal: new THREE.Vector3(),
      color: new THREE.Color(),
    };
  }

  setEnabled(v) {
    this.enabled = v;
    this.points.visible = v;
    this.arrows.visible = v;
    if (!v) {
      this.points.count = 0;
      this.arrows.count = 0;
    }
  }

  update() {
    if (!this.enabled || !this.app.data) return;
    const d = this.app.data;
    const n = Math.min(d.ncon, MAX_CONTACTS);
    const { mat, pos, q, scale, up, normal, color } = this._scratch;

    for (let i = 0; i < n; i++) {
      const c = d.contact.get(i);
      // MuJoCo contact pos is in world z-up → swizzle to three y-up
      const mx = c.pos[0], my = c.pos[1], mz = c.pos[2];
      pos.set(mx, mz, -my);

      // Penetration depth: dist is negative (overlap); |dist| grows with impact. Small offset baseline.
      const depth = Math.max(0, -c.dist);
      const t = Math.min(1, depth * 200); // 5mm penetration saturates red
      // Color: blue (light touch) → yellow → red (hard impact)
      if (t < 0.5) color.setHSL(0.58 - t * 0.25, 0.85, 0.55);
      else color.setHSL(0.17 - (t - 0.5) * 0.34, 0.95, 0.55);

      // Point matrix — scale 1 + depth factor
      const s = 1.0 + t * 1.8;
      scale.set(s, s, s);
      mat.compose(pos, q.identity(), scale);
      this.points.setMatrixAt(i, mat);
      this.points.instanceColor.setXYZ(i, color.r, color.g, color.b);

      // Arrow — align +Y to the contact normal (frame[0..2] in MJ z-up).
      // frame matrix in MuJoCo is row-major 3x3; first row is the normal direction.
      const nxMJ = c.frame[0], nyMJ = c.frame[1], nzMJ = c.frame[2];
      normal.set(nxMJ, nzMJ, -nyMJ).normalize();
      q.setFromUnitVectors(up, normal);
      const alen = 0.18 + t * 0.28;
      scale.set(1, alen, 1);
      mat.compose(pos, q, scale);
      this.arrows.setMatrixAt(i, mat);
      this.arrows.instanceColor.setXYZ(i, color.r, color.g, color.b);
    }
    this.points.count = n;
    this.arrows.count = n;
    this.points.instanceMatrix.needsUpdate = true;
    this.arrows.instanceMatrix.needsUpdate = true;
    this.points.instanceColor.needsUpdate = true;
    this.arrows.instanceColor.needsUpdate = true;
  }
}
