// AERORIDGE — missions: the state machine that turns flying into a game.
// Ring Rush (rings + clock + fuel), Precision Landing (take off, circuit,
// grease it on the centreline), Free Flight (no pressure). Scoring, fuel
// burn and damage live here; the flight model only moves the plane.

import { FUEL, LANDING_SCORE, MISSIONS, PLANE } from './config.js';
import { headingDeg } from './flight.js';

export const PHASE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LANDED: 'landed',
  CRASHED: 'crashed',
  OUT_OF_FUEL: 'out-of-fuel',
  RESULTS: 'results',
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/** Fresh mission state for a mission id. */
export function createMission(missionId) {
  const def = MISSIONS[missionId] ?? MISSIONS.ringRush;
  return {
    def,
    phase: PHASE.TITLE,
    timeLeft: def.timeLimit,
    elapsed: 0,
    fuel: FUEL.capacity,
    score: 0,
    ringsPassed: 0,
    nextRing: 0,
    message: '',
    messageUntil: 0,
    landing: null, // filled in on touchdown: { descent, speed, offset, grade }
    tookOff: false,
  };
}

export function startMission(mission) {
  mission.phase = PHASE.PLAYING;
  mission.timeLeft = mission.def.timeLimit;
  mission.elapsed = 0;
  mission.fuel = FUEL.capacity;
  mission.score = 0;
  mission.ringsPassed = 0;
  mission.nextRing = 0;
  mission.landing = null;
  mission.tookOff = false;
  mission.message = mission.def.title;
  mission.messageUntil = 2.5;
}

export function flashMessage(mission, text, seconds = 2.5) {
  mission.message = text;
  mission.messageUntil = seconds;
}

/** Grade a touchdown. Returns { descent, speed, offset, grade, points }. */
export function gradeLanding(flight, runway) {
  const descent = Math.max(0, -flight.verticalSpeed);
  const speed = flight.speed;
  const h = headingDeg(flight);
  const aligned = Math.min(h, 360 - h) < 25 || Math.abs(h - 180) < 25;
  const offset = Math.abs(flight.position.x - runway.centerX);
  const descentScore = clamp01(1 - (descent - LANDING_SCORE.perfectDescent) /
    (LANDING_SCORE.hardDescent - LANDING_SCORE.perfectDescent));
  const speedScore = clamp01(1 - (speed - LANDING_SCORE.perfectSpeed) /
    (LANDING_SCORE.fastSpeed - LANDING_SCORE.perfectSpeed));
  const lineScore = clamp01(1 - (offset - LANDING_SCORE.centrelineFull) /
    (LANDING_SCORE.centrelineZero - LANDING_SCORE.centrelineFull));
  const total = (descentScore * 0.45 + speedScore * 0.3 + lineScore * 0.25) * (aligned ? 1 : 0.4);
  const grade = total > 0.85 ? 'PERFECT' : total > 0.6 ? 'GREAT' : total > 0.35 ? 'ROUGH' : 'HARD';
  return { descent, speed, offset, grade, points: Math.round(total * 500) };
}

/**
 * One fixed step of mission logic. `events` reports what happened this step:
 * { ringPassed, landed, crashed, ditched, outOfFuel, timeUp }.
 */
export function stepMission(mission, flight, dt, events) {
  const out = { ringPassed: false, landed: false, crashed: false, ditched: false, outOfFuel: false, timeUp: false };
  if (mission.phase !== PHASE.PLAYING) return out;
  mission.elapsed += dt;
  if (mission.messageUntil > 0) mission.messageUntil -= dt;

  // Fuel burns with throttle; empty tanks mean gliding only.
  const burn = FUEL.burnIdle + (FUEL.burnPerSecond - FUEL.burnIdle) * flight.throttle;
  mission.fuel = Math.max(0, mission.fuel - burn * dt);
  if (mission.fuel <= 0 && flight.throttle > 0) {
    flight.throttle = 0;
    out.outOfFuel = true;
    flashMessage(mission, 'FUEL EMPTY — GLIDING', 3);
  }
  if (mission.fuel < FUEL.lowWarning && mission.fuel > 0 && Math.floor(mission.elapsed * 2) % 2 === 0) {
    flashMessage(mission, 'LOW FUEL', 0.6);
  }

  if (mission.def.timeLimit > 0) {
    mission.timeLeft = Math.max(0, mission.def.timeLimit - mission.elapsed);
    if (mission.timeLeft <= 0) {
      out.timeUp = true;
      mission.phase = PHASE.RESULTS;
      flashMessage(mission, 'TIME UP', 3);
    }
  }

  if (!mission.tookOff && !flight.onGround) {
    mission.tookOff = true;
    flashMessage(mission, 'AIRBORNE — HAVE FUN UP THERE', 2.5);
  }

  if (events.ringPassed) {
    mission.ringsPassed += 1;
    mission.nextRing += 1;
    mission.score += mission.def.ringPoints;
    flashMessage(mission, `RING ${mission.ringsPassed} — +${mission.def.ringPoints}`, 2);
    out.ringPassed = true;
  }
  if (events.landed) {
    mission.landing = gradeLanding(flight, { centerX: 0 });
    mission.score += mission.landing.points + mission.def.landingBonus;
    mission.phase = PHASE.LANDED;
    out.landed = true;
    flashMessage(mission, `${mission.landing.grade} LANDING — +${mission.landing.points + mission.def.landingBonus}`, 4);
  }
  if (events.crashed) {
    mission.phase = PHASE.CRASHED;
    out.crashed = true;
  }
  if (events.ditched) {
    mission.phase = PHASE.CRASHED;
    out.ditched = true;
  }
  return out;
}

/** Time bonus for finishing Ring Rush early: seconds left × rate. */
export function finishRingRushBonus(mission) {
  if (mission.def.id !== 'ring-rush') return 0;
  return Math.round(mission.timeLeft * mission.def.timeBonusPerSecond);
}

/** Is the plane slow enough on the ground to count as "parked"? */
export function isParked(flight) {
  return flight.onGround && flight.speed < 2;
}

/** Stall margin for the HUD: 1 = comfortable, 0 = stalling. */
export function stallMargin(flight) {
  return clamp01((flight.speed - PLANE.stallSpeed * 0.6) / (PLANE.stallSpeed * 0.6));
}
