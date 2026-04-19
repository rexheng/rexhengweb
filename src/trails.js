// Trajectory trails — fade-out path lines for every dynamic body in the scene.
// Uses a per-body ring buffer of world positions sampled each frame; renders as a
// THREE.Line with a vertex-color gradient (bright head, transparent tail).
import * as THREE from "three";

const MAX_POINTS = 240;     // ~4s at 60fps
const SAMPLE_DT_MS = 16;    // write one sample per ~16ms wallclock
const MIN_SEGMENT = 0.0015; // skip appending if body barely moved (avoid duplicate verts)
const _worldPos = /* one scratch vec */ new THREE.Vector3();

const PALETTE = [
  0x7ee8fa, 0xffc04d, 0xff6ec7, 0x9dff6e, 0xe07bff, 0xffa36e, 0x6effc9, 0xffd96e,
];

export class Trails {
  constructor(app) {
    this.app = app;
    this.group = new THREE.Group();
    this.group.name = "Trails";
    app.scene.add(this.group);
    this.lines = {}; // bodyID -> { line, positions(Float32Array), colors, head, count, color }
    this.lastSample = 0;
    this.enabled = false;
  }

  setEnabled(v) {
    this.enabled = v;
    this.group.visible = v;
    if (!v) this.clearAll();
  }

  clearAll() {
    for (const id of Object.keys(this.lines)) {
      const { line } = this.lines[id];
      this.group.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    this.lines = {};
  }

  ensureLine(bodyID) {
    if (this.lines[bodyID]) return this.lines[bodyID];
    const positions = new Float32Array(MAX_POINTS * 3);
    const colors = new Float32Array(MAX_POINTS * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.setDrawRange(0, 0);
    // AdditiveBlending + bright vertex colors fakes a "light trail" look even though
    // WebGL lines are stuck at 1px. Multiple overlapping segments on fast-moving bodies
    // accumulate to a glow that reads thicker than it actually is.
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false;
    this.group.add(line);
    const baseColor = new THREE.Color(PALETTE[bodyID % PALETTE.length]);
    const entry = { line, positions, colors, head: 0, count: 0, color: baseColor, lastPos: new THREE.Vector3(Infinity, Infinity, Infinity) };
    this.lines[bodyID] = entry;
    return entry;
  }

  update() {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastSample < SAMPLE_DT_MS) return;
    this.lastSample = now;

    const bodies = this.app.bodies;
    if (!bodies) return;

    // Sample every body that actually moves (skip root/world = 0)
    for (let b = 1; b < this.app.model.nbody; b++) {
      const group = bodies[b];
      if (!group) continue;
      group.updateWorldMatrix(true, false);
      _worldPos.setFromMatrixPosition(group.matrixWorld);
      const entry = this.ensureLine(b);
      if (entry.lastPos.distanceToSquared(_worldPos) < MIN_SEGMENT * MIN_SEGMENT && entry.count > 0) continue;
      entry.lastPos.copy(_worldPos);

      // Push new point into ring buffer (world-space)
      const idx = entry.head * 3;
      entry.positions[idx] = _worldPos.x;
      entry.positions[idx + 1] = _worldPos.y;
      entry.positions[idx + 2] = _worldPos.z;
      entry.head = (entry.head + 1) % MAX_POINTS;
      entry.count = Math.min(entry.count + 1, MAX_POINTS);

      // Rebuild a contiguous vertex stream (tail → head) and matching color gradient
      this.rebuild(entry);
    }
  }

  rebuild(entry) {
    const { line, positions, colors, head, count, color } = entry;
    const posAttr = line.geometry.attributes.position;
    const colAttr = line.geometry.attributes.color;
    const out = posAttr.array;
    const cout = colAttr.array;

    // Iterate oldest → newest. Oldest index = (head - count + MAX) % MAX.
    const start = (head - count + MAX_POINTS) % MAX_POINTS;
    for (let i = 0; i < count; i++) {
      const srcIdx = ((start + i) % MAX_POINTS) * 3;
      const dstIdx = i * 3;
      out[dstIdx] = positions[srcIdx];
      out[dstIdx + 1] = positions[srcIdx + 1];
      out[dstIdx + 2] = positions[srcIdx + 2];
      // Fade: oldest → dim, newest → bright. Boost head beyond 1.0 so additive
      // blending saturates toward white at the leading tip (hot-trail effect).
      const t = count === 1 ? 1 : i / (count - 1);
      const k = t * t;          // tail fades quadratically
      const boost = 1 + t * 1.2; // head hits ~2.2× color for additive glow
      cout[dstIdx] = color.r * k * boost;
      cout[dstIdx + 1] = color.g * k * boost;
      cout[dstIdx + 2] = color.b * k * boost;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    line.geometry.setDrawRange(0, count);
    line.geometry.computeBoundingSphere();
  }

  onSceneSwitch() {
    this.clearAll();
  }
}
