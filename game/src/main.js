// AERORIDGE — boot and the one loop.
// Input is read every frame, the world advances in fixed 1/60 s steps, and
// the renderer paints what is there. Screens: title, playing, paused,
// results. `?shot=name&seed=N` stages a screenshot scene instead of the loop.

import * as THREE from 'three';
import { MISSIONS, RUNWAY, SPAWN, STEP } from './config.js';
import { createRandom } from './random.js';
import { createTerrain, heightAt } from './terrain.js';
import { createPlane, spinPropeller } from './plane.js';
import { createFlightState, forwardVector, headingDeg, posePlane, resetFlightState, stepFlight } from './flight.js';
import { createRingCourse, createRingMeshes, crossedRing, distanceToRing, paintRings, placeBeacon } from './rings.js';
import { createMission, finishRingRushBonus, flashMessage, PHASE, stallMargin, startMission, stepMission } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { ACTION, controlsSelfTest, createInput, drainActions, readFlightInput } from './input.js';
import { createCameraRig, snapCamera, toggleCameraMode, updateCamera } from './camera.js';
import { createRenderer, renderFrame } from './render.js';
import { paintShotTwice, stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const { renderer, scene } = createRenderer(canvas);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 8000);
const terrain = createTerrain(scene);
const plane = createPlane();
scene.add(plane);

const flight = createFlightState();
const course = createRingCourse(seed);
const ringArt = createRingMeshes(course);
scene.add(ringArt.group);
const mission = createMission('ring-rush');
const audio = createAudio();
const hud = createHud();
const input = createInput(canvas);
const rig = createCameraRig(camera);

const titleScreen = document.getElementById('screen-title');
const resultsScreen = document.getElementById('screen-results');
const pauseScreen = document.getElementById('screen-pause');
const cockpitFrame = document.getElementById('cockpit-frame');
let screen = 'title';
let resultsShownFor = '';
let selectedMission = 'ring-rush';

function showOnly(el) {
  for (const s of [titleScreen, resultsScreen, pauseScreen]) s.classList.toggle('hidden', s !== el);
  if (!el) {
    titleScreen.classList.add('hidden');
    resultsScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
  }
}

function bestKey() {
  return 'aeroridge.best';
}
function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(bestKey()) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(bestKey(), String(value));
  } catch {
    // Private windows: the best score lasts this visit only.
  }
}

function startSelectedMission() {
  audio.unlock();
  audio.click();
  resetFlightState(flight);
  mission.def = MISSIONS[selectedMission];
  const fresh = createMission(selectedMission);
  Object.assign(mission, fresh);
  startMission(mission);
  course.forEach((r) => { r.passed = false; });
  paintRings(ringArt.meshes, course, 0);
  showOnly(null);
  screen = 'playing';
  document.getElementById('best-score').textContent = `BEST ${readBest()}`;
}

function showResults(kind) {
  const title = document.getElementById('results-title');
  const lines = document.getElementById('results-lines');
  // The time bonus is real score: fold it into the mission score so the
  // results panel and the HUD agree with each other.
  const bonus = kind === 'landed' && mission.def.id === 'ring-rush' ? finishRingRushBonus(mission) : 0;
  mission.score += bonus;
  const score = mission.score;
  if (kind === 'landed') {
    title.textContent = `${mission.landing.grade} LANDING`;
  } else if (kind === 'crashed') {
    title.textContent = 'CRASHED';
  } else if (kind === 'ditched') {
    title.textContent = 'DITCHED IN THE SEA';
  } else {
    title.textContent = 'SORTIE COMPLETE';
  }
  const rows = [
    ['MISSION', mission.def.title],
    ['RINGS', `${mission.ringsPassed} / ${course.length}`],
    ['TIME', `${Math.round(mission.elapsed)}s`],
    ['FUEL LEFT', `${Math.round(mission.fuel)}%`],
  ];
  if (mission.landing) {
    rows.push(['TOUCHDOWN', `${mission.landing.descent.toFixed(1)} m/s down, ${Math.round(mission.landing.speed)} m/s, ${mission.landing.offset.toFixed(0)}m off centre`]);
    rows.push(['LANDING GRADE', mission.landing.grade]);
  }
  if (kind === 'landed' && mission.def.id === 'ring-rush') {
    rows.push(['TIME BONUS', `+${bonus}`]);
  }
  rows.push(['SCORE', String(score)]);
  lines.innerHTML = rows.map(([k, v]) => `<div class="res-row"><span>${k}</span><b>${v}</b></div>`).join('');
  if (score > readBest()) saveBest(score);
  document.getElementById('results-best').textContent = `BEST ${readBest()}`;
  showOnly(resultsScreen);
  screen = 'results';
  resultsShownFor = kind;
}

function applyHud() {
  const ground = heightAt(flight.position.x, flight.position.z);
  const next = mission.nextRing < course.length ? course[mission.nextRing] : null;
  hud.update({
    flight,
    speed: flight.speed,
    altitude: Math.max(0, flight.position.y - ground),
    pitchDeg: flight.pitch * 180 / Math.PI,
    rollDeg: flight.roll * 180 / Math.PI,
    throttle: flight.throttle,
    fuel: mission.fuel,
    ringsPassed: mission.ringsPassed,
    ringsTotal: course.length,
    timeLeft: mission.def.timeLimit > 0 ? mission.timeLeft : null,
    score: mission.score,
    nextRingDist: screen === 'playing' && next ? distanceToRing(flight.position, next) : null,
    stallMargin: stallMargin(flight),
    flying: !flight.onGround,
    banner: mission.messageUntil > 0 ? mission.message : '',
    missionTitle: mission.def.title,
  });
}

