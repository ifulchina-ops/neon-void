# NEON VOID — a twin-stick arena shooter

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ifulchina-ops/neon-void/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ifulchina-ops/neon-void/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Built by an AI agent for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01), $1,000 in USDC.

A twin-stick arena shooter played single-player in a desktop browser. No build step,
no network request: static files under `game/`, all sound synthesized with WebAudio.

## The game

**Neon Void** — your ship is the last light in a dead sector, and the void keeps
sending things to snuff it out. Survive wave after wave, draft upgrades between
them, and break the **VOID WARDEN** every fifth wave.

- **Waves**: each wave fields more foes than the last. Six kinds — **drifters**
  that chase you, **spitters** that fire orbs from range, **splitters** that burst
  into two minis, **dashers** that telegraph a charge, **brutes** that soak damage,
  and the **VOID WARDEN** boss with radial bullet bursts.
- **Draft**: clear a wave and pick 1 of 3 upgrades — overcharge rounds, rapid
  cycler, split shot, piercing rounds, ion thrusters, ablative plating, tractor
  array, phase dash, aegis shield, nova bombs. Ten upgrades; the build is the
  strategy.
- **Score**: kills pay points times a combo multiplier that grows with every kill
  and decays when you go quiet. Wave-clear bonuses, pickups (hull cells, shields,
  bombs), best score kept in localStorage.
- **Feel**: particles, shockwave rings, screen shake, hit flashes, floating score
  text, engine thrust, a pulsing neon starfield — and a full synthesized WebAudio
  soundtrack of shots, explosions, pickups and a bassline (M to mute).
- **Loop**: title → waves → draft → boss → game over with your stats and a
  one-key restart. Pause any time with P; leaving the tab pauses for you.

## Controls

| Key | Action |
| --- | --- |
| W A S D / Arrows | Move |
| Mouse | Aim |
| Hold click / Space | Fire |
| Shift / Right-click | Dash (brief invulnerability) |
| Q / E | Nova bomb (clears bullets, hurts everything) |
| 1 / 2 / 3 or click | Pick an upgrade card |
| P / Esc | Pause |
| R | Restart after game over |
| M | Mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

Deterministic staged frames for captures:

```sh
# ?shot=start | play | upgrade | end, &seed=N
http://localhost:8080/?shot=play&seed=1
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## Layout

- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` — the page: canvas, screen-reader status line.
- `game/src/main.js` — boot, the fixed-step loop, the five screens, draft
  hit-testing.
- `game/src/world.js` — the run: waves, bullets, pickups, score and combo,
  bombs, the draft trigger.
- `game/src/enemies.js` — the six foe kinds and the boss, their movement,
  attacks and orbs.
- `game/src/player.js` — the ship: movement, dash, aimed fire, upgradeable
  weapon stats.
- `game/src/upgrades.js` — the ten-upgrade pool and the three-card draft.
- `game/src/render.js` — everything seen: starfield, ships, HUD, banner and
  the five screens.
- `game/src/particles.js` — pooled particles, floating text, shockwave rings.
- `game/src/audio.js` — synthesized WebAudio effects and the bassline.
- `game/src/input.js` — keyboard / mouse / pointer input.
- `game/src/config.js` — every tuning number and colour in one place.
- `game/src/random.js` — the seeded generator behind repeatable games.
- `game/src/shots.js` — the deterministic screenshot scenes.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
