// Everything the player sees: the neon starfield, the ships, the bullets, the HUD and
// the five screens (title, play, draft, paused, game over). The renderer never changes
// the world; it paints what is there, scaled from the fixed 1280x720 field to the window.
import { FIELD, FONT, PALETTE } from './config.js';
import { createRandom } from './random.js';
import { KIND_BOSS, KIND_BRUTE, KIND_DASHER, KIND_DRIFTER, KIND_MINI, KIND_SPITTER, KIND_SPLITTER } from './enemies.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const STARS = 110;
const BLOBS = 7;

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  context.scale(dpr, dpr);

  // Fixed starfield and nebula blobs, seeded so every visit paints the same sky.
  const skyRandom = createRandom(1337);
  const stars = [];
  for (let i = 0; i < STARS; i += 1) {
    stars.push({
      x: skyRandom() * FIELD.width,
      y: skyRandom() * FIELD.height,
      size: 0.6 + skyRandom() * 1.8,
      phase: skyRandom() * Math.PI * 2,
      speed: 0.4 + skyRandom() * 1.2,
    });
  }
  const blobs = [];
  const blobColors = [PALETTE.nebulaA, PALETTE.nebulaB, PALETTE.nebulaC, PALETTE.nebulaA, PALETTE.nebulaB];
  for (let i = 0; i < BLOBS; i += 1) {
    blobs.push({
      x: skyRandom() * FIELD.width,
      y: skyRandom() * FIELD.height,
      radius: 180 + skyRandom() * 260,
      color: blobColors[i % blobColors.length],
    });
  }

  function drawBackground(now) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, '#0a0618');
    gradient.addColorStop(0.55, PALETTE.backdrop);
    gradient.addColorStop(1, '#0d0518');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const blob of blobs) {
      const radial = context.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
      radial.addColorStop(0, blob.color);
      radial.addColorStop(1, 'rgba(7,5,18,0)');
      context.globalAlpha = 0.55;
      context.fillStyle = radial;
      context.fillRect(blob.x - blob.radius, blob.y - blob.radius, blob.radius * 2, blob.radius * 2);
    }
    context.globalAlpha = 1;
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(now * star.speed + star.phase));
      context.globalAlpha = twinkle;
      context.fillStyle = '#dfe6ff';
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
    context.strokeStyle = PALETTE.grid;
    context.globalAlpha = 0.16;
    context.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
      context.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 80) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function drawShip(x, y, angle, radius, color, dark) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.shadowColor = color;
    context.shadowBlur = 14;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(radius + 6, 0);
    context.lineTo(-radius * 0.8, radius * 0.75);
    context.lineTo(-radius * 0.4, 0);
    context.lineTo(-radius * 0.8, -radius * 0.75);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = dark;
    context.beginPath();
    context.arc(0, 0, radius * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawEnemy(enemy, now) {
    const scale = enemy.spawnScale < 1 ? enemy.spawnScale : 1;
    const radius = enemy.radius * scale;
    if (radius <= 0.5) return;
    context.save();
    context.translate(enemy.x, enemy.y);
    context.shadowColor = enemy.color;
    context.shadowBlur = 12;
    context.fillStyle = enemy.color;
    context.strokeStyle = enemy.color;
    if (enemy.flash > 0) context.fillStyle = '#ffffff';
    const aimAngle = Math.atan2(enemy.vy, enemy.vx);
    if (enemy.kind === KIND_DRIFTER || enemy.kind === KIND_MINI) {
      context.rotate(aimAngle);
      context.beginPath();
      context.moveTo(radius, 0);
      context.lineTo(-radius, radius * 0.8);
      context.lineTo(-radius * 0.4, 0);
      context.lineTo(-radius, -radius * 0.8);
      context.closePath();
      context.fill();
    } else if (enemy.kind === KIND_SPITTER) {
      context.rotate(now * 0.8);
      context.beginPath();
      context.moveTo(0, -radius);
      context.lineTo(radius, 0);
      context.lineTo(0, radius);
      context.lineTo(-radius, 0);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
      context.fill();
    } else if (enemy.kind === KIND_SPLITTER) {
      context.rotate(now * 0.5);
      context.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(7,5,18,0.85)';
      context.beginPath();
      context.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      context.fill();
    } else if (enemy.kind === KIND_DASHER) {
      const telegraph = enemy.state === 1;
      context.rotate(telegraph ? enemy.angle : aimAngle);
      context.globalAlpha = telegraph ? 0.55 + 0.45 * Math.sin(now * 24) : 1;
      context.beginPath();
      context.moveTo(radius + 4, 0);
      context.lineTo(-radius, radius * 0.9);
      context.lineTo(-radius * 0.5, 0);
      context.lineTo(-radius, -radius * 0.9);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
    } else if (enemy.kind === KIND_BRUTE) {
      context.rotate(now * 0.25);
      context.lineWidth = 3;
      context.strokeRect(-radius * 0.8, -radius * 0.8, radius * 1.6, radius * 1.6);
      context.beginPath();
      context.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
      context.fill();
    } else if (enemy.kind === KIND_BOSS) {
      context.rotate(now * 0.3);
      context.lineWidth = 4;
      context.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.strokeStyle = '#ffffff';
      context.globalAlpha = 0.7;
      context.beginPath();
      context.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    // Hull bar for tougher foes.
    if (enemy.maxHull > 30 && enemy.hull < enemy.maxHull) {
      const width = radius * 2;
      context.fillStyle = 'rgba(7,5,18,0.8)';
      context.fillRect(enemy.x - width / 2, enemy.y - radius - 12, width, 5);
      context.fillStyle = enemy.color;
      context.fillRect(enemy.x - width / 2, enemy.y - radius - 12, width * (enemy.hull / enemy.maxHull), 5);
    }
  }

  function drawHud(state, best, muted) {
    const p = state.player;
    // Hull bar, top left.
    context.textAlign = 'left';
    context.fillStyle = PALETTE.text;
    context.font = '700 15px system-ui, sans-serif';
    context.fillText('HULL', 24, 30);
    context.fillStyle = 'rgba(7,5,18,0.7)';
    roundRect(context, 24, 38, 220, 16, 8);
    context.fill();
    context.fillStyle = p.hull / p.maxHull > 0.3 ? PALETTE.hull : PALETTE.hullLow;
    roundRect(context, 24, 38, 220 * Math.max(0, p.hull / p.maxHull), 16, 8);
    context.fill();
    context.fillStyle = PALETTE.text;
    context.font = '700 13px system-ui, sans-serif';
    context.fillText(`${Math.ceil(p.hull)} / ${p.maxHull}`, 252, 51);
    if (p.shield) {
      context.fillStyle = PALETTE.shield;
      context.fillText('SHIELD READY', 24, 76);
    }
    // Bombs + dash, bottom left.
    context.fillStyle = PALETTE.gold;
    context.font = '700 15px system-ui, sans-serif';
    context.fillText(`BOMBS ${p.bombs}  (Q)`, 24, FIELD.height - 44);
    const dashReady = p.dashCooldown <= 0;
    context.fillStyle = dashReady ? PALETTE.player : PALETTE.muted;
    context.fillText(dashReady ? 'DASH READY  (Shift / Right-click)' : 'DASH …', 24, FIELD.height - 22);
    // Score, wave, combo, top centre.
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = '800 30px system-ui, sans-serif';
    context.fillText(String(state.score), FIELD.width / 2, 40);
    context.font = '700 15px system-ui, sans-serif';
    context.fillStyle = PALETTE.muted;
    context.fillText(`WAVE ${Math.max(1, state.wave)}`, FIELD.width / 2, 62);
    if (state.multiplier > 1) {
      context.fillStyle = PALETTE.gold;
      context.font = '800 18px system-ui, sans-serif';
      context.fillText(`COMBO x${state.multiplier.toFixed(1)}`, FIELD.width / 2, 88);
    }
    // Best + mute, top right.
    context.textAlign = 'right';
    context.fillStyle = PALETTE.muted;
    context.font = '700 15px system-ui, sans-serif';
    context.fillText(`BEST ${best}`, FIELD.width - 24, 30);
    context.fillText(muted ? 'SOUND OFF (M)' : 'SOUND ON (M)', FIELD.width - 24, 52);
    // Boss bar.
    if (state.boss && state.boss.active) {
      const boss = state.boss;
      const width = 420;
      const x = (FIELD.width - width) / 2;
      const y = FIELD.height - 58;
      context.textAlign = 'center';
      context.fillStyle = '#f72585';
      context.font = '800 15px system-ui, sans-serif';
      context.fillText('VOID WARDEN', FIELD.width / 2, y - 8);
      context.fillStyle = 'rgba(7,5,18,0.8)';
      roundRect(context, x, y, width, 12, 6);
      context.fill();
      context.fillStyle = '#f72585';
      roundRect(context, x, y, width * Math.max(0, boss.hull / boss.maxHull), 12, 6);
      context.fill();
    }
    // Wave banner.
    if (state.banner) {
      const alpha = Math.min(1, state.banner.timer / (state.banner.max * 0.4));
      context.globalAlpha = alpha;
      context.textAlign = 'center';
      context.fillStyle = PALETTE.text;
      context.font = '800 54px system-ui, sans-serif';
      context.shadowColor = '#7b2ff7';
      context.shadowBlur = 24;
      context.fillText(state.banner.text, FIELD.width / 2, 250);
      context.shadowBlur = 0;
      context.font = '700 20px system-ui, sans-serif';
      context.fillStyle = PALETTE.gold;
      context.fillText(state.banner.sub, FIELD.width / 2, 284);
      context.globalAlpha = 1;
    }
  }

  function panel(x, y, width, height) {
    context.fillStyle = 'rgba(10,7,26,0.82)';
    roundRect(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.cardEdge;
    context.lineWidth = 2;
    context.stroke();
  }

  function drawTitle(state, best, now) {
    context.fillStyle = 'rgba(7,5,18,0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = '800 92px system-ui, sans-serif';
    context.shadowColor = '#7b2ff7';
    context.shadowBlur = 34;
    context.fillText('NEON VOID', FIELD.width / 2, 240);
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.player;
    context.font = '700 24px system-ui, sans-serif';
    context.fillText('A TWIN-STICK ARENA SHOOTER', FIELD.width / 2, 284);
    context.fillStyle = PALETTE.muted;
    context.font = '500 18px system-ui, sans-serif';
    context.fillText('Waves of voidspawn. Draft upgrades. Slay the Warden every 5th wave.', FIELD.width / 2, 318);
    if (best > 0) {
      context.fillStyle = PALETTE.gold;
      context.font = '800 20px system-ui, sans-serif';
      context.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 356);
    }
    const pulse = 0.6 + 0.4 * Math.sin(now * 3);
    context.globalAlpha = pulse;
    context.fillStyle = PALETTE.text;
    context.font = '800 24px system-ui, sans-serif';
    context.fillText('CLICK OR PRESS SPACE TO START', FIELD.width / 2, 430);
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.muted;
    context.font = '500 17px system-ui, sans-serif';
    context.fillText('WASD move  ·  Mouse aim  ·  Hold click / Space to fire', FIELD.width / 2, 500);
    context.fillText('Shift / Right-click dash  ·  Q bomb  ·  P pause  ·  M mute', FIELD.width / 2, 526);
    context.fillText('Clear a wave, pick 1 of 3 upgrades, face the next one.', FIELD.width / 2, 552);
  }

  function drawDraft(state, aim) {
    context.fillStyle = 'rgba(7,5,18,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = '800 44px system-ui, sans-serif';
    context.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 130);
    context.fillStyle = PALETTE.gold;
    context.font = '700 20px system-ui, sans-serif';
    context.fillText('CHOOSE ONE UPGRADE  —  click a card or press 1 / 2 / 3', FIELD.width / 2, 166);
    const draft = state.draft ?? [];
    const cardWidth = 300;
    const cardHeight = 220;
    const gap = 36;
    const total = draft.length * cardWidth + (draft.length - 1) * gap;
    let x = (FIELD.width - total) / 2;
    const y = 240;
    draft.forEach((card, index) => {
      const hovered = aim && aim.x >= x && aim.x <= x + cardWidth && aim.y >= y && aim.y <= y + cardHeight;
      context.save();
      if (hovered) {
        context.shadowColor = PALETTE.player;
        context.shadowBlur = 22;
      }
      context.fillStyle = hovered ? '#1d1745' : PALETTE.card;
      roundRect(context, x, y, cardWidth, cardHeight, 16);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = hovered ? PALETTE.player : PALETTE.cardEdge;
      context.lineWidth = 2;
      context.stroke();
      context.restore();
      context.textAlign = 'center';
      context.fillStyle = PALETTE.muted;
      context.font = '800 18px system-ui, sans-serif';
      context.fillText(`[${index + 1}]`, x + cardWidth / 2, y + 42);
      context.fillStyle = PALETTE.text;
      context.font = '800 24px system-ui, sans-serif';
      const name = card.name;
      context.fillText(name, x + cardWidth / 2, y + 92, cardWidth - 32);
      context.fillStyle = PALETTE.gold;
      context.font = '500 18px system-ui, sans-serif';
      const words = card.detail.split(' ');
      let line = '';
      let lineY = y + 132;
      for (const word of words) {
        if (context.measureText(`${line} ${word}`.trim()).width > cardWidth - 40 && line !== '') {
          context.fillText(line.trim(), x + cardWidth / 2, lineY);
          line = word;
          lineY += 26;
        } else {
          line = `${line} ${word}`.trim();
        }
      }
      context.fillText(line, x + cardWidth / 2, lineY);
      x += cardWidth + gap;
    });
    context.fillStyle = PALETTE.muted;
    context.font = '500 17px system-ui, sans-serif';
    context.fillText(`SCORE ${state.score}   ·   WAVE ${state.wave + 1} NEXT`, FIELD.width / 2, 540);
  }

  function drawPaused() {
    context.fillStyle = 'rgba(7,5,18,0.6)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = '800 56px system-ui, sans-serif';
    context.fillText('PAUSED', FIELD.width / 2, 350);
    context.fillStyle = PALETTE.muted;
    context.font = '500 20px system-ui, sans-serif';
    context.fillText('Press P or Space to resume', FIELD.width / 2, 392);
  }

  function drawOver(state, best) {
    context.fillStyle = 'rgba(7,5,18,0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.fillStyle = '#ff5d73';
    context.font = '800 64px system-ui, sans-serif';
    context.shadowColor = '#ff5d73';
    context.shadowBlur = 26;
    context.fillText('THE VOID TAKES YOU', FIELD.width / 2, 210);
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.text;
    context.font = '800 52px system-ui, sans-serif';
    context.fillText(String(state.score), FIELD.width / 2, 316);
    context.fillStyle = PALETTE.muted;
    context.font = '700 18px system-ui, sans-serif';
    context.fillText('FINAL SCORE', FIELD.width / 2, 262);
    const rows = [
      ['WAVE REACHED', String(Math.max(1, state.wave))],
      ['FOES DESTROYED', String(state.kills)],
      ['TIME SURVIVED', `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`],
      ['BEST SCORE', String(best)],
    ];
    let y = 356;
    for (const [label, value] of rows) {
      context.textAlign = 'right';
      context.fillStyle = PALETTE.muted;
      context.font = '700 18px system-ui, sans-serif';
      context.fillText(label, FIELD.width / 2 - 12, y);
      context.textAlign = 'left';
      context.fillStyle = PALETTE.text;
      context.fillText(value, FIELD.width / 2 + 12, y);
      y += 34;
    }
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300);
    context.globalAlpha = pulse;
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = '800 24px system-ui, sans-serif';
    context.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 540);
    context.globalAlpha = 1;
  }

  return {
    /** Paint the world under `screen`, with `best` and the UI extras { aim, now, muted }. */
    draw(state, screen, best, extra = {}) {
      const now = extra.now ?? 0;
      const aim = extra.aim ?? null;
      const muted = extra.muted ?? false;
      context.save();
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Screen shake: deterministic wobble from the clock, scaled by the world's shake.
      if (state.shake > 0.5) {
        const sx = Math.sin(now * 127.1) * state.shake * 0.5;
        const sy = Math.cos(now * 149.7) * state.shake * 0.5;
        context.translate(sx, sy);
      }
      drawBackground(now);
      // Player bullets.
      for (const b of state.bullets) {
        if (!b.active) continue;
        context.strokeStyle = PALETTE.bullet;
        context.lineWidth = 3;
        context.shadowColor = PALETTE.bullet;
        context.shadowBlur = 8;
        context.beginPath();
        context.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
      context.shadowBlur = 0;
      // Enemy orbs.
      for (const o of state.orbs) {
        if (!o.active) continue;
        const pulse = 1 + 0.25 * Math.sin(now * 10 + o.x);
        context.fillStyle = PALETTE.enemyBullet;
        context.shadowColor = PALETTE.enemyBullet;
        context.shadowBlur = 10;
        context.beginPath();
        context.arc(o.x, o.y, o.radius * pulse, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;
      // Pickups.
      for (const pk of state.pickups) {
        if (!pk.active) continue;
        const bob = Math.sin(now * 4 + pk.x) * 3;
        const color = pk.kind === 'hull' ? '#4ef0e0' : pk.kind === 'shield' ? '#7bdff2' : '#ffe66d';
        context.save();
        context.translate(pk.x, pk.y + bob);
        context.shadowColor = color;
        context.shadowBlur = 12;
        context.fillStyle = color;
        context.beginPath();
        context.arc(0, 0, 13, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = '#070512';
        context.font = '800 15px system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(pk.kind === 'hull' ? '+' : pk.kind === 'shield' ? 'S' : 'B', 0, 1);
        context.textBaseline = 'alphabetic';
        context.restore();
      }
      // Enemies, then the player.
      for (const e of state.enemies) {
        if (e.active) drawEnemy(e, now);
      }
      const p = state.player;
      if (!p.dead && screen !== SCREEN_TITLE) {
        const blink = p.invulnerable > 0 && p.dashTime <= 0 ? (Math.sin(now * 30) > 0 ? 0.35 : 1) : 1;
        context.globalAlpha = blink;
        if (p.thrusting && p.dashTime <= 0) {
          const flame = 10 + Math.sin(now * 40) * 4;
          context.fillStyle = '#ff9f1c';
          context.beginPath();
          context.moveTo(p.x - Math.cos(p.angle) * p.radius, p.y - Math.sin(p.angle) * p.radius);
          context.lineTo(p.x - Math.cos(p.angle) * (p.radius + flame), p.y - Math.sin(p.angle) * (p.radius + flame));
          context.lineTo(p.x - Math.cos(p.angle) * p.radius - Math.sin(p.angle) * 5, p.y - Math.sin(p.angle) * p.radius + Math.cos(p.angle) * 5);
          context.closePath();
          context.fill();
        }
        drawShip(p.x, p.y, p.angle, p.radius, PALETTE.player, PALETTE.playerDark);
        if (p.shield) {
          context.strokeStyle = PALETTE.shield;
          context.globalAlpha = 0.8;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(p.x, p.y, p.radius + 9, 0, Math.PI * 2);
          context.stroke();
          context.globalAlpha = 1;
        }
        context.globalAlpha = 1;
      }
      // Aim reticle at the mouse.
      if (aim && screen === SCREEN_PLAY) {
        context.strokeStyle = 'rgba(238,241,255,0.85)';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(aim.x, aim.y, 11, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.moveTo(aim.x - 16, aim.y);
        context.lineTo(aim.x - 6, aim.y);
        context.moveTo(aim.x + 6, aim.y);
        context.lineTo(aim.x + 16, aim.y);
        context.moveTo(aim.x, aim.y - 16);
        context.lineTo(aim.x, aim.y - 6);
        context.moveTo(aim.x, aim.y + 6);
        context.lineTo(aim.x, aim.y + 16);
        context.stroke();
      }
      context.restore();
      context.save();
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (screen === SCREEN_PLAY || screen === SCREEN_DRAFT) drawHud(state, best, muted);
      if (screen === SCREEN_TITLE) drawTitle(state, best, now);
      else if (screen === SCREEN_DRAFT) drawDraft(state, aim);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, best);
      // Hurt flash.
      if (state.flash > 0) {
        context.fillStyle = `rgba(255,60,90,${(state.flash * 0.5).toFixed(3)})`;
        context.fillRect(0, 0, FIELD.width, FIELD.height);
      }
      context.restore();
    },
  };
}
