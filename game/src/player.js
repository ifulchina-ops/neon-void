// The player ship: movement with acceleration and drag, a dash with invulnerability,
// aimed fire with spread and heat, and the stats upgrades modify.
import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  const state = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    hull: PLAYER.hull,
    maxHull: PLAYER.hull,
    shield: false,
    shieldUsed: false,
    fireTimer: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashCooldownScale: 1,
    dashAngle: 0,
    invulnerable: 0,
    magnet: PLAYER.magnet,
    bombs: PLAYER.bombs,
    // Weapon stats (upgrades write here).
    damage: PLAYER.bulletDamage,
    fireInterval: PLAYER.fireInterval,
    bulletSpeed: PLAYER.bulletSpeed,
    projectiles: 1,
    pierce: 0,
    spread: 0.09,
    speed: PLAYER.speed,
    thrusting: false,
    dead: false,
  };

  return {
    state,
    reset() {
      state.x = FIELD.width / 2;
      state.y = FIELD.height / 2;
      state.vx = 0;
      state.vy = 0;
      state.angle = -Math.PI / 2;
      state.hull = PLAYER.hull;
      state.maxHull = PLAYER.hull;
      state.shield = false;
      state.shieldUsed = false;
      state.fireTimer = 0;
      state.dashTime = 0;
      state.dashCooldown = 0;
      state.dashCooldownScale = 1;
      state.invulnerable = 0;
      state.magnet = PLAYER.magnet;
      state.bombs = PLAYER.bombs;
      state.damage = PLAYER.bulletDamage;
      state.fireInterval = PLAYER.fireInterval;
      state.bulletSpeed = PLAYER.bulletSpeed;
      state.projectiles = 1;
      state.pierce = 0;
      state.spread = 0.09;
      state.speed = PLAYER.speed;
      state.thrusting = false;
      state.dead = false;
    },
    /** Heal, capped at max hull. Returns the amount actually restored. */
    heal(amount) {
      const before = state.hull;
      state.hull = Math.min(state.maxHull, state.hull + amount);
      return state.hull - before;
    },
    /** Start a dash in the current move direction (or facing, when standing still). */
    dash(move) {
      if (state.dashCooldown > 0 || state.dashTime > 0) return false;
      const angle = move.x !== 0 || move.y !== 0 ? Math.atan2(move.y, move.x) : state.angle;
      state.dashAngle = angle;
      state.dashTime = PLAYER.dashTime;
      state.dashCooldown = PLAYER.dashCooldown * state.dashCooldownScale;
      state.invulnerable = Math.max(state.invulnerable, PLAYER.dashTime + 0.08);
      return true;
    },
    /**
     * Move, aim and fire for one step. Returns the bullets fired this step
     * (each {x, y, vx, vy}) so the world can track them.
     */
    update(step, move, aim, firing, random) {
      if (state.invulnerable > 0) state.invulnerable -= step;
      if (state.dashCooldown > 0) state.dashCooldown -= step;
      state.thrusting = move.x !== 0 || move.y !== 0;
      if (state.dashTime > 0) {
        state.dashTime -= step;
        state.vx = Math.cos(state.dashAngle) * PLAYER.dashSpeed;
        state.vy = Math.sin(state.dashAngle) * PLAYER.dashSpeed;
      } else {
        state.vx += move.x * PLAYER.accel * step;
        state.vy += move.y * PLAYER.accel * step;
        const damp = Math.max(0, 1 - PLAYER.friction * step);
        state.vx *= damp;
        state.vy *= damp;
        const speed = Math.hypot(state.vx, state.vy);
        if (speed > state.speed) {
          state.vx = (state.vx / speed) * state.speed;
          state.vy = (state.vy / speed) * state.speed;
        }
      }
      state.x = Math.max(state.radius, Math.min(FIELD.width - state.radius, state.x + state.vx * step));
      state.y = Math.max(state.radius, Math.min(FIELD.height - state.radius, state.y + state.vy * step));
      if (aim) state.angle = Math.atan2(aim.y - state.y, aim.x - state.x);

      const bullets = [];
      state.fireTimer -= step;
      if (firing && state.fireTimer <= 0) {
        state.fireTimer = state.fireInterval;
        const count = state.projectiles;
        for (let i = 0; i < count; i += 1) {
          const offset = (i - (count - 1) / 2) * state.spread * 2;
          const jitter = (random() - 0.5) * 0.03;
          const angle = state.angle + offset + jitter;
          bullets.push({
            x: state.x + Math.cos(state.angle) * (state.radius + 6),
            y: state.y + Math.sin(state.angle) * (state.radius + 6),
            vx: Math.cos(angle) * state.bulletSpeed,
            vy: Math.sin(angle) * state.bulletSpeed,
            damage: state.damage,
            pierce: state.pierce,
            radius: PLAYER.bulletRadius,
            life: 1.4,
          });
        }
      }
      return bullets;
    },
  };
}
