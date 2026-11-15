// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, draft, paused and game over.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|upgrade|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { ACTION_BOMB, ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { createRenderer, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** The draft cards' geometry, shared with render.js for click hit-testing. */
const CARD = { width: 300, height: 220, gap: 36, y: 240 };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const particles = createParticles();
const audio = createAudio();
const world = createWorld(createRandom(seed), audio, particles);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { now: world.state.time, aim: null });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // One-shot presses wait here until a simulation step consumes them, so a dash
  // pressed on a frame that runs no step is not lost.
  let dashPending = false;
  let bombPending = false;

  // Audio needs a user gesture: unlock it on the first pointer or key press.
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.startRun();
    accumulator = 0;
    dashPending = false;
    bombPending = false;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1. WASD to move, mouse to aim, hold click to fire.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}. Press R to play again.`);
  }

  /** Which draft card, if any, sits under the aim point. */
  function cardAt(aim) {
    const draft = world.state.draft ?? [];
    if (!aim || draft.length === 0) return -1;
    const total = draft.length * CARD.width + (draft.length - 1) * CARD.gap;
    let x = (FIELD.width - total) / 2;
    for (let index = 0; index < draft.length; index += 1) {
      if (aim.x >= x && aim.x <= x + CARD.width && aim.y >= CARD.y && aim.y <= CARD.y + CARD.height) return index;
      x += CARD.width + CARD.gap;
    }
    return -1;
  }

  function pickCard(index) {
    if (index >= 0 && world.chooseUpgrade(index)) {
      screen = SCREEN_PLAY;
      announce(`Wave ${world.state.wave}. Upgrade chosen.`);
    }
  }

  /** The screen changes the one-shot presses cause; dash and bomb are left pending. */
  function handleActions(actions) {
    // Read the pick every frame so a 1/2/3 pressed during play never auto-picks later.
    const pick = input.takePick();
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_DASH) dashPending = true;
    if (actions & ACTION_BOMB) bombPending = true;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & (ACTION_CONFIRM | ACTION_RESTART)) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_DRAFT) {
      if (pick >= 0) pickCard(pick);
      else if (actions & ACTION_CONFIRM) pickCard(cardAt(input.aim()));
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.stepTitle(STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const dash = dashPending;
    const bomb = bombPending;
    dashPending = false;
    bombPending = false;
    const events = world.step(STEP, {
      move: input.moveVector(),
      aim: input.aim(),
      firing: input.firing(),
      dash,
      bomb,
    });
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_WAVE_CLEAR) {
      screen = SCREEN_DRAFT;
      announce(`Wave cleared. Choose an upgrade. Score ${world.state.score}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions(input.takeActions());
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, { now: now / 1000, aim: input.aim(), muted: audio.isMuted() });
  }

  // Leaving the tab pauses a running game rather than letting foes close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Neon Void. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
