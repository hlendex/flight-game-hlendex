// AERORIDGE — the ring course: glowing hoops strung around the island.
// Fly through the amber ring; it turns green, a chime sounds, and the next
// ring lights up. A tall light pillar marks the next ring so the pilot
// always knows where to go.

import * as THREE from 'three';
import { PALETTE, RINGS } from './config.js';
import { createRandom } from './random.js';

/** Lay out the course: a loop around the island at varied heights. */
export function createRingCourse(seed) {
  const rng = createRandom(seed + 99);
  const rings = [];
  for (let i = 0; i < RINGS.count; i += 1) {
    const angle = (i / RINGS.count) * Math.PI * 2 + rng.range(-0.12, 0.12);
    const radius = rng.range(560, 860);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = rng.range(RINGS.minAltitude, RINGS.maxAltitude);
    rings.push({ x, y, z, passed: false, index: i });
  }
  return rings;
}

function ringMaterial(colour) {
  return new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.95 });
}

/** Build the ring meshes + the next-ring beacon pillar. */
export function createRingMeshes(course) {
  const group = new THREE.Group();
  const geo = new THREE.TorusGeometry(RINGS.radius, RINGS.tube, 12, 40);
  const meshes = course.map((ring) => {
    const mesh = new THREE.Mesh(geo, ringMaterial(PALETTE.ringLater));
    mesh.position.set(ring.x, ring.y, ring.z);
    // Face the ring toward the island centre so the pilot meets it head-on.
    mesh.lookAt(0, ring.y, 0);
    group.add(mesh);
    return mesh;
  });
  // Beacon: a translucent pillar above the next ring.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 260, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: PALETTE.ringNext,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  group.add(beacon);
  return { group, meshes, beacon };
}

export function paintRings(meshes, course, nextIndex) {
  course.forEach((ring, i) => {
    const mat = meshes[i].material;
    if (ring.passed) mat.color.setHex(PALETTE.ringDone);
    else if (i === nextIndex) mat.color.setHex(PALETTE.ringNext);
    else mat.color.setHex(PALETTE.ringLater);
  });
}

export function placeBeacon(beacon, ring) {
  if (!ring) {
    beacon.visible = false;
    return;
  }
  beacon.visible = true;
  beacon.position.set(ring.x, ring.y + 130, ring.z);
}

/** True when the plane just crossed this ring's hoop. */
export function crossedRing(planePos, prevPos, ring) {
  // Crossing test: the segment from prev to now passes the ring plane
  // within the hoop radius, on either side.
  const toRing = new THREE.Vector3(ring.x - planePos.x, ring.y - planePos.y, ring.z - planePos.z);
  const dist = toRing.length();
  if (dist > RINGS.radius * 1.6) return false;
  // Closest approach of the movement segment to the ring centre.
  const move = new THREE.Vector3().subVectors(planePos, prevPos);
  const lenSq = move.lengthSq();
  if (lenSq < 1e-6) return dist < RINGS.radius;
  const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(
    new THREE.Vector3(ring.x, ring.y, ring.z), prevPos,
  ).dot(move) / lenSq));
  const closest = new THREE.Vector3().copy(prevPos).addScaledVector(move, t);
  return closest.distanceTo(new THREE.Vector3(ring.x, ring.y, ring.z)) < RINGS.radius;
}

/** Distance from the plane to the next ring, in metres. */
export function distanceToRing(planePos, ring) {
  if (!ring) return 0;
  return Math.hypot(ring.x - planePos.x, ring.y - planePos.y, ring.z - planePos.z);
}
