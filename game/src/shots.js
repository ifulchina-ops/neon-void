// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by an autopilot
// (aim at the nearest foe, keep clear of them, dash out of trouble), so the frame is
// what a short game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_DRAFT, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 20;
const LIMIT_SECONDS = 240;

/** How many foes are alive in the world right now. */
function enemiesAlive(world) {
  let count = 0;
  for (const e of world.state.enemies) if (e.active) count += 1;
  return count;
}

/** Steer the ship: aim at the nearest foe, flee what gets too close, dash out of a trap. */
function autopilot(state, skill) {
  const p = state.player;
  let nearest = null;
  let nearestDist = Infinity;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const dist = Math.hypot(e.x - p.x, e.y - p.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = e;
    }
  }
  let nearestOrb = null;
  let orbDist = Infinity;
  for (const o of state.orbs) {
    if (!o.active) continue;
    const dist = Math.hypot(o.x - p.x, o.y - p.y);
    if (dist < orbDist) {
      orbDist = dist;
      nearestOrb = o;
    }
  }
  const aim = nearest ? { x: nearest.x, y: nearest.y } : { x: p.x, y: p.y - 100 };
  let mx = 0;
  let my = 0;
  if (skill > 0 && nearest) {
    // Flee a foe that closes in; otherwise strafe around it.
    if (nearestDist < 170) {
      mx = (p.x - nearest.x) / nearestDist;
      my = (p.y - nearest.y) / nearestDist;
    } else {
      const dx = nearest.x - p.x;
      const dy = nearest.y - p.y;
      const d = nearestDist || 1;
      mx = -dy / d;
      my = dx / d;
    }
    if (nearestOrb && orbDist < 120) {
      mx += (p.x - nearestOrb.x) / orbDist;
      my += (p.y - nearestOrb.y) / orbDist;
    }
    // Drift back toward the middle so the ship never hugs a wall.
    mx += (FIELD.width / 2 - p.x) / FIELD.width * 0.6;
    my += (FIELD.height / 2 - p.y) / FIELD.height * 0.6;
  }
  const length = Math.hypot(mx, my);
  const move = length > 0 ? { x: mx / length, y: my / length } : { x: 0, y: 0 };
  const dash = skill > 0 && ((nearest && nearestDist < 70) || (nearestOrb && orbDist < 55));
  // The unskilled pilot never fires: it stands and waits for the void, so the end
  // scene ends. The skilled pilot fires constantly.
  return { move, aim, firing: skill > 0, dash, bomb: false };
}

/**
 * Set `world` to the named scene (start, play, upgrade or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.stepTitle(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.startRun();
  if (name === 'play') {
    // Fight through to wave 3, auto-picking the first draft card each time, then
    // capture mid-fight when the field is busy: wave 3 fields spitters and
    // splitters as well as drifters, so the frame shows the game's variety.
    let wave3Time = 0;
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, 1));
      if (world.state.draft) world.chooseUpgrade(0);
      if (world.state.player.dead) break;
      if (world.state.wave >= 3) {
        wave3Time += STEP;
        // Let the wave close in first: foes need a few seconds to cross the field.
        if (wave3Time > 6 && enemiesAlive(world) >= 3) break;
        if (wave3Time > 12) break;
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'upgrade') {
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, 1));
      if (world.state.draft) break;
      if (world.state.player.dead) break;
    }
    return { screen: world.state.draft ? SCREEN_DRAFT : SCREEN_PLAY, best: world.state.score };
  }
  // The end scene plays badly on purpose: it stands still and never dashes, so the
  // void catches it, as it catches a hurried player.
  for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, 0)) & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
