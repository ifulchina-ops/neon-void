// The foes: six kinds plus a boss, each with its own movement and attack. Enemies are
// pooled in fixed arrays (no allocation while playing) and spawn at the field's edges.
import { ENEMY, FIELD, ORB } from './config.js';
import { randomAngle, randomPick } from './random.js';

export const KIND_DRIFTER = 'drifter';
export const KIND_SPITTER = 'spitter';
export const KIND_SPLITTER = 'splitter';
export const KIND_MINI = 'mini';
export const KIND_DASHER = 'dasher';
export const KIND_BRUTE = 'brute';
export const KIND_BOSS = 'boss';

const MAX_ENEMIES = 40;
const MAX_ORBS = 160;

const KINDS = [KIND_DRIFTER, KIND_SPITTER, KIND_SPLITTER, KIND_DASHER, KIND_BRUTE];

function makeEnemy() {
  return {
    active: false, kind: KIND_DRIFTER, x: 0, y: 0, vx: 0, vy: 0,
    radius: 16, hull: 20, maxHull: 20, speed: 90, damage: 10, score: 50,
    color: '#ff5d73', shootTimer: 0, stateTimer: 0, state: 0, angle: 0,
    flash: 0, spawnScale: 0, spin: 0,
  };
}

function makeOrb() {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, radius: ORB.radius, damage: ORB.damage, life: 6 };
}

/** Which kinds a wave may field (later waves add kinds). */
export function kindsForWave(wave) {
  const kinds = [KIND_DRIFTER];
  if (wave >= 2) kinds.push(KIND_SPITTER);
  if (wave >= 3) kinds.push(KIND_SPLITTER);
  if (wave >= 4) kinds.push(KIND_DASHER);
  if (wave >= 5) kinds.push(KIND_BRUTE);
  return kinds;
}

