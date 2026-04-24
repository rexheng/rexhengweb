// MuJoCo -> Three.js scene loader.
// Adapted from zalo/mujoco_wasm (Apache-2.0) with simplifications for our use.
import * as THREE from "three";

let _gridTex = null;
function gridTexture() {
  if (_gridTex) return _gridTex;
  // Texture repeat = 25 across the 100m floor plane. Each 512×512 canvas
  // tile therefore covers 4m of world; pixels per cm: 128. Grid lines:
  //   micro   every  12.8 px  (0.1m)   — barely visible, reads as texture
  //   fine    every  64   px  (0.5m)   — standard ruler
  //   bold    every 256   px  (2.0m)   — primary scale anchor
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  // base dark slate
  ctx.fillStyle = "#0e1320";
  ctx.fillRect(0, 0, 512, 512);
  // subtle noise
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // Sparse warm highlight cells — randomly picked 0.5m squares get a very
  // faint amber fill so the floor isn't monotone. ~6% density.
  const rng = () => Math.random();
  ctx.fillStyle = "rgba(210,150,80,0.035)";
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      if (rng() < 0.06) {
        ctx.fillRect(gx * 64, gy * 64, 64, 64);
      }
    }
  }

  // Micro-grid (0.1m) — very faint; just enough to give near-camera floor
  // some rendered texture instead of reading as flat slate.
  ctx.strokeStyle = "rgba(120,170,255,0.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 12.8) {
    ctx.beginPath(); ctx.moveTo(Math.round(x), 0); ctx.lineTo(Math.round(x), 512); ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 12.8) {
    ctx.beginPath(); ctx.moveTo(0, Math.round(y)); ctx.lineTo(512, Math.round(y)); ctx.stroke();
  }

  // Fine grid (0.5m)
  ctx.strokeStyle = "rgba(120,170,255,0.11)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  for (let y = 0; y <= 512; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }

  // Bold grid (2.0m) — primary scale anchor
  ctx.strokeStyle = "rgba(140,190,255,0.24)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 256) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  for (let y = 0; y <= 512; y += 256) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(25, 25);
  tex.anisotropy = 8;
  _gridTex = tex;
  return tex;
}

export function getPosition(buffer, index, target, swizzle = true) {
  if (swizzle) {
    return target.set(
      buffer[(index * 3) + 0],
      buffer[(index * 3) + 2],
      -buffer[(index * 3) + 1],
    );
  }
  return target.set(
    buffer[(index * 3) + 0],
    buffer[(index * 3) + 1],
    buffer[(index * 3) + 2],
  );
}

export function getQuaternion(buffer, index, target, swizzle = true) {
  if (swizzle) {
    return target.set(
      -buffer[(index * 4) + 1],
      -buffer[(index * 4) + 3],
      buffer[(index * 4) + 2],
      -buffer[(index * 4) + 0],
    );
  }
  return target.set(
    buffer[(index * 4) + 0],
    buffer[(index * 4) + 1],
    buffer[(index * 4) + 2],
    buffer[(index * 4) + 3],
  );
}

