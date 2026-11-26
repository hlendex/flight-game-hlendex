// AERORIDGE — the island: seeded heightmap terrain, ocean, sky, runway,
// town, trees and drifting clouds. The same `heightAt` function that shapes
// the mesh answers the flight model, so the ground the plane sees is the
// ground the player sees.

import * as THREE from 'three';
import { PALETTE, RUNWAY, WORLD } from './config.js';
import { createRandom, fbm2 } from './random.js';

const SEED = 20261126;

/** The mountain peak and the lake basin, in world metres. */
const PEAK = { x: -480, z: -380, radius: 420 };
const LAKE = { x: 520, z: -520, radius: 190 };

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smooth01(a, b, v) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Raw island height before the runway plateau is pressed in. */
function rawHeight(x, z) {
  const r = Math.hypot(x, z);
  // Rolling interior: 16 m average with ±34 m of hills. The island must
  // read as land, not a beach pancake: the interior floor is lifted above
  // the waterline and only the rim sinks into the sea.
  let h = 16 + fbm2(x * 0.0016, z * 0.0016, SEED, 4) * 34;
  // One tall mountain in the north-west.
  const pd = Math.hypot(x - PEAK.x, z - PEAK.z) / PEAK.radius;
  h += Math.max(0, 1 - pd * pd) * WORLD.mountainHeight;
  // A lake basin in the east, deep enough to hold water.
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z) / LAKE.radius;
  h -= Math.max(0, 1 - ld * ld) * 20;
  // The rim sinks into the sea: full height inside, beach at the shore.
  const shore = smooth01(WORLD.islandRadius * 0.62, WORLD.islandRadius * 0.98, r);
  h = h * (1 - shore) + -2 * shore;
  // Interior valleys never drop to the waterline.
  const floorW = 1 - smooth01(WORLD.islandRadius * 0.45, WORLD.islandRadius * 0.7, r);
  h = Math.max(h, 5 * floorW + 0.4 * (1 - floorW));
  return h;
}

/** True ground height at (x, z), runway plateau included. */
export function heightAt(x, z) {
  let h = rawHeight(x, z);
  // Press the terrain flat under the runway strip (plus a soft margin).
  const dx = Math.abs(x - RUNWAY.centerX);
  const dz = Math.abs(z - RUNWAY.centerZ);
  const inStrip =
    smooth01(RUNWAY.width / 2 + 60, RUNWAY.width / 2 + 10, dx) *
    smooth01(RUNWAY.length / 2 + 90, RUNWAY.length / 2 + 10, dz);
  h = h * (1 - inStrip) + RUNWAY.altitude * inStrip;
  if (h < 0.4) h = 0.4;
  return h;
}

function colourForHeight(h, slope, x, z) {
  const c = new THREE.Color();
  // Sand hugs the waterline only; everything above it is grass with
  // patchy variation so the lowland reads as fields, not a beach.
  const patch = fbm2(x * 0.008, z * 0.008, SEED + 5, 3) * 0.5 + 0.5;
  if (h < 1.4) c.setHex(PALETTE.sand);
  else if (h < 55) {
    c.setHex(PALETTE.grass).lerp(new THREE.Color(PALETTE.grassDark), patch * 0.7);
    c.lerp(new THREE.Color(PALETTE.grassDark), clamp01((h - 20) / 40) * 0.4);
  } else if (h < 130) c.setHex(PALETTE.rock).lerp(new THREE.Color(PALETTE.grassDark), 0.35);
  else if (h < 200) c.setHex(PALETTE.rock);
  else c.setHex(PALETTE.snow);
  if (slope > 0.55) c.lerp(new THREE.Color(PALETTE.rock), 0.6);
  return c;
}

function buildTerrainMesh() {
  const segments = 170;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const slope = Math.abs(heightAt(x + 6, z) - h) / 6 + Math.abs(heightAt(x, z + 6) - h) / 6;
    const c = colourForHeight(h, slope, x, z);
    colours[i * 3] = c.r;
    colours[i * 3 + 1] = c.g;
    colours[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  return new THREE.Mesh(geo, mat);
}

function buildOcean() {
  const geo = new THREE.CircleGeometry(3400, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhongMaterial({
    color: PALETTE.sea,
    transparent: true,
    opacity: 0.92,
    shininess: 120,
    specular: 0x99ccff,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WORLD.seaLevel;
  return mesh;
}

function buildSky() {
  const geo = new THREE.SphereGeometry(3800, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      horizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      sunDir: { value: new THREE.Vector3(-0.55, 0.42, -0.72).normalize() },
      sunColour: { value: new THREE.Color(PALETTE.sun) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColour;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(horizon, top, pow(h, 0.62));
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColour * (pow(s, 220.0) * 0.9 + pow(s, 10.0) * 0.22);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function buildRunway() {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.width, 0.5, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: PALETTE.runway }),
  );
  strip.position.set(RUNWAY.centerX, RUNWAY.altitude + 0.1, RUNWAY.centerZ);
  group.add(strip);
  // Centreline dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.runwayMark });
  for (let d = -RUNWAY.length / 2 + 25; d < RUNWAY.length / 2 - 10; d += 40) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 18), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(RUNWAY.centerX, RUNWAY.altitude + 0.4, RUNWAY.centerZ + d);
    group.add(dash);
  }
  // Threshold bars at both ends.
  for (const end of [-1, 1]) {
    for (let i = -2; i <= 2; i += 1) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 12), dashMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(
        RUNWAY.centerX + i * 5.4,
        RUNWAY.altitude + 0.4,
        RUNWAY.centerZ + end * (RUNWAY.length / 2 - 12),
      );
      group.add(bar);
    }
  }
  // Edge lights: small amber dots that read as "instruments lit" from afar.
  const lightGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: PALETTE.ringNext });
  for (let d = -RUNWAY.length / 2 + 8; d <= RUNWAY.length / 2 - 8; d += 32) {
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(
        RUNWAY.centerX + side * (RUNWAY.width / 2 + 1.5),
        RUNWAY.altitude + 0.8,
        RUNWAY.centerZ + d,
      );
      group.add(light);
    }
  }
  return group;
}