export function createEnemies(random) {
  const list = [];
  for (let i = 0; i < MAX_ENEMIES; i += 1) list.push(makeEnemy());
  const orbs = [];
  for (let i = 0; i < MAX_ORBS; i += 1) orbs.push(makeOrb());

  function edgePoint() {
    const side = Math.floor(random() * 4);
    const margin = 40;
    if (side === 0) return { x: random() * FIELD.width, y: -margin };
    if (side === 1) return { x: random() * FIELD.width, y: FIELD.height + margin };
    if (side === 2) return { x: -margin, y: random() * FIELD.height };
    return { x: FIELD.width + margin, y: random() * FIELD.height };
  }

  function spawnOrb(x, y, angle, speed) {
    for (let i = 0; i < MAX_ORBS; i += 1) {
      const o = orbs[i];
      if (o.active) continue;
      o.active = true;
      o.x = x;
      o.y = y;
      o.vx = Math.cos(angle) * speed;
      o.vy = Math.sin(angle) * speed;
      o.life = 6;
      return;
    }
  }

  return {
    list,
    orbs,
    alive() {
      let count = 0;
      for (const e of list) if (e.active) count += 1;
      return count;
    },
    spawn(kind, wave, x = null, y = null) {
      for (let i = 0; i < MAX_ENEMIES; i += 1) {
        const e = list[i];
        if (e.active) continue;
        const tune = ENEMY[kind];
        const point = x === null ? edgePoint() : { x, y };
        const scale = 1 + (wave - 1) * 0.07;
        e.active = true;
        e.kind = kind;
        e.x = point.x;
        e.y = point.y;
        e.vx = 0;
        e.vy = 0;
        e.radius = tune.radius;
        e.maxHull = Math.round(tune.hull * scale);
        e.hull = e.maxHull;
        e.speed = tune.speed * (1 + (wave - 1) * 0.03);
        e.damage = tune.damage;
        e.score = tune.score;
        e.color = tune.color;
        e.shootTimer = 1 + random() * 1.5;
        e.stateTimer = 0;
        e.state = 0;
        e.angle = randomAngle(random);
        e.flash = 0;
        e.spawnScale = 0;
        e.spin = (random() - 0.5) * 2;
        return e;
      }
      return null;
    },
    /** A wave's roster: kinds shuffled, count growing with the wave. */
    spawnWave(wave) {
      const kinds = kindsForWave(wave);
      const count = 6 + wave * 3;
      const roster = [];
      for (let i = 0; i < count; i += 1) {
        roster.push(randomPick(random, kinds));
      }
      return roster;
    },
    spawnBoss(wave) {
      return this.spawn(KIND_BOSS, wave);
    },
    /** Splitter death: two minis burst out. */
    split(enemy, wave) {
      const a = this.spawn(KIND_MINI, wave, enemy.x - 14, enemy.y);
      const b = this.spawn(KIND_MINI, wave, enemy.x + 14, enemy.y);
      return [a, b];
    },
    fireOrb(x, y, angle, speed = ORB.speed) {
      spawnOrb(x, y, angle, speed);
    },
    update(step, player, onPlayerHit) {
      for (const e of list) {
        if (!e.active) continue;
        if (e.spawnScale < 1) e.spawnScale = Math.min(1, e.spawnScale + step * 3);
        if (e.flash > 0) e.flash -= step;
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        if (e.kind === KIND_DRIFTER || e.kind === KIND_MINI || e.kind === KIND_BRUTE) {
          e.vx += nx * e.speed * 2.4 * step;
          e.vy += ny * e.speed * 2.4 * step;
          const v = Math.hypot(e.vx, e.vy);
          const cap = e.speed * 1.35;
          if (v > cap) {
            e.vx = (e.vx / v) * cap;
            e.vy = (e.vy / v) * cap;
          }
        } else if (e.kind === KIND_SPITTER) {
          // Keep a mid-range orbit and spit orbs at the player.
          const want = 260;
          const radial = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
          e.vx += (nx * radial * e.speed + -ny * e.speed * 0.7) * step * 2;
          e.vy += (ny * radial * e.speed + nx * e.speed * 0.7) * step * 2;
          const v = Math.hypot(e.vx, e.vy);
          if (v > e.speed) {
            e.vx = (e.vx / v) * e.speed;
            e.vy = (e.vy / v) * e.speed;
          }
          e.shootTimer -= step;
          if (e.shootTimer <= 0 && dist < 560) {
            e.shootTimer = ENEMY.spitter.shootInterval * (0.85 + random() * 0.3);
            spawnOrb(e.x, e.y, Math.atan2(dy, dx), ENEMY.spitter.bulletSpeed);
          }
        } else if (e.kind === KIND_DASHER) {
          // State 0: stalk. State 1: telegraph (flash, hold). State 2: charge.
          e.stateTimer -= step;
          if (e.state === 0) {
            e.vx += nx * e.speed * 2 * step;
            e.vy += ny * e.speed * 2 * step;
            if (e.stateTimer <= 0 && dist < 340) {
              e.state = 1;
              e.stateTimer = ENEMY.dasher.chargeTime;
              e.angle = Math.atan2(dy, dx);
            }
          } else if (e.state === 1) {
            e.vx *= Math.max(0, 1 - 6 * step);
            e.vy *= Math.max(0, 1 - 6 * step);
            if (e.stateTimer <= 0) {
              e.state = 2;
              e.stateTimer = 0.55;
              e.vx = Math.cos(e.angle) * ENEMY.dasher.chargeSpeed;
              e.vy = Math.sin(e.angle) * ENEMY.dasher.chargeSpeed;
            }
          } else if (e.stateTimer <= 0) {
            e.state = 0;
            e.stateTimer = 1.2 + random();
          }
        } else if (e.kind === KIND_BOSS) {
          // Slow chase; every few seconds a radial orb burst.
          e.vx += nx * e.speed * 1.6 * step;
          e.vy += ny * e.speed * 1.6 * step;
          const v = Math.hypot(e.vx, e.vy);
          if (v > e.speed) {
            e.vx = (e.vx / v) * e.speed;
            e.vy = (e.vy / v) * e.speed;
          }
          e.shootTimer -= step;
          if (e.shootTimer <= 0) {
            e.shootTimer = 2.6;
            const base = randomAngle(random);
            const count = 10;
            for (let k = 0; k < count; k += 1) {
              spawnOrb(e.x, e.y, base + (k / count) * Math.PI * 2, ORB.speed * 0.85);
            }
          }
        }
        e.x += e.vx * step;
        e.y += e.vy * step;
        e.x = Math.max(-60, Math.min(FIELD.width + 60, e.x));
        e.y = Math.max(-60, Math.min(FIELD.height + 60, e.y));
        // Touching the player hurts (the world resolves it through onPlayerHit).
        if (dist < e.radius + player.radius && player.invulnerable <= 0 && player.dashTime <= 0) {
          onPlayerHit(e.damage, e.x, e.y);
        }
      }
      for (const o of orbs) {
        if (!o.active) continue;
        o.life -= step;
        o.x += o.vx * step;
        o.y += o.vy * step;
        if (o.life <= 0 || o.x < -20 || o.x > FIELD.width + 20 || o.y < -20 || o.y > FIELD.height + 20) {
          o.active = false;
          continue;
        }
        const dx = player.x - o.x;
        const dy = player.y - o.y;
        if (Math.hypot(dx, dy) < o.radius + player.radius && player.invulnerable <= 0 && player.dashTime <= 0) {
          o.active = false;
          onPlayerHit(o.damage, o.x, o.y);
        }
      }
    },
    clearOrbs() {
      for (const o of orbs) o.active = false;
    },
    reset() {
      for (const e of list) e.active = false;
      for (const o of orbs) o.active = false;
    },
  };
}
