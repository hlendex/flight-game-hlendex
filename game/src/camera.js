// AERORIDGE — cameras: a chase camera that trails the plane and banks with
// it, and a nose camera for the cockpit feel. The chase camera never fights
// the pilot: it lags smoothly and always looks ahead of the nose.

import * as THREE from 'three';
import { forwardVector } from './flight.js';

export const CAMERA_MODE = {
  CHASE: 'chase',
  NOSE: 'nose',
};

/** Fresh camera state: smoothed position + look target. */
export function createCameraRig(camera) {
  return {
    camera,
    mode: CAMERA_MODE.CHASE,
    smoothedPos: new THREE.Vector3(0, 20, 460),
    smoothedLook: new THREE.Vector3(0, 6, 400),
    fov: 62,
  };
}

export function toggleCameraMode(rig) {
  rig.mode = rig.mode === CAMERA_MODE.CHASE ? CAMERA_MODE.NOSE : CAMERA_MODE.CHASE;
  return rig.mode;
}

/** One frame of camera work. `dt` is real frame time. */
export function updateCamera(rig, flight, plane, dt) {
  const cam = rig.camera;
  // Fixed framing (staged screenshots): hold exactly the posed shot.
  if (rig.fixed) {
    cam.position.copy(rig.fixed.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(rig.fixed.look);
    plane.visible = rig.fixed.showPlane !== false;
    return;
  }
  const forward = forwardVector(flight);
  const up = new THREE.Vector3(0, 1, 0);

  if (rig.mode === CAMERA_MODE.NOSE) {
    // Nose camera: sit just ahead of the canopy, look down the nose.
    const nosePos = flight.position.clone().addScaledVector(forward, 3.2);
    nosePos.y += 0.9;
    rig.smoothedPos.lerp(nosePos, 1 - Math.exp(-18 * dt));
    const look = flight.position.clone().addScaledVector(forward, 60);
    rig.smoothedLook.lerp(look, 1 - Math.exp(-18 * dt));
    cam.position.copy(rig.smoothedPos);
    cam.up.copy(up);
    cam.lookAt(rig.smoothedLook);
    setFov(rig, 68, dt);
    plane.visible = false; // the plane is behind the camera here
    return;
  }

  plane.visible = true;
  // Chase: behind and above the tail, sliding with the plane's bank.
  const back = forward.clone().multiplyScalar(-15);
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();
  const bankShift = right.clone().multiplyScalar(Math.sin(flight.roll) * -4);
  const target = flight.position.clone().add(back).add(bankShift);
  target.y += 4.6;
  const lag = 1 - Math.exp(-6 * dt);
  rig.smoothedPos.lerp(target, lag);
  const lookTarget = flight.position.clone().addScaledVector(forward, 26);
  lookTarget.y += 1;
  rig.smoothedLook.lerp(lookTarget, 1 - Math.exp(-9 * dt));
  cam.position.copy(rig.smoothedPos);
  // Roll the camera a touch with the plane so turns feel banked.
  const bankedUp = up.clone().applyAxisAngle(forward, flight.roll * 0.35);
  cam.up.copy(bankedUp);
  cam.lookAt(rig.smoothedLook);
  // The field of view stretches with speed: fast feels fast.
  setFov(rig, 60 + (flight.speed / 68) * 14, dt);
}

function setFov(rig, target, dt) {
  rig.fov += (target - rig.fov) * Math.min(1, dt * 4);
  if (Math.abs(rig.fov - rig.camera.fov) > 0.05) {
    rig.camera.fov = rig.fov;
    rig.camera.updateProjectionMatrix();
  }
}

/** Place the camera for a staged screenshot without any smoothing lag. */
export function snapCamera(rig, flight, plane) {
  updateCamera(rig, flight, plane, 1);
  rig.smoothedPos.copy(rig.camera.position);
}