function buildTrees(scene) {
  const rng = createRandom(SEED + 7);
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 5, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.trunk });
  const topGeo = new THREE.ConeGeometry(3.4, 11, 7);
  const topMat = new THREE.MeshLambertMaterial({ color: PALETTE.forest });
  const count = 320;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const tops = new THREE.InstancedMesh(topGeo, topMat, count);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let tries = 0;
  while (placed < count && tries < 4000) {
    tries += 1;
    const x = rng.range(-1000, 1000);
    const z = rng.range(-1000, 1000);
    const h = heightAt(x, z);
    if (h < 7 || h > 120) continue;
    if (Math.abs(x - RUNWAY.centerX) < RUNWAY.width / 2 + 40 &&
        Math.abs(z - RUNWAY.centerZ) < RUNWAY.length / 2 + 60) continue;
    if (Math.hypot(x - PEAK.x, z - PEAK.z) < 120) continue;
    const s = rng.range(0.8, 1.7);
    dummy.position.set(x, h + 2.2 * s, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = rng.range(0, Math.PI * 2);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = h + (2.2 + 5.5) * s;
    dummy.updateMatrix();
    tops.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  trunks.count = placed;
  tops.count = placed;
  scene.add(trunks);
  scene.add(tops);
}

function buildTown(scene) {
  const rng = createRandom(SEED + 21);
  const group = new THREE.Group();
  const roofColours = [0xd95f4b, 0xe8a33d, 0x4b7fa5, 0x7a9e5a];
  for (let i = 0; i < 26; i += 1) {
    const x = rng.range(-820, -560);
    const z = rng.range(480, 780);
    const h = heightAt(x, z);
    if (h < 2) continue;
    const w = rng.range(8, 16);
    const d = rng.range(8, 14);
    const tall = rng.range(6, 15);
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(w, tall, d),
      new THREE.MeshLambertMaterial({ color: 0xf3ead8 }),
    );
    house.position.set(x, h + tall / 2, z);
    house.rotation.y = rng.range(0, Math.PI);
    group.add(house);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.72, rng.range(3, 5.5), 4),
      new THREE.MeshLambertMaterial({ color: roofColours[i % roofColours.length] }),
    );
    roof.position.set(x, h + tall + 2, z);
    roof.rotation.y = Math.PI / 4 + house.rotation.y;
    group.add(roof);
  }
  scene.add(group);
}

function buildClouds(scene) {
  const rng = createRandom(SEED + 33);
  const clouds = [];
  // Unlit white: cloud undersides stay bright instead of going muddy green
  // under the hemisphere ground bounce.
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
  });
  for (let i = 0; i < 22; i += 1) {
    const cloud = new THREE.Group();
    const puffs = rng.int(3, 5);
    for (let p = 0; p < puffs; p += 1) {
      const r = rng.range(14, 30);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      puff.scale.y = 0.42;
      puff.position.set(rng.range(-26, 26), rng.range(-3, 3), rng.range(-12, 12));
      cloud.add(puff);
    }
    cloud.position.set(rng.range(-1200, 1200), rng.range(180, 320), rng.range(-1200, 1200));
    cloud.userData.drift = rng.range(1.5, 4);
    scene.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

/** Build the whole island into `scene`. Returns helpers for the game. */
export function createTerrain(scene) {
  scene.add(buildTerrainMesh());
  scene.add(buildOcean());
  scene.add(buildSky());
  scene.add(buildRunway());
  buildTrees(scene);
  buildTown(scene);
  const clouds = buildClouds(scene);

  // The lake: a still disc of water sitting in the eastern basin.
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(LAKE.radius * 0.92, 32),
    new THREE.MeshPhongMaterial({
      color: 0x2a7ba0,
      transparent: true,
      opacity: 0.95,
      shininess: 140,
      specular: 0xbbddff,
    }),
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(LAKE.x, 2.6, LAKE.z);
  scene.add(lake);

  return {
    heightAt,
    update(dt) {
      for (const cloud of clouds) {
        cloud.position.x += cloud.userData.drift * dt;
        if (cloud.position.x > 1350) cloud.position.x = -1350;
      }
    },
  };
}
