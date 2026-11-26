// AERORIDGE flight-model test (Node, no rendering): steps the real
// flight.js / terrain.js / rings.js modules deterministically and asserts
// takeoff, turning, stall behaviour, landing and ring crossing.
// Run: node test/test-flight-model.mjs
import { createFlightState, headingDeg, stepFlight } from '../game/src/flight.js';
import { heightAt } from '../game/src/terrain.js';
import { crossedRing, createRingCourse } from '../game/src/rings.js';
import { RUNWAY } from '../game/src/config.js';

const failures = [];
function check(name, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures.push(name);
}

const STEP = 1 / 60;
function runSteps(state, input, seconds, groundFn) {
  let outcome = 'flying';
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    const ground = groundFn(state.position.x, state.position.z);
    outcome = stepFlight(state, input, STEP, ground);
    if (outcome === 'landed' || outcome === 'crashed' || outcome === 'ditched') break;
  }
  return outcome;
}

// 1. Takeoff: full throttle + pulled stick -> airborne, climbing.
{
  const s = createFlightState();
  const out = runSteps(s, { pitch: 1, roll: 0, throttleDelta: 1, mousePitch: 0, mouseRoll: 0 }, 10, heightAt);
  check('takeoff: airborne', !s.onGround, `onGround=${s.onGround} speed=${s.speed.toFixed(1)}`);
  check('takeoff: speed above stall', s.speed > 20, `speed=${s.speed.toFixed(1)}`);
  check('takeoff: climbing', s.position.y > RUNWAY.altitude + 15, `y=${s.position.y.toFixed(1)}`);
}

// 2. Banking turns the plane: full right roll for 3 s changes heading.
{
  const s = createFlightState();
  s.onGround = false;
  s.position.y = 120;
  s.speed = 40;
  const h0 = headingDeg(s);
  runSteps(s, { pitch: 0, roll: 1, throttleDelta: 0, mousePitch: 0, mouseRoll: 0 }, 3, heightAt);
  const turned = Math.abs(headingDeg(s) - h0);
  check('banking turns heading', turned > 15, `turned ${turned.toFixed(1)}°`);
}

// 3. Stall: slow flight drops the nose on its own.
{
  const s = createFlightState();
  s.onGround = false;
  s.position.y = 150;
  s.speed = 10;
  s.pitch = 0.2;
  const pitch0 = s.pitch;
  runSteps(s, { pitch: 0, roll: 0, throttleDelta: 0, mousePitch: 0, mouseRoll: 0 }, 2, heightAt);
  check('stall drops the nose', s.pitch < pitch0, `pitch ${pitch0.toFixed(2)} -> ${s.pitch.toFixed(2)}`);
}

// 4. Landing: gentle final approach onto the runway touches down clean.
{
  const s = createFlightState();
  s.onGround = false;
  s.position.set(0, RUNWAY.altitude + 12, RUNWAY.centerZ + 120);
  s.yaw = 0;
  s.speed = 24;
  s.throttle = 0.5;
  const out = runSteps(s, { pitch: -0.12, roll: 0, throttleDelta: 0, mousePitch: 0, mouseRoll: 0 }, 20, heightAt);
  check('landing: touches down as landed', out === 'landed', `outcome=${out}`);
  check('landing: on the runway', Math.abs(s.position.z - RUNWAY.centerZ) < RUNWAY.length / 2, `z=${s.position.z.toFixed(0)}`);
}

// 5. Crash: a steep dive into terrain ends in a crash, not a landing.
{
  const s = createFlightState();
  s.onGround = false;
  s.position.set(0, 150, 0);
  s.speed = 45;
  s.throttle = 0.8;
  const out = runSteps(s, { pitch: -1, roll: 0, throttleDelta: 0, mousePitch: 0, mouseRoll: 0 }, 10, heightAt);
  check('dive crashes', out === 'crashed', `outcome=${out}`);
}

// 6. Ring crossing: a segment through the hoop counts, a wide miss does not.
{
  const course = createRingCourse(1);
  const ring = course[0];
  const through = crossedRing(
    { x: ring.x, y: ring.y, z: ring.z - 5 },
    { x: ring.x, y: ring.y, z: ring.z + 5 },
    ring,
  );
  const miss = crossedRing(
    { x: ring.x + 40, y: ring.y, z: ring.z - 5 },
    { x: ring.x + 40, y: ring.y, z: ring.z + 5 },
    ring,
  );
  check('ring: through counts', through === true);
  check('ring: wide miss does not', miss === false);
}

console.log(failures.length ? `FAIL: ${failures.join(' | ')}` : 'ALL FLIGHT-MODEL CHECKS PASSED');
process.exit(failures.length ? 1 : 0);
