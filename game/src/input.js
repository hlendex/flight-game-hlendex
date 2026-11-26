// AERORIDGE — keyboard + mouse input.
// A = roll left, D = roll right (never inverted: the plane banks the way
// the key points). Arrows pitch and roll. W/S throttle. Mouse drag steers.
// Every key the game uses is listed in the title screen's help panel.

export const ACTION = {
  CONFIRM: 'confirm',
  PAUSE: 'pause',
  RESTART: 'restart',
  CAMERA: 'camera',
  MUTE: 'mute',
};

/** Fresh input state: held keys, mouse drag offsets, one-shot actions. */
export function createInput(canvas) {
  const state = {
    keys: new Set(),
    mousePitch: 0,
    mouseRoll: 0,
    actions: [],
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  function codeOf(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    state.keys.add(codeOf(e));
    if (e.code === 'Enter' || e.code === 'Space') state.actions.push(ACTION.CONFIRM);
    if (e.code === 'KeyP' || e.code === 'Escape') state.actions.push(ACTION.PAUSE);
    if (e.code === 'KeyR') state.actions.push(ACTION.RESTART);
    if (e.code === 'KeyC') state.actions.push(ACTION.CAMERA);
    if (e.code === 'KeyM') state.actions.push(ACTION.MUTE);
  });
  window.addEventListener('keyup', (e) => {
    state.keys.delete(codeOf(e));
  });
  window.addEventListener('blur', () => {
    state.keys.clear();
    state.dragging = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.mouseRoll = Math.max(-1, Math.min(1, state.mouseRoll + dx * 0.004));
    state.mousePitch = Math.max(-1, Math.min(1, state.mousePitch - dy * 0.004));
  });
  function endDrag() {
    state.dragging = false;
    state.mouseRoll *= 0.4;
    state.mousePitch *= 0.4;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  return state;
}

/** Read the held keys into flight inputs for one step. */
export function readFlightInput(input) {
  const k = input.keys;
  const roll = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  const pitch = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0);
  const throttleDelta = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
  // Mouse drag fades back to centre when the pilot lets go.
  input.mouseRoll *= 0.995;
  input.mousePitch *= 0.995;
  return { roll, pitch, throttleDelta, mouseRoll: input.mouseRoll, mousePitch: input.mousePitch };
}

/** Drain one-shot actions queued since the last frame. */
export function drainActions(input) {
  const out = input.actions;
  input.actions = [];
  return out;
}

/** Self-test hook for the controls skill: A must bank left, D right. */
export function controlsSelfTest() {
  const fake = { keys: new Set(['KeyA']), mouseRoll: 0, mousePitch: 0 };
  const left = readFlightInput(fake);
  fake.keys = new Set(['KeyD']);
  const right = readFlightInput(fake);
  return { aRollsLeft: left.roll === -1, dRollsRight: right.roll === 1 };
}
