// The run: waves of foes, the player's bullets, pickups, score and combo, the boss
// every fifth wave and the upgrade draft after each clear. The world owns the numbers;
// render.js owns how they look, main.js owns the screens.
import { COMBO, ENEMY, FIELD, PICKUP, STEP, WAVE } from './config.js';
import { createEnemies, KIND_BOSS, KIND_SPLITTER } from './enemies.js';
import { createPlayer } from './player.js';
import { drawDraft } from './upgrades.js';
import { randomPick } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_WAVE_CLEAR = 1;
export const EVENT_OVER = 2;
export const EVENT_BOSS = 4;

const MAX_BULLETS = 240;
const MAX_PICKUPS = 40;

function makeBullet() {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 0, pierce: 0, radius: 5, life: 0, hit: null };
}

function makePickup() {
  return { active: false, kind: 'hull', x: 0, y: 0, vx: 0, vy: 0, life: 0 };
}

export function createWorld(random, audio, particles) {
  const player = createPlayer();
  const enemies = createEnemies(random);
  const bullets = [];
  for (let i = 0; i < MAX_BULLETS; i += 1) bullets.push(makeBullet());
  const pickups = [];
  for (let i = 0; i < MAX_PICKUPS; i += 1) pickups.push(makePickup());

  const state = {
    score: 0,
    best: 0,
    kills: 0,
    wave: 0,
    time: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    shake: 0,
    flash: 0,
    banner: null,
    draft: null,
    boss: null,
    waveState: 'idle',
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: WAVE.spawnInterval,
    player: player.state,
    enemies: enemies.list,
    orbs: enemies.orbs,
    bullets,
    pickups,
  };

  function setBanner(text, sub, seconds = 2) {
    state.banner = { text, sub, timer: seconds, max: seconds };
  }

  function fireBullet(bullet) {
    for (let i = 0; i < MAX_BULLETS; i += 1) {
      const slot = bullets[i];
      if (slot.active) continue;
      slot.active = true;
      slot.x = bullet.x;
      slot.y = bullet.y;
      slot.vx = bullet.vx;
      slot.vy = bullet.vy;
      slot.damage = bullet.damage;
      slot.pierce = bullet.pierce;
      slot.radius = bullet.radius;
      slot.life = bullet.life;
      slot.hit = null;
      return;
    }
  }

  function dropPickup(x, y) {
    const roll = random();
    let kind = null;
    if (roll < PICKUP.hullChance) kind = 'hull';
    else if (roll < PICKUP.hullChance + PICKUP.shieldChance) kind = 'shield';
    else if (roll < PICKUP.hullChance + PICKUP.shieldChance + PICKUP.bombChance) kind = 'bomb';
    if (kind === null) return;
    for (let i = 0; i < MAX_PICKUPS; i += 1) {
      const p = pickups[i];
      if (p.active) continue;
      p.active = true;
      p.kind = kind;
      p.x = x;
      p.y = y;
      const angle = random() * Math.PI * 2;
      p.vx = Math.cos(angle) * 60;
      p.vy = Math.sin(angle) * 60;
      p.life = PICKUP.life;
      return;
    }
  }

  function killEnemy(enemy) {
    enemy.active = false;
    const mult = state.multiplier;
    const gained = Math.round(enemy.score * mult);
    state.score += gained;
    state.kills += 1;
    state.combo += COMBO.perKill;
    state.comboTimer = COMBO.decay;
    state.multiplier = 1 + Math.min(state.combo, 40) * 0.125;
    particles.text(enemy.x, enemy.y - 10, `+${gained}`, '#ffe66d', enemy.kind === KIND_BOSS ? 26 : 15);
    particles.burst(enemy.x, enemy.y, enemy.color, enemy.kind === KIND_BOSS ? 70 : 20, enemy.kind === KIND_BOSS ? 420 : 260, 3.5);
    particles.ring(enemy.x, enemy.y, enemy.color, enemy.radius * 3, 0.4, 2);
    audio.explode(enemy.kind === KIND_BOSS || enemy.kind === 'brute');
    state.shake = Math.min(14, state.shake + (enemy.kind === KIND_BOSS ? 12 : enemy.radius > 24 ? 6 : 2.5));
    if (enemy.kind === KIND_SPLITTER) {
      enemies.split(enemy, state.wave);
    }
    if (enemy.kind === KIND_BOSS) {
      state.boss = null;
      dropPickup(enemy.x - 30, enemy.y);
      dropPickup(enemy.x + 30, enemy.y);
      dropPickup(enemy.x, enemy.y - 30);
    } else {
      dropPickup(enemy.x, enemy.y);
    }
  }

  function onPlayerHit(damage, x, y) {
    const p = player.state;
    if (p.dead || p.invulnerable > 0 || p.dashTime > 0) return;
    if (p.shield && !p.shieldUsed) {
      p.shieldUsed = true;
      p.shield = false;
      p.invulnerable = 1.0;
      particles.ring(p.x, p.y, '#7bdff2', 70, 0.5, 4);
      particles.text(p.x, p.y - 28, 'SHIELD DOWN', '#7bdff2', 16);
      audio.hit();
      return;
    }
    p.hull -= damage;
    p.invulnerable = 1.2;
    state.flash = 0.35;
    state.shake = Math.min(16, state.shake + 7);
    particles.burst(p.x, p.y, '#ff5d73', 16, 240, 3);
    audio.hurt();
    if (p.hull <= 0) {
      p.hull = 0;
      p.dead = true;
      particles.burst(p.x, p.y, '#4ef0e0', 80, 420, 4);
      particles.ring(p.x, p.y, '#4ef0e0', 160, 0.8, 4);
      state.shake = 18;
      audio.explode(true);
      audio.gameOver();
    }
  }

  function startWave(wave) {
    state.wave = wave;
    state.waveState = 'spawning';
    state.spawnQueue = enemies.spawnWave(wave);
    state.spawnTimer = 0.5;
    state.spawnInterval = Math.max(WAVE.spawnIntervalMin, WAVE.spawnInterval - wave * 0.04);
    state.draft = null;
    const isBoss = wave % WAVE.bossEvery === 0;
    if (isBoss) {
      state.boss = enemies.spawnBoss(wave);
      setBanner(`WAVE ${wave}`, 'VOID WARDEN APPROACHES', 2.4);
      audio.boss();
    } else {
      setBanner(`WAVE ${wave}`, wave === 1 ? 'SURVIVE THE VOID' : `${state.spawnQueue.length} HOSTILES INBOUND`, 1.8);
    }
    // A fresh shield each wave when the Aegis upgrade was taken.
    if (player.state.shieldUsed) {
      player.state.shield = true;
      player.state.shieldUsed = false;
    }
  }

  function useBomb() {
    const p = player.state;
    if (p.bombs <= 0 || p.dead) return false;
    p.bombs -= 1;
    enemies.clearOrbs();
    particles.ring(p.x, p.y, '#ffe66d', 420, 0.8, 6);
    particles.ring(p.x, p.y, '#ff5d73', 300, 0.6, 4);
    state.shake = 16;
    state.flash = 0.3;
    audio.bomb();
    for (const e of enemies.list) {
      if (!e.active) continue;
      e.hull -= 150;
      e.flash = 0.15;
      if (e.hull <= 0) killEnemy(e);
    }
    return true;
  }

  return {
    state,
    player,
    enemies,
    reset() {
      state.score = 0;
      state.kills = 0;
      state.wave = 0;
      state.time = 0;
      state.combo = 0;
      state.comboTimer = 0;
      state.multiplier = 1;
      state.shake = 0;
      state.flash = 0;
      state.banner = null;
      state.draft = null;
      state.boss = null;
      state.waveState = 'idle';
      state.spawnQueue = [];
      state.spawnTimer = 0;
      player.reset();
      enemies.reset();
      particles.reset();
      for (const b of bullets) b.active = false;
      for (const p of pickups) p.active = false;
    },
    startRun() {
      this.reset();
      startWave(1);
    },
    /** Offer the draft after a clear; the caller picks with chooseUpgrade(). */
    openDraft() {
      state.waveState = 'draft';
      state.draft = drawDraft(random);
    },
    chooseUpgrade(index) {
      const draft = state.draft;
      if (!draft || index < 0 || index >= draft.length) return false;
      draft[index].apply(player.state);
      particles.text(player.state.x, player.state.y - 34, draft[index].name.toUpperCase(), '#7bdff2', 18);
      audio.pickup();
      player.heal(WAVE.healBetweenWaves);
      startWave(state.wave + 1);
      return true;
    },
    useBomb,
    /** The title screen's ambient drift: a few foes wander, nothing shoots. */
    stepTitle(step) {
      if (enemies.alive() < 8 && random() < step * 0.8) {
        const foe = enemies.spawn(randomPick(random, ['drifter', 'spitter', 'splitter']), 1);
        if (foe) {
          // Drift across the field so the title screen is alive.
          const tx = FIELD.width * (0.2 + random() * 0.6);
          const ty = FIELD.height * (0.2 + random() * 0.6);
          const d = Math.hypot(tx - foe.x, ty - foe.y) || 1;
          foe.vx = ((tx - foe.x) / d) * 45;
          foe.vy = ((ty - foe.y) / d) * 45;
        }
      }
      for (const e of enemies.list) {
        if (!e.active) continue;
        if (e.spawnScale < 1) e.spawnScale = Math.min(1, e.spawnScale + step * 3);
        e.x += e.vx * step;
        e.y += e.vy * step;
        e.vx += (random() - 0.5) * 20 * step;
        e.vy += (random() - 0.5) * 20 * step;
        if (e.x < -80 || e.x > FIELD.width + 80 || e.y < -80 || e.y > FIELD.height + 80) e.active = false;
      }
      particles.update(step);
    },
    /**
     * Advance the run one fixed step. `input` is { move, aim, firing, dash, bomb }.
     * Returns an EVENT_* bitmask.
     */
    step(step, input) {
      let events = EVENT_NONE;
      state.time += step;
      if (state.banner) {
        state.banner.timer -= step;
        if (state.banner.timer <= 0) state.banner = null;
      }
      if (state.shake > 0) state.shake = Math.max(0, state.shake - step * 26);
      if (state.flash > 0) state.flash = Math.max(0, state.flash - step * 1.4);
      if (state.comboTimer > 0) {
        state.comboTimer -= step;
        if (state.comboTimer <= 0) {
          state.combo = 0;
          state.multiplier = 1;
        }
      }
      const p = player.state;
      if (p.dead) {
        particles.update(step);
        return EVENT_OVER;
      }
      if (input.bomb) useBomb();
      if (input.dash && player.dash(input.move)) {
        particles.burst(p.x, p.y, '#4ef0e0', 10, 160, 2.5);
        audio.dash();
      }
      const fired = player.update(step, input.move, input.aim, input.firing, random);
      for (const b of fired) fireBullet(b);
      if (fired.length > 0) audio.shoot();
      if (p.thrusting && p.dashTime <= 0 && random() < 0.6) {
        particles.thrust(p.x - Math.cos(p.angle) * p.radius, p.y - Math.sin(p.angle) * p.radius, p.angle, '#4ef0e0');
      }

      // Spawn the wave's queue, a few at a time.
      if (state.waveState === 'spawning' || state.waveState === 'fighting') {
        state.spawnTimer -= step;
        if (state.spawnQueue.length > 0 && state.spawnTimer <= 0 && enemies.alive() < WAVE.maxAlive) {
          const kind = state.spawnQueue.shift();
          enemies.spawn(kind, state.wave);
          state.spawnTimer = state.spawnInterval * (0.7 + random() * 0.6);
        }
        if (state.spawnQueue.length === 0) state.waveState = 'fighting';
      }

      enemies.update(step, p, onPlayerHit);
      if (p.dead) {
        particles.update(step);
        return EVENT_OVER;
      }

      // Player bullets vs enemies.
      for (const b of bullets) {
        if (!b.active) continue;
        b.life -= step;
        b.x += b.vx * step;
        b.y += b.vy * step;
        if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
          b.active = false;
          continue;
        }
        for (const e of enemies.list) {
          if (!e.active || e.spawnScale < 0.6) continue;
          if (b.hit === e) continue;
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          const rr = e.radius + b.radius;
          if (dx * dx + dy * dy > rr * rr) continue;
          e.hull -= b.damage;
          e.flash = 0.12;
          particles.burst(b.x, b.y, e.color, 4, 140, 2);
          particles.text(b.x, b.y - 8, String(b.damage), '#ffffff', 12);
          audio.hit();
          if (b.pierce > 0) {
            b.pierce -= 1;
            b.hit = e;
          } else {
            b.active = false;
          }
          if (e.hull <= 0) killEnemy(e);
          if (!b.active) break;
        }
      }

      // Pickups: drift, magnet toward the player, collect on touch.
      for (const pk of pickups) {
        if (!pk.active) continue;
        pk.life -= step;
        if (pk.life <= 0) {
          pk.active = false;
          continue;
        }
        const dx = p.x - pk.x;
        const dy = p.y - pk.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < p.magnet) {
          pk.vx += (dx / dist) * PICKUP.magnetSpeed * 3 * step;
          pk.vy += (dy / dist) * PICKUP.magnetSpeed * 3 * step;
        } else {
          pk.vx *= Math.max(0, 1 - 2 * step);
          pk.vy *= Math.max(0, 1 - 2 * step);
        }
        pk.x += pk.vx * step;
        pk.y += pk.vy * step;
        if (dist < p.radius + 16) {
          pk.active = false;
          if (pk.kind === 'hull') {
            const healed = player.heal(PICKUP.hullAmount);
            particles.text(p.x, p.y - 26, healed > 0 ? `+${healed} HULL` : 'HULL FULL', '#4ef0e0', 15);
          } else if (pk.kind === 'shield') {
            p.shield = true;
            p.shieldUsed = false;
            particles.text(p.x, p.y - 26, 'SHIELD UP', '#7bdff2', 15);
          } else if (pk.kind === 'bomb') {
            p.bombs += 1;
            particles.text(p.x, p.y - 26, '+1 BOMB', '#ffe66d', 15);
          }
          particles.burst(pk.x, pk.y, '#ffffff', 8, 140, 2);
          audio.pickup();
        }
      }

      particles.update(step);

      // Wave clear: queue empty, nothing alive.
      if ((state.waveState === 'fighting' || state.waveState === 'spawning') && state.spawnQueue.length === 0 && enemies.alive() === 0) {
        const bonus = 100 * state.wave;
        state.score += bonus;
        particles.text(p.x, p.y - 40, `WAVE BONUS +${bonus}`, '#ffe66d', 20);
        particles.ring(p.x, p.y, '#4ef0e0', 200, 0.7, 4);
        audio.waveClear();
        state.waveState = 'clear';
        this.openDraft();
        events |= EVENT_WAVE_CLEAR;
      }
      return events;
    },
  };
}
