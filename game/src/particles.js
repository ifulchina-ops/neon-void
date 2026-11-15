// Particles, floating score text and shockwave rings. One pool, allocated once at boot
// and reused, so the game never allocates while it runs.
const MAX_PARTICLES = 420;
const MAX_TEXTS = 48;
const MAX_RINGS = 16;

/** A single pooled particle. */
function makeParticle() {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 2, glow: true };
}

export function createParticles() {
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) particles.push(makeParticle());
  const texts = [];
  for (let i = 0; i < MAX_TEXTS; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, value: '', color: '#fff', size: 16 });
  }
  const rings = [];
  for (let i = 0; i < MAX_RINGS; i += 1) {
    rings.push({ active: false, x: 0, y: 0, radius: 0, maxRadius: 80, life: 0, maxLife: 0.5, color: '#fff', width: 3 });
  }

  function spawnParticle(x, y, vx, vy, life, size, color, drag = 2) {
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const p = particles[i];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.drag = drag;
      return;
    }
  }

  return {
    /** A burst of sparks flying out of (x, y). */
    burst(x, y, color, count = 18, speed = 260, size = 3) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const power = speed * (0.3 + Math.random() * 0.7);
        spawnParticle(x, y, Math.cos(angle) * power, Math.sin(angle) * power, 0.4 + Math.random() * 0.5, size * (0.6 + Math.random() * 0.8), color);
      }
    },
    /** Engine thrust: a few short-lived sparks behind a moving ship. */
    thrust(x, y, angle, color) {
      const spread = 0.5;
      const a = angle + Math.PI + (Math.random() - 0.5) * spread;
      const power = 90 + Math.random() * 70;
      spawnParticle(x, y, Math.cos(a) * power, Math.sin(a) * power, 0.25 + Math.random() * 0.2, 2.5, color);
    },
    /** An expanding ring (explosions, bombs, wave clears). */
    ring(x, y, color, maxRadius = 90, life = 0.5, width = 3) {
      for (let i = 0; i < MAX_RINGS; i += 1) {
        const r = rings[i];
        if (r.active) continue;
        r.active = true;
        r.x = x;
        r.y = y;
        r.radius = 6;
        r.maxRadius = maxRadius;
        r.life = life;
        r.maxLife = life;
        r.color = color;
        r.width = width;
        return;
      }
    },
    /** Floating text that rises and fades (score popups, pickups). */
    text(x, y, value, color = '#ffe66d', size = 16) {
      for (let i = 0; i < MAX_TEXTS; i += 1) {
        const t = texts[i];
        if (t.active) continue;
        t.active = true;
        t.x = x;
        t.y = y;
        t.life = 0.9;
        t.maxLife = 0.9;
        t.value = value;
        t.color = color;
        t.size = size;
        return;
      }
    },
    update(step) {
      for (let i = 0; i < MAX_PARTICLES; i += 1) {
        const p = particles[i];
        if (!p.active) continue;
        p.life -= step;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const damp = Math.max(0, 1 - p.drag * step);
        p.vx *= damp;
        p.vy *= damp;
        p.x += p.vx * step;
        p.y += p.vy * step;
      }
      for (let i = 0; i < MAX_TEXTS; i += 1) {
        const t = texts[i];
        if (!t.active) continue;
        t.life -= step;
        t.y -= 42 * step;
        if (t.life <= 0) t.active = false;
      }
      for (let i = 0; i < MAX_RINGS; i += 1) {
        const r = rings[i];
        if (!r.active) continue;
        r.life -= step;
        r.radius = r.maxRadius * (1 - Math.max(0, r.life) / r.maxLife) + 6;
        if (r.life <= 0) r.active = false;
      }
    },
    draw(context) {
      for (let i = 0; i < MAX_PARTICLES; i += 1) {
        const p = particles[i];
        if (!p.active) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        context.globalAlpha = alpha;
        context.fillStyle = p.color;
        context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      for (let i = 0; i < MAX_RINGS; i += 1) {
        const r = rings[i];
        if (!r.active) continue;
        context.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.9;
        context.strokeStyle = r.color;
        context.lineWidth = r.width;
        context.beginPath();
        context.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        context.stroke();
      }
      context.textAlign = 'center';
      for (let i = 0; i < MAX_TEXTS; i += 1) {
        const t = texts[i];
        if (!t.active) continue;
        context.globalAlpha = Math.max(0, t.life / t.maxLife);
        context.font = `700 ${t.size}px system-ui, sans-serif`;
        context.fillStyle = t.color;
        context.fillText(t.value, t.x, t.y);
      }
      context.globalAlpha = 1;
    },
    reset() {
      for (const p of particles) p.active = false;
      for (const t of texts) t.active = false;
      for (const r of rings) r.active = false;
    },
  };
}
