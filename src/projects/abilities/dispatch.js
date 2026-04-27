// Dispatch ability — ClearPath route dashes fade in from the sprite to the
// humanoid centroid. The route is parented to the scene (NOT slot.group) so it
// doesn't move with a tumbling sprite. On completion or cancellation, all
// scratch geometry + materials are disposed.

import * as THREE from "three";
import { findBody } from "./impulse.js";

const DURATION_MS = 3200;
const FADE_OUT_START_MS = 2450;
const INITIAL_REVEAL_MS = 140;
const DASH_FADE_IN_MS = 240;
const DASH_STAGGER_MS = 52;
const MAX_ROUTE_DASHES = 10;
const MIN_DASH_SPACING = 0.22;
const ROUTE_LIFT = 0.35;
const ROUTE_ALTITUDE = 0.08;
const ROUTE_ENDPOINT_LIFT = 0.65;
const DASH_RADIUS = 0.045;

const NHS_BLUE = new THREE.Color("#005eb8");
const NHS_LIGHT_BLUE = new THREE.Color("#41b6e6");
const _bodyPos = new THREE.Vector3();
const _originBox = new THREE.Box3();

const HUMANOID_BODY_NAMES = new Set([
  "torso", "head", "waist_lower", "pelvis",
  "thigh_right", "shin_right", "foot_right",
  "thigh_left", "shin_left", "foot_left",
  "upper_arm_right", "lower_arm_right", "hand_right",
  "upper_arm_left", "lower_arm_left", "hand_left",
]);

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(t) {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
}

function computeDashCount(routeLength) {
  return Math.max(2, Math.min(MAX_ROUTE_DASHES, Math.floor(routeLength / MIN_DASH_SPACING) + 1));
}

function readHumanoidCentroid(app, out) {
  const bodies = app.bodies;
  if (!bodies) return false;

  out.set(0, 0, 0);
  let count = 0;
  for (const key of Object.keys(bodies)) {
    const body = bodies[key];
    if (!HUMANOID_BODY_NAMES.has(body?.name)) continue;
    body.updateWorldMatrix(true, false);
    _bodyPos.setFromMatrixPosition(body.matrixWorld);
    out.add(_bodyPos);
    count++;
  }

  if (count > 0) {
    out.multiplyScalar(1 / count);
    return true;
  }

  const torso = findBody(app, "torso");
  if (!torso) return false;
  torso.updateWorldMatrix(true, false);
  out.setFromMatrixPosition(torso.matrixWorld);
  return true;
}

function readRouteOrigin(slot, mesh, out) {
  if (mesh) {
    mesh.updateWorldMatrix(true, true);
    _originBox.setFromObject(mesh);
    if (!_originBox.isEmpty()) {
      _originBox.getCenter(out);
      out.y += ROUTE_ENDPOINT_LIFT;
      return out;
    }
  }

  slot.group.updateWorldMatrix(true, false);
  out.setFromMatrixPosition(slot.group.matrixWorld);
  out.y += ROUTE_ENDPOINT_LIFT;
  return out;
}

// ClearPath routes are drawn as a visual routing layer above the real sprite
// and humanoid centroid so the map-like path stays legible over ragdoll poses.
function readRouteTarget(app, out) {
  if (!readHumanoidCentroid(app, out)) return false;
  out.y += ROUTE_ENDPOINT_LIFT;
  return true;
}

function sampleRoutePoint(start, target, t, out) {
  out.copy(start).lerp(target, t);
  out.y += ROUTE_ALTITUDE + Math.sin(Math.PI * t) * ROUTE_LIFT;
  return out;
}

export function dispatch({ app, slot, mesh }) {
  // Find the scene root by walking up from the slot group.
  let sceneRoot = slot.group;
  while (sceneRoot && !sceneRoot.isScene) sceneRoot = sceneRoot.parent;
  if (!sceneRoot) sceneRoot = app.scene;
  if (!sceneRoot) return { tick() { return false; } };

  const targetPos = new THREE.Vector3();
  if (!readRouteTarget(app, targetPos)) return { tick() { return false; } };

  const dashGeom = new THREE.SphereGeometry(DASH_RADIUS, 14, 8);
  const routeGroup = new THREE.Group();
  routeGroup.name = "clearpath_route";
  routeGroup.renderOrder = 4;
  sceneRoot.add(routeGroup);

  const dashes = [];
  for (let i = 0; i < MAX_ROUTE_DASHES; i++) {
    const k = MAX_ROUTE_DASHES === 1 ? 1 : i / (MAX_ROUTE_DASHES - 1);
    const mat = new THREE.MeshBasicMaterial({
      color: NHS_BLUE.clone().lerp(NHS_LIGHT_BLUE, 0.55 + k * 0.35),
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const dash = new THREE.Mesh(dashGeom, mat);
    dash.name = `clearpath_route_dash_${i}`;
    dash.castShadow = false;
    dash.receiveShadow = false;
    dash.frustumCulled = false;
    routeGroup.add(dash);
    dashes.push({ dash, mat });
  }

  const startPos = new THREE.Vector3();
  readRouteOrigin(slot, mesh, startPos);

  let elapsed = INITIAL_REVEAL_MS;
  let disposed = false;
  const point = new THREE.Vector3();

  function updateRoute() {
    if (!readRouteTarget(app, targetPos)) return false;

    const routeLength = startPos.distanceTo(targetPos);
    const dashCount = computeDashCount(routeLength);
    const fadeOut = elapsed <= FADE_OUT_START_MS
      ? 1
      : 1 - clamp01((elapsed - FADE_OUT_START_MS) / (DURATION_MS - FADE_OUT_START_MS));

    for (let i = 0; i < dashes.length; i++) {
      const { dash, mat } = dashes[i];
      if (i >= dashCount) {
        dash.visible = false;
        mat.opacity = 0;
        continue;
      }

      const routeT = (i + 0.5) / dashCount;
      const reveal = smoothstep((elapsed - i * DASH_STAGGER_MS) / DASH_FADE_IN_MS);
      const opacity = 0.95 * reveal * fadeOut;

      sampleRoutePoint(startPos, targetPos, routeT, point);

      dash.position.copy(point);
      dash.scale.setScalar(0.9 + reveal * 0.15);
      dash.visible = opacity > 0.01;
      mat.opacity = opacity;
    }
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (routeGroup.parent) routeGroup.parent.remove(routeGroup);
    dashGeom.dispose();
    for (const { mat } of dashes) mat.dispose();
  }

  if (!updateRoute()) dispose();

  return {
    tick(dtMs) {
      if (disposed) return false;
      elapsed += dtMs;

      if (!updateRoute()) {
        dispose();
        return false;
      }

      if (elapsed >= DURATION_MS) {
        dispose();
        return false;
      }
      return true;
    },
    cancel() { dispose(); },
  };
}
