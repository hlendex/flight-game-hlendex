// AERORIDGE — staged screenshot scenes.
// `?shot=start|play|cockpit|end&seed=N` poses one deterministic scene,
// paints it twice, and sets `window.__shotReady` for the screenshot tool.
// The live game never uses these paths.

import * as THREE from 'three';
import { RUNWAY, SPAWN } from './config.js';
import { forwardVector } from './flight.js';

/** Pose the world for a named shot. Returns the screen to show. */
export function stageShot(name, game) {
  const { flight, course, missions, rig, plane } = game;
  const DEG = Math.PI / 180;

  if (name === 'start') {
    // Parked on the runway at golden hour, island and mountain behind.
    // Fixed framing: from above-behind, looking almost level, so the plane
    // sits in the free band below the menu (clear of the cards, the FLY
    // button and the controls line), runway leading to the island.
    flight.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    flight.yaw = 0.35; // angled across the frame so the wing shows
    flight.pitch = 0;
    flight.roll = 0;
    flight.speed = 0;
    flight.throttle = 0.25;
    flight.onGround = true;
    rig.mode = 'chase';
    rig.fixed = {
      pos: new THREE.Vector3(0, 24, SPAWN.z + 40),
      look: new THREE.Vector3(0, 22, SPAWN.z - 80),
    };
    missions.phase = 'title';
    return 'title';
  }

  if (name === 'play') {
    // Mid-flight, banking toward the third ring, lake and town below.
    const ring = course[2];
    flight.position.set(ring.x + 90, ring.y + 26, ring.z + 150);
    const dx = ring.x - flight.position.x;
    const dz = ring.z - flight.position.z;
    flight.yaw = Math.atan2(-dx, -dz);
    flight.pitch = 4 * DEG;
    flight.roll = -24 * DEG;
    flight.speed = 46;
    flight.throttle = 0.8;
    flight.onGround = false;
    flight.verticalSpeed = 2;
    rig.mode = 'chase';
    missions.phase = 'playing';
    missions.ringsPassed = 2;
    missions.nextRing = 2;
    missions.score = 200;
    missions.fuel = 72;
    missions.timeLeft = 212;
    missions.elapsed = 88;
    course[0].passed = true;
    course[1].passed = true;
    return 'play';
  }

  if (name === 'cockpit') {
    // Final approach: nose camera, runway dead ahead, gear down.
    flight.position.set(6, RUNWAY.altitude + 42, RUNWAY.centerZ + 420);
    flight.yaw = 0;
    flight.pitch = -4 * DEG;
    flight.roll = 2 * DEG;
    flight.speed = 26;
    flight.throttle = 0.3;
    flight.onGround = false;
    flight.verticalSpeed = -3;
    rig.mode = 'nose';
    missions.phase = 'playing';
    missions.ringsPassed = 10;
    missions.nextRing = 10;
    missions.score = 1250;
    missions.fuel = 18;
    missions.timeLeft = 64;
    missions.elapsed = 236;
    course.forEach((r) => { r.passed = true; });
    return 'play';
  }

  // 'end': parked after a perfect landing, results on screen.
  // Fixed framing: the plane sits low in frame, below the results panel.
  flight.position.set(2, SPAWN.y, RUNWAY.centerZ - 40);
  flight.yaw = 0;
  flight.pitch = 0;
  flight.roll = 0;
  flight.speed = 0;
  flight.throttle = 0;
  flight.onGround = true;
  flight.landed = true;
  rig.mode = 'chase';
  rig.fixed = {
    pos: new THREE.Vector3(15, 6.5, RUNWAY.centerZ + 6),
    look: new THREE.Vector3(0, 5, RUNWAY.centerZ - 45),
  };
  missions.phase = 'results';
  missions.ringsPassed = 10;
  missions.nextRing = 10;
  missions.score = 1480;
  missions.fuel = 12;
  missions.timeLeft = 61;
  missions.elapsed = 239;
  missions.landing = { descent: 1.8, speed: 24, offset: 3.1, grade: 'PERFECT', points: 480 };
  course.forEach((r) => { r.passed = true; });
  return 'results';
}

/** Two paint passes, then signal the screenshot tool. */
export function paintShotTwice(renderOnce) {
  let painted = 0;
  function paint() {
    renderOnce();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** The forward vector helper, re-exported for the shot math above. */
export { forwardVector };