export async function loadSceneFromURL(mujoco, filename, parent) {
  if (parent.data != null) {
    parent.data.delete();
    parent.model = null;
    parent.data = null;
  }

  parent.model = mujoco.MjModel.loadFromXML("/working/" + filename);
  parent.data = new mujoco.MjData(parent.model);
  const model = parent.model;

  const textDecoder = new TextDecoder("utf-8");
  const names_array = new Uint8Array(model.names);

  const mujocoRoot = new THREE.Group();
  mujocoRoot.name = "MuJoCo Root";
  parent.scene.add(mujocoRoot);

  const bodies = {};
  const meshes = {};
  const lights = [];

  for (let g = 0; g < model.ngeom; g++) {
    if (!(model.geom_group[g] < 3)) continue;

    const b = model.geom_bodyid[g];
    const type = model.geom_type[g];
    const size = [
      model.geom_size[(g * 3) + 0],
      model.geom_size[(g * 3) + 1],
      model.geom_size[(g * 3) + 2],
    ];

    if (!(b in bodies)) {
      bodies[b] = new THREE.Group();
      const start_idx = model.name_bodyadr[b];
      let end_idx = start_idx;
      while (end_idx < names_array.length && names_array[end_idx] !== 0) end_idx++;
      bodies[b].name = textDecoder.decode(names_array.subarray(start_idx, end_idx));
      bodies[b].bodyID = b;
      bodies[b].has_custom_mesh = false;
    }

    let geometry = new THREE.SphereGeometry(size[0] * 0.5);
    if (type === mujoco.mjtGeom.mjGEOM_PLANE.value) {
      // handled below
    } else if (type === mujoco.mjtGeom.mjGEOM_SPHERE.value) {
      geometry = new THREE.SphereGeometry(size[0], 32, 32);
    } else if (type === mujoco.mjtGeom.mjGEOM_CAPSULE.value) {
      geometry = new THREE.CapsuleGeometry(size[0], size[1] * 2.0, 20, 20);
    } else if (type === mujoco.mjtGeom.mjGEOM_ELLIPSOID.value) {
      geometry = new THREE.SphereGeometry(1, 24, 24);
    } else if (type === mujoco.mjtGeom.mjGEOM_CYLINDER.value) {
      geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2.0, 24);
    } else if (type === mujoco.mjtGeom.mjGEOM_BOX.value) {
      geometry = new THREE.BoxGeometry(size[0] * 2.0, size[2] * 2.0, size[1] * 2.0);
    } else if (type === mujoco.mjtGeom.mjGEOM_MESH.value) {
      const meshID = model.geom_dataid[g];
      if (!(meshID in meshes)) {
        geometry = new THREE.BufferGeometry();
        const vertex_buffer = model.mesh_vert.subarray(
          model.mesh_vertadr[meshID] * 3,
          (model.mesh_vertadr[meshID] + model.mesh_vertnum[meshID]) * 3,
        );
        for (let v = 0; v < vertex_buffer.length; v += 3) {
          const tmp = vertex_buffer[v + 1];
          vertex_buffer[v + 1] = vertex_buffer[v + 2];
          vertex_buffer[v + 2] = -tmp;
        }
        const normal_buffer = model.mesh_normal.subarray(
          model.mesh_normaladr[meshID] * 3,
          (model.mesh_normaladr[meshID] + model.mesh_normalnum[meshID]) * 3,
        );
        for (let v = 0; v < normal_buffer.length; v += 3) {
          const tmp = normal_buffer[v + 1];
          normal_buffer[v + 1] = normal_buffer[v + 2];
          normal_buffer[v + 2] = -tmp;
        }
        const face_to_vertex_buffer = model.mesh_face.subarray(
          model.mesh_faceadr[meshID] * 3,
          (model.mesh_faceadr[meshID] + model.mesh_facenum[meshID]) * 3,
        );
        geometry.setAttribute("position", new THREE.BufferAttribute(vertex_buffer, 3));
        geometry.setAttribute("normal", new THREE.BufferAttribute(normal_buffer, 3));
        geometry.setIndex(Array.from(face_to_vertex_buffer));
        geometry.computeVertexNormals();
        meshes[meshID] = geometry;
      } else {
        geometry = meshes[meshID];
      }
      bodies[b].has_custom_mesh = true;
    }

    const color = [
      model.geom_rgba[(g * 4) + 0],
      model.geom_rgba[(g * 4) + 1],
      model.geom_rgba[(g * 4) + 2],
      model.geom_rgba[(g * 4) + 3],
    ];
    if (model.geom_matid[g] !== -1) {
      const matId = model.geom_matid[g];
      color[0] = model.mat_rgba[(matId * 4) + 0];
      color[1] = model.mat_rgba[(matId * 4) + 1];
      color[2] = model.mat_rgba[(matId * 4) + 2];
      color[3] = model.mat_rgba[(matId * 4) + 3];
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color[0], color[1], color[2]),
      transparent: color[3] < 1.0,
      opacity: color[3],
      roughness: 0.6,
      metalness: 0.05,
      clearcoat: 0.2,
    });

    let mesh;
    if (type === 0) {
      const planeMat = new THREE.MeshStandardMaterial({
        map: gridTexture(),
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.02,
      });
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), planeMat);
      mesh.rotateX(-Math.PI / 2);
    } else {
      mesh = new THREE.Mesh(geometry, material);
    }
    mesh.castShadow = g !== 0;
    mesh.receiveShadow = type !== 7;
    mesh.bodyID = b;
    bodies[b].add(mesh);
    getPosition(model.geom_pos, g, mesh.position);
    if (type !== 0) getQuaternion(model.geom_quat, g, mesh.quaternion);
    if (type === 4) mesh.scale.set(size[0], size[2], size[1]);
  }

  for (let b = 0; b < model.nbody; b++) {
    if (b === 0 || !bodies[0]) {
      mujocoRoot.add(bodies[b] ?? new THREE.Group());
    } else if (bodies[b]) {
      bodies[0].add(bodies[b]);
    } else {
      bodies[b] = new THREE.Group();
      bodies[b].bodyID = b;
      bodies[0].add(bodies[b]);
    }
  }

  parent.mujocoRoot = mujocoRoot;
  return [parent.model, parent.data, bodies, lights];
}
