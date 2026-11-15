// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Waves: how many foes a wave fields, before the boss waves. */
export const WAVE = {
  baseCount: 6,
  perWave: 3,
  maxAlive: 14,
  spawnInterval: 0.9,
  spawnIntervalMin: 0.35,
  bossEvery: 5,
  healBetweenWaves: 20,
};

export const PLAYER = {
  radius: 16,
  speed: 300,
  accel: 2400,
  friction: 6.5,
  hull: 100,
  fireInterval: 0.16,
  bulletSpeed: 720,
  bulletDamage: 12,
  bulletRadius: 5,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 2.4,
  invulnerable: 1.2,
  magnet: 90,
  bombs: 1,
};

export const ENEMY = {
  drifter: { radius: 16, hull: 20, speed: 95, damage: 10, score: 50, color: '#ff5d73' },
  spitter: { radius: 17, hull: 26, speed: 70, damage: 8, score: 80, color: '#c77dff', shootInterval: 2.4, bulletSpeed: 220 },
  splitter: { radius: 20, hull: 30, speed: 80, damage: 10, score: 90, color: '#4cc9f0' },
  mini: { radius: 10, hull: 10, speed: 150, damage: 6, score: 25, color: '#90e0ef' },
  dasher: { radius: 15, hull: 24, speed: 85, damage: 12, score: 110, color: '#ffb703', chargeTime: 0.7, chargeSpeed: 520 },
  brute: { radius: 30, hull: 120, speed: 48, damage: 20, score: 200, color: '#ff8fa3' },
  boss: { radius: 52, hull: 900, speed: 55, damage: 25, score: 2000, color: '#f72585' },
};

/** Enemy bullet tuning. */
export const ORB = { radius: 6, speed: 220, damage: 8 };

/** Pickups: drop chances and effects. */
export const PICKUP = {
  hullChance: 0.09,
  shieldChance: 0.05,
  bombChance: 0.04,
  hullAmount: 22,
  magnetSpeed: 260,
  life: 9,
};

/** Combo: each kill adds one step; the multiplier caps here and decays after this long idle. */
export const COMBO = { max: 8, decay: 3.0, perKill: 1 };

export const PALETTE = {
  backdrop: '#070512',
  nebulaA: '#1b1040',
  nebulaB: '#3d0c4d',
  nebulaC: '#0c2d4d',
  grid: '#1c1440',
  player: '#4ef0e0',
  playerDark: '#1d7a72',
  bullet: '#ffe66d',
  enemyBullet: '#ff5d8f',
  hull: '#4ef0e0',
  hullLow: '#ff5d73',
  shield: '#7bdff2',
  text: '#eef1ff',
  muted: '#9a93c7',
  gold: '#ffe66d',
  card: '#171233',
  cardEdge: '#4a3d8f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'neon-void.best';
