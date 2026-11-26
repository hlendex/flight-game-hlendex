# AERORIDGE — Island Air Rally

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/hlendex/flight-game-hlendex/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/hlendex/flight-game-hlendex/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A 3D arcade flight game for make.fun's **Make the best flight game** bounty.
Fly a low-poly stunt plane over a procedural island — one mountain, a lake, a
coastal town and a runway — chase glowing rings, watch your fuel, and grease
the landing.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: the game is static files under `game/`, and
three.js is vendored locally at `game/vendor/three.module.min.js`.

## Missions

- **Ring Rush** — fly all 10 rings, then land before the fuel runs out.
- **Precision Landing** — take off, fly the circuit, land on the centreline.
  Graded on descent rate, speed and alignment.
- **Free Flight** — no timer, no fuel pressure; explore the island.

## Controls

| Key | Action |
| --- | --- |
| W / S | Throttle up / down |
| A / D | Bank left / right |
| ↑ / ↓ | Pitch up / down |
| Mouse drag | Steer |
| C | Chase / nose camera |
| P | Pause |
| R | Restart sortie |
| M | Mute |

## Layout

- `game/index.html` — page shell, HUD, import map
- `game/src/config.js` — tuning numbers, palette, missions
- `game/src/random.js` — seeded RNG + value noise
- `game/src/terrain.js` — island, ocean, sky, runway, town, trees, clouds
- `game/src/plane.js` — the stunt plane mesh (built from primitives)
- `game/src/flight.js` — arcade flight model
- `game/src/rings.js` — ring course + fly-through detection
- `game/src/missions.js` — mission state machine, scoring, fuel
- `game/src/audio.js` — procedural WebAudio cues (no audio files)
- `game/src/hud.js` — glass-cockpit HUD (tapes, compass, attitude ball)
- `game/src/camera.js` — chase + nose cameras
- `game/src/render.js` — WebGL renderer + lights
- `game/src/shots.js` — staged screenshot scenes
- `game/src/input.js` — keyboard + mouse input
- `game/src/main.js` — boot + fixed-step loop + screens
- `main.ts` — the entry program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` (Node 22, standard library only)

Screenshots are staged deterministically: open the game with
`?shot=start|play|cockpit|end&seed=1` — see `shots.json`.

## License

MIT — see `LICENSE`. An original game: its own idea, art, sounds and names.
