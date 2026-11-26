// AERORIDGE — the stunt plane, built from primitives in code.
// Sunset-orange livery, cream wings, dark tail, a spinning propeller and
// red/green/white navigation lights. No model files, no textures.

import * as THREE from 'three';
import { PALETTE } from './config.js';

/** Build the plane mesh. Forward is -z, up is +y, wings span x. */
export function createPlane() {
  const group = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: PALETTE.planeBody });
  const cream = new THREE.MeshLambertMaterial({ color: PALETTE.planeCream });
  const dark = new THREE.MeshLambertMaterial({ color: PALETTE.planeDark });
  const glass = new THREE.MeshPhongMaterial({
    color: 0x182430,
    shininess: 160,
    specular: 0xaaddff,
  });

  // Fuselage: a tapered cylinder lying along z, nose at -z.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.95, 5.6, 10), body);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  // Nose cone.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.4, 10), cream);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.5;
  group.add(nose);
  // Tail cone.
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.6, 10), body);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = 3.5;
  group.add(tail);

  // Main wings: one wide, thin box with a cream stripe on top.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.22, 1.9), cream);
  wing.position.set(0, -0.15, -0.3);
  group.add(wing);
  const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(9.42, 0.06, 0.5), body);
  wingStripe.position.set(0, -0.02, -0.9);
  group.add(wingStripe);
  // Wingtip lights: red port, green starboard.
  const tipGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const tipLeft = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  tipLeft.position.set(-4.7, -0.15, -0.3);
  group.add(tipLeft);
  const tipRight = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0x2aff5a }));
  tipRight.position.set(4.7, -0.15, -0.3);
  group.add(tipRight);

  // Tailplane and fin.
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 1.1), cream);
  tailplane.position.set(0, 0.25, 3.9);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 1.4), body);
  fin.position.set(0, 0.95, 3.9);
  group.add(fin);
  const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 1.0), cream);
  finTip.position.set(0, 1.75, 3.9);
  group.add(finTip);

  // Canopy: a dark glass bubble the pilot sits under.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1, 0.85, 1.9);
  canopy.position.set(0, 0.42, -0.9);
  group.add(canopy);

  // Propeller: hub + two blades, spun by the flight model.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), dark);
  hub.rotation.x = -Math.PI / 2;
  hub.position.z = -0.2;
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.34, 3.4, 0.1);
  const bladeMat = new THREE.MeshLambertMaterial({ color: PALETTE.planeDark });
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade1);
  prop.add(blade2);
  prop.position.z = -4.35;
  group.add(prop);

  // Fixed landing gear: two wheels and a tail wheel.
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    strut.position.set(side * 1.1, -1.0, -0.6);
    strut.rotation.z = side * 0.25;
    group.add(strut);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(side * 1.35, -1.5, -0.6);
    group.add(wheel);
  }

  // White tail light.
  const tailLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  tailLight.position.set(0, 0.2, 4.35);
  group.add(tailLight);

  group.userData.propeller = prop;
  return group;
}

/** Spin the propeller: faster with throttle, idling on the ground. */
export function spinPropeller(plane, throttle, dt) {
  const prop = plane.userData.propeller;
  if (!prop) return;
  prop.rotation.z += dt * (2 + throttle * 55);
}
