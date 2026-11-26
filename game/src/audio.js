// AERORIDGE — procedural sound: every cue is synthesised with WebAudio.
// No audio files are shipped, nothing is fetched, and the engine hum follows
// the throttle. Audio starts on the first user gesture (browser policy).

/** Create the sound engine. Call `unlock()` from a key/click handler. */
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Engine hum: two detuned saws through a low-pass filter.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 55.7;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    engineOsc2.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    engineOsc2.start();
    return ctx;
  }

  function beep(freq, dur, type = 'sine', vol = 0.16, when = 0) {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    setMuted(value) {
      muted = value;
      if (engineGain) engineGain.gain.value = 0;
    },
    isMuted() {
      return muted;
    },
    /** Engine hum follows the throttle: 0 = silent, 1 = full song. */
    setEngine(throttle, flying) {
      if (!ctx || muted || !engineGain) return;
      const target = flying ? 0.02 + throttle * 0.05 : throttle * 0.02;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + throttle * 70, ctx.currentTime, 0.1);
    },
    ring() {
      beep(880, 0.14, 'sine', 0.2);
      beep(1318, 0.22, 'sine', 0.18, 0.09);
    },
    click() {
      beep(660, 0.06, 'square', 0.08);
    },
    warning() {
      beep(220, 0.16, 'square', 0.1);
    },
    touchdown() {
      beep(90, 0.3, 'sine', 0.3);
      beep(140, 0.2, 'triangle', 0.2, 0.05);
    },
    crash() {
      beep(70, 0.6, 'sawtooth', 0.25);
      beep(48, 0.8, 'sawtooth', 0.22, 0.1);
    },
  };
}
