// The between-wave upgrade draft: a pool of nine upgrades, three offered at random
// after every cleared wave, each with a short name, a plain description and an apply()
// that writes the player's stats. Rarity is shown, not rolled: every card is useful,
// the choice is the strategy.
export const UPGRADE_POOL = [
  {
    id: 'overcharge',
    name: 'Overcharge Rounds',
    detail: '+25% bullet damage',
    apply: (player) => {
      player.damage *= 1.25;
    },
  },
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    detail: '+20% fire rate',
    apply: (player) => {
      player.fireInterval *= 0.83;
    },
  },
  {
    id: 'split',
    name: 'Split Shot',
    detail: '+1 projectile per shot',
    apply: (player) => {
      player.projectiles += 1;
    },
  },
  {
    id: 'piercing',
    name: 'Piercing Rounds',
    detail: 'Bullets pass through +1 enemy',
    apply: (player) => {
      player.pierce += 1;
    },
  },
  {
    id: 'thrusters',
    name: 'Ion Thrusters',
    detail: '+14% move speed',
    apply: (player) => {
      player.speed *= 1.14;
    },
  },
  {
    id: 'plating',
    name: 'Ablative Plating',
    detail: '+30 max hull and repair 30',
    apply: (player) => {
      player.maxHull += 30;
      player.hull = Math.min(player.maxHull, player.hull + 30);
    },
  },
  {
    id: 'magnet',
    name: 'Tractor Array',
    detail: '+70% pickup magnet range',
    apply: (player) => {
      player.magnet *= 1.7;
    },
  },
  {
    id: 'dash',
    name: 'Phase Dash',
    detail: 'Dash recharges 35% faster',
    apply: (player) => {
      player.dashCooldownScale *= 0.65;
    },
  },
  {
    id: 'aegis',
    name: 'Aegis Shield',
    detail: 'A shield blocks one hit each wave',
    apply: (player) => {
      player.shield = true;
      player.shieldUsed = false;
    },
  },
  {
    id: 'bomb',
    name: 'Nova Bomb',
    detail: '+1 bomb (Q: clears bullets, hurts all)',
    apply: (player) => {
      player.bombs += 1;
    },
  },
];

/** Offer three different upgrades, drawn at random from the pool. */
export function drawDraft(random) {
  const pool = [...UPGRADE_POOL];
  const draft = [];
  while (draft.length < 3 && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    draft.push(pool.splice(index, 1)[0]);
  }
  return draft;
}
