// AERORIDGE — the arcade flight model.
// Banking turns the plane (a banked wing pulls the nose around), climbing
// bleeds speed and diving builds it, and below stall speed the nose drops
// gently on its own instead of tumbling. Orientation is stored as yaw /
// pitch / roll in radians and rebuilt into a quaternion every step.

import * as THREE from 'three';
import { PLANE, RUNWAY, SPAWN } from './config.js';

const DEG = Math.PI / 180;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Fresh flight state: parked on the runway, engine idling. */
export function createFlightState() {
  return {
    position: new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z),
    yaw: SPAWN.headingDeg * DEG, // 0 = facing north (-z)
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    verticalSpeed: 0,
    onGround: true,
    crashed: false,
    landed: false,
    gearDown: true,
  };
}

export function resetFlightState(state) {
  const fresh = createFlightState();
  state.position.copy(fresh.position);
  state.yaw = fresh.yaw;
  state.pitch = fresh.pitch;
  state.roll = fresh.roll;
  state.speed = 0;
  state.throttle = 0;
  state.verticalSpeed = 0;
  state.onGround = true;
  state.crashed = false;
  state.landed = false;
  state.gearDown = true;
}

/** Unit forward vector from yaw/pitch. North is -z, east is +x. */
export function forwardVector(state) {
  return new THREE.Vector3(
    -Math.sin(state.yaw) * Math.cos(state.pitch),
    Math.sin(state.pitch),
    -Math.cos(state.yaw) * Math.cos(state.pitch),
  );
}

export function headingDeg(state) {
  let h = (-state.yaw / DEG) % 360;
  if (h < 0) h += 360;
  return h;
}

/**
 * One fixed step of flight.
 * `input` = { pitch: -1..1 (pull up positive), roll: -1..1 (right positive),
 *             throttleDelta: -1..1, mousePitch, mouseRoll }
 * `ground` = terrain height under the plane.
 * Returns 'flying' | 'landed' | 'crashed' | 'ditched'.
 */
export function stepFlight(state, input, dt, ground) {
  if (state.crashed) return 'crashed';

  // Throttle: W/S nudge it, it stays where the pilot leaves it.
  state.throttle = clamp(state.throttle + input.throttleDelta * dt * 0.7, 0, 1);

  const flying = !state.onGround;
  const targetRoll = clamp((input.roll + input.mouseRoll) * (PLANE.maxBankDeg * DEG), -PLANE.maxBankDeg * DEG, PLANE.maxBankDeg * DEG);
  const targetPitch = clamp((input.pitch + input.mousePitch) * (PLANE.maxPitchDeg * DEG), -PLANE.maxPitchDeg * DEG, PLANE.maxPitchDeg * DEG);

  // Ease the wings toward the commanded bank and pitch.
  const rollEase = 1 - Math.exp(-PLANE.rollRate * dt * 2.2);
  const pitchEase = 1 - Math.exp(-PLANE.pitchRate * dt * 2.2);
  state.roll += (targetRoll - state.roll) * rollEase;
  state.pitch += (targetPitch - state.pitch) * pitchEase;

  // Takeoff: enough speed and a pulled stick lifts the wheels off.
  if (state.onGround && state.speed > PLANE.stallSpeed + 4 && state.pitch > 4 * DEG) {
    state.onGround = false;
  }

  // Coordinated turn: banking pulls the nose around the turn.
  if (flying && state.speed > 2) {
    const turnRate = (9.81 * Math.tan(state.roll) / Math.max(state.speed, 6)) * PLANE.turnCoordination;
    state.yaw -= turnRate * dt;
  }

  // Speed: thrust minus drag, plus gravity along the flight path.
  // On the ground the flight path is level, so gravity does not fight the
  // takeoff roll even with the stick pulled back for rotation.
  const thrust = state.throttle * PLANE.accel;
  const drag = PLANE.drag * state.speed * state.speed * 0.12;
  const gravityAlongPath = state.onGround ? 0 : -PLANE.climbBleed * Math.sin(state.pitch);
  state.speed += (thrust - drag + gravityAlongPath) * dt;
  state.speed = clamp(state.speed, 0, PLANE.maxSpeed);

  // Soft stall: slow flight drops the nose and dulls the controls.
  if (flying && state.speed < PLANE.stallSpeed) {
    const depth = 1 - state.speed / PLANE.stallSpeed;
    state.pitch -= depth * 0.5 * dt;
    state.roll *= 1 - depth * 0.4 * dt;
  }

  // Move along the nose.
  const forward = forwardVector(state);
  const prevY = state.position.y;
  state.position.addScaledVector(forward, state.speed * dt);

  // On the ground the plane rolls straight and slows down. Pitch is NOT
  // zeroed here: the pilot holds the stick back to lift the nose, and the
  // takeoff check below reads that pitch to decide the wheels leave.
  if (state.onGround) {
    state.position.y = ground + PLANE.gearHeight;
    state.roll *= 0.9;
    state.speed = Math.max(0, state.speed - 6 * dt);
  }

  state.verticalSpeed = (state.position.y - prevY) / dt;

  // Ground contact.
  const floor = ground + PLANE.gearHeight;
  if (state.position.y <= floor) {
    state.position.y = floor;
    const overRunway =
      Math.abs(state.position.x - RUNWAY.centerX) < RUNWAY.width / 2 + 4 &&
      Math.abs(state.position.z - RUNWAY.centerZ) < RUNWAY.length / 2 + 4;
    const descent = -state.verticalSpeed;
    const h = headingDeg(state);
    // Aligned when the nose points along the runway either way (north or south).
    const aligned = Math.min(h, 360 - h) < 25 || Math.abs(h - 180) < 25;
    if (flying && overRunway && descent < PLANE.crashDescent && state.speed < PLANE.crashSpeed && aligned) {
      state.onGround = true;
      state.landed = true;
      state.pitch = 0;
      state.roll = 0;
      return 'landed';
    }
    if (flying) {
      if (ground < 1.2) return 'ditched'; // into the sea or the lake
      state.crashed = true;
      return 'crashed';
    }
  }
  return state.onGround ? 'flying' : 'flying';
}

/** Apply the flight state to the plane mesh. */
export function posePlane(plane, state) {
  plane.position.copy(state.position);
  plane.rotation.order = 'YXZ';
  plane.rotation.y = state.yaw;
  plane.rotation.x = -state.pitch;
  plane.rotation.z = -state.roll;
}
