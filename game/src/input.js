// Keyboard and pointer input. Held keys give a move direction and the aim point; one-shot
// presses (start or restart, pause, dash, bomb, upgrade picks) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_BOMB = 8;
export const ACTION_RESTART = 16;
export const ACTION_MUTE = 32;

const MOVE = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const BOMB = new Set(['KeyQ', 'KeyE']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);
const PICK = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let pick = -1;
  let firing = false;
  let aimX = 0;
  let aimY = 0;
  let hasAim = false;

  function trackAim(event) {
    const rect = canvas.getBoundingClientRect();
    aimX = (event.clientX - rect.left) * (canvas.width / rect.width);
    aimY = (event.clientY - rect.top) * (canvas.height / rect.height);
    hasAim = true;
  }

  window.addEventListener('keydown', (event) => {
    if (MOVE[event.code]) {
      keys.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (BOMB.has(event.code)) {
      if (!event.repeat) actions |= ACTION_BOMB;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (event.code in PICK) {
      if (!event.repeat) pick = PICK[event.code];
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
  });
  canvas.addEventListener('pointermove', trackAim);
  canvas.addEventListener('pointerdown', (event) => {
    trackAim(event);
    // A click is also the confirm press: it starts the game, resumes it and
    // picks a draft card, as well as firing while held.
    actions |= ACTION_CONFIRM;
    if (event.button === 0) firing = true;
    else if (event.button === 2) actions |= ACTION_DASH;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Normalised move vector from the held keys. */
    moveVector() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const step = MOVE[code];
        if (step) {
          x += step[0];
          y += step[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    /** The aim point in logical canvas pixels (the mouse), or null before the mouse moves. */
    aim() {
      return hasAim ? { x: aimX, y: aimY } : null;
    },
    /** True while the fire button (or Space) is held. */
    firing() {
      return firing || keys.has('Space');
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The upgrade card picked by key (0, 1, 2) since the last call, or -1. */
    takePick() {
      const taken = pick;
      pick = -1;
      return taken;
    },
  };
}