function renderOnce() {
  posePlane(plane, flight);
  paintRings(ringArt.meshes, course, mission.nextRing);
  // The beacon marks the next ring only while actually flying; on the
  // title screen it would read as a stray line in the sky.
  const next = screen === 'playing' && mission.nextRing < course.length ? course[mission.nextRing] : null;
  placeBeacon(ringArt.beacon, next);
  if (rig.mode === 'nose') cockpitFrame.classList.remove('hidden');
  else cockpitFrame.classList.add('hidden');
  updateCamera(rig, flight, plane, 1 / 60);
  applyHud();
  renderFrame(renderer, scene, camera);
}

function stepWorld(dt) {
  const prevPos = flight.position.clone();
  const ground = heightAt(flight.position.x, flight.position.z);
  const inputState = readFlightInput(input);
  const outcome = stepFlight(flight, inputState, dt, ground);

  const events = { ringPassed: false, landed: false, crashed: false, ditched: false };
  if (!flight.onGround && mission.nextRing < course.length) {
    const ring = course[mission.nextRing];
    if (crossedRing(flight.position, prevPos, ring)) {
      ring.passed = true;
      events.ringPassed = true;
      audio.ring();
    }
  }
  if (outcome === 'landed') {
    events.landed = true;
    audio.touchdown();
  } else if (outcome === 'crashed') {
    events.crashed = true;
    audio.crash();
  } else if (outcome === 'ditched') {
    events.ditched = true;
    audio.crash();
  }
  const missionOut = stepMission(mission, flight, dt, events);
  if (missionOut.landed) showResults('landed');
  else if (missionOut.crashed) showResults('crashed');
  else if (missionOut.ditched) showResults('ditched');
  else if (missionOut.timeUp) showResults('timeup');

  spinPropeller(plane, flight.throttle, dt);
  audio.setEngine(flight.throttle, !flight.onGround);
  terrain.update(dt);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = now - (frame.last ?? now);
  frame.last = now;
  const dt = Math.min(dtMs / 1000, MAX_FRAME);

  for (const action of drainActions(input)) {
    audio.unlock();
    if (action === ACTION.CONFIRM && screen === 'title') startSelectedMission();
    else if (action === ACTION.CONFIRM && screen === 'results') startSelectedMission();
    else if (action === ACTION.PAUSE && (screen === 'playing' || screen === 'paused')) {
      screen = screen === 'playing' ? 'paused' : 'playing';
      showOnly(screen === 'paused' ? pauseScreen : null);
    } else if (action === ACTION.RESTART && screen !== 'title') {
      startSelectedMission();
    } else if (action === ACTION.CAMERA) {
      toggleCameraMode(rig);
      audio.click();
    } else if (action === ACTION.MUTE) {
      audio.setMuted(!audio.isMuted());
    }
  }

  if (screen === 'playing') {
    let acc = (frame.acc ?? 0) + dt;
    while (acc >= STEP) {
      stepWorld(STEP);
      acc -= STEP;
      if (screen !== 'playing') break;
    }
    frame.acc = acc;
  }

  renderOnce();
}

// Title screen wiring: mission cards + controls help.
document.querySelectorAll('.mission-card').forEach((card) => {
  card.addEventListener('click', () => {
    selectedMission = card.dataset.mission;
    document.querySelectorAll('.mission-card').forEach((c) => c.classList.toggle('picked', c === card));
    audio.unlock();
    audio.click();
  });
});
document.getElementById('btn-fly').addEventListener('click', startSelectedMission);
document.getElementById('btn-again').addEventListener('click', startSelectedMission);
document.getElementById('btn-change').addEventListener('click', () => {
  resetFlightState(flight);
  mission.def = MISSIONS[selectedMission];
  Object.assign(mission, createMission(selectedMission));
  course.forEach((r) => { r.passed = false; });
  showOnly(titleScreen);
  screen = 'title';
});
document.getElementById('best-score').textContent = `BEST ${readBest()}`;

// Test hooks: the controls skill asks for a self-test the page exposes.
window.__controlsTest = controlsSelfTest();
window.__game = { flight, mission, course, rig, seed };

// Screenshot staging mode: pose the scene, paint twice, signal readiness.
if (shotName) {
  const staged = stageShot(shotName, { flight, course, missions: mission, rig, plane });
  screen = staged === 'title' ? 'title' : staged === 'results' ? 'results' : 'playing';
  if (screen === 'title') showOnly(titleScreen);
  else if (screen === 'results') showResults(mission.landing ? 'landed' : 'timeup');
  else showOnly(null);
  snapCamera(rig, flight, plane);
  paintShotTwice(renderOnce);
} else {
  showOnly(titleScreen);
  screen = 'title';
  requestAnimationFrame(frame);
}
