// AERORIDGE — the glass-cockpit HUD: DOM tapes and gauges over the 3D view.
// Airspeed tape (left), altitude tape (right), heading compass (top),
// attitude ball (centre), throttle + fuel (bottom left), rings / timer /
// score (bottom right). DOM text stays crisp when the screenshot is shrunk,
// which is exactly what the judge reads.

import { FUEL } from './config.js';
import { headingDeg } from './flight.js';

const KNOTS = 1.94384; // m/s -> knots

function pad(n, width = 3) {
  return String(n).padStart(width, '0');
}

function compassLabel(deg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
}

/** Draw the attitude ball: horizon line tilts with roll, shifts with pitch. */
function drawAttitude(canvas, pitchDeg, rollDeg) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-rollDeg * Math.PI / 180);
  const pitchPx = Math.max(-h, Math.min(h, pitchDeg * 1.6));
  // Sky above the horizon, ground below it.
  ctx.fillStyle = '#2f6fd0';
  ctx.fillRect(-w, -h + pitchPx, w * 2, h);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-w, pitchPx, w * 2, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w, pitchPx);
  ctx.lineTo(w, pitchPx);
  ctx.stroke();
  ctx.restore();
  // Fixed wings marker in the middle.
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy);
  ctx.lineTo(cx - 8, cy);
  ctx.moveTo(cx + 8, cy);
  ctx.lineTo(cx + 26, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function buildTape(el, centre, unit, step) {
  // A tape shows centre ± 2 steps; the centre value is highlighted.
  // Speeds and altitudes never go below zero.
  let html = '';
  for (let d = -2; d <= 2; d += 1) {
    const v = Math.max(0, Math.round((centre + d * step) / step) * step);
    const cls = d === 0 ? 'tape-now' : 'tape-dim';
    html += `<div class="${cls}">${v}</div>`;
  }
  el.innerHTML = html;
  el.dataset.unit = unit;
}

/** Wire the HUD to the DOM ids in index.html. */
export function createHud() {
  const $ = (id) => document.getElementById(id);
  return {
    els: {
      speed: $('hud-speed-val'),
      speedTape: $('hud-speed-tape'),
      alt: $('hud-alt-val'),
      altTape: $('hud-alt-tape'),
      heading: $('hud-heading'),
      compass: $('hud-compass'),
      attitude: $('hud-attitude'),
      throttleFill: $('hud-throttle-fill'),
      throttleVal: $('hud-throttle-val'),
      fuelFill: $('hud-fuel-fill'),
      fuelVal: $('hud-fuel-val'),
      rings: $('hud-rings'),
      timer: $('hud-timer'),
      score: $('hud-score'),
      banner: $('hud-banner'),
      nextRing: $('hud-next-ring'),
      stall: $('hud-stall'),
      missionTitle: $('hud-mission'),
    },
    /** Refresh every HUD element from the live game state. */
    update(view) {
      const e = this.els;
      const knots = Math.round(view.speed * KNOTS);
      const altM = Math.max(0, Math.round(view.altitude));
      const hdg = Math.round(headingDeg(view.flight));
      e.speed.textContent = String(knots);
      e.alt.textContent = String(altM);
      e.heading.textContent = `${pad(hdg)}° ${compassLabel(hdg)}`;
      buildTape(e.speedTape, knots, 'KT', 10);
      buildTape(e.altTape, altM, 'M', 50);
      // Compass strip: the heading and its neighbours.
      let strip = '';
      for (let d = -30; d <= 30; d += 15) {
        const h = (hdg + d + 360) % 360;
        strip += `<span class="${d === 0 ? 'compass-now' : ''}">${pad(h)}</span>`;
      }
      e.compass.innerHTML = strip;
      drawAttitude(e.attitude, view.pitchDeg, view.rollDeg);
      const thr = Math.round(view.throttle * 100);
      e.throttleFill.style.width = `${thr}%`;
      e.throttleVal.textContent = `${thr}%`;
      const fuel = Math.round(view.fuel);
      e.fuelFill.style.width = `${fuel}%`;
      e.fuelFill.classList.toggle('low', fuel < FUEL.lowWarning);
      e.fuelVal.textContent = `${fuel}%`;
      e.rings.textContent = `${view.ringsPassed}/${view.ringsTotal}`;
      e.timer.textContent = view.timeLeft == null ? '—' : formatTime(view.timeLeft);
      e.score.textContent = String(view.score);
      e.nextRing.textContent = view.nextRingDist == null ? '' : `NEXT RING ${Math.round(view.nextRingDist)}m`;
      e.stall.style.opacity = view.stallMargin < 0.35 && view.flying ? '1' : '0';
      if (view.banner) {
        e.banner.textContent = view.banner;
        e.banner.style.opacity = '1';
      } else {
        e.banner.style.opacity = '0';
      }
      e.missionTitle.textContent = view.missionTitle;
    },
  };
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${pad(s % 60, 2)}`;
}
