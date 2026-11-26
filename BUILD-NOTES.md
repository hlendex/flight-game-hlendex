# BUILD-NOTES.md — AERORIDGE: Island Air Rally

Entry for make.fun "Make the best flight game" (best-flight-game-20261126-0057).
Bounty: $500, 50 places (1st $100). Deadline: Sat 28 Nov 2026 08:57 WITA.
Escrow: $500 USDC verified funded (AAix36GVuvUG8q8b3eMwU5JCjKvJvdHr9vSVrSNb5unw).
Entry is free. Game text in English (judges do not read Indonesian).

## Kit (verified 26 Nov 2026 ~22:00 WITA)

- Kit URL: https://make.fun/c/best-flight-game-20261126-0057/kit
- Kit file: `kit.tar.gz`, 16,100,910 bytes
- Kit sha256: `77725f27212357ec65b1b14d3faf4b7ed6665fc2604bd7def1ec0b65ad9b2e23`
- Harness version: `harness@439e03288d8254dbdebfeee0e886f45aa003061ad9faf5d8fc99338d9fac0f98 node v26.13.1`
- Scorer version: `scorer@b4ff9a3eeff331d1c237b6f688f4b129715c530f0122992aaacb77da14fc9a9e program@385f7fec318939fc0df2351e15bd412ebe7159f3876a57974b5e8cebaa547c8c`
- RULES.txt + competition.yaml + starter read in full. Key caps: game/ ≤993
  files / ≤48 MiB, index.html ≤1 MiB; screenshots 3–4, each ≤256 KiB, long side
  ≤1280, short side ≥480; dossier text ≤160 KiB; main.ts stdlib-only, runs
  twice, deterministic bytes.
- Blind rounds: round cutoffs during the 48 h window; submit early so the
  entry is rated in development rounds and can reach the final heat (top 200
  dev-board seats; final pays top 50).

## Research consulted (read-only, concepts only)

- Repos: lauramionel/cayley-flight-simulator, dai-studio/ex-baron,
  jason9075/Skyline-Rush, Larryzpl123/Skybreak--Protocol,
  prawe95/Flight-Sim-AF, 0xmariowu/cloudkeep.
- Skills: Last-Harvest building-games SKILL.md (fixed-step loop, flight input
  signs), DRIFTWING SKILL.md (banking flight feel), threejs skill
  (renderer/camera decisions).
- No code, art, names or assets copied. All game code written fresh in this
  session via write/edit tools. three.js r160 vendored as
  `game/vendor/three.module.min.js` (670,681 bytes, `*.min.js` — excluded
  from transcript counts per RULES.txt).

## Build log

- 26 Nov ~22:00 WITA — kit downloaded + verified, RULES read, DESIGN.md
  written (Variant A chase-view ring-chase chosen over Variant B cockpit sim;
  reasons in DESIGN.md).
- 26 Nov ~22:05 WITA — three.js r160 vendored; game source files written.
- 26 Nov ~22:15 WITA — first play-test + revision rounds (below); main.ts
  verified deterministic (two runs byte-identical).

## Test evidence

Playwright headless Chromium (SwiftShader), `test/test-shots.mjs`:
- 4 staged screenshots rendered, `window.__shotReady` fired for each.
- **Zero external network requests** (only localhost + data: URIs).
- **Zero console errors** (after adding a `data:,` favicon to kill the 404).
- Controls self-test: A rolls left, D rolls right — PASS.
- Live flight test: clicked FLY, held W + ArrowUp — plane accelerated,
  lifted off, airborne at 27.6–30.5 m/s, altitude 18–22 m, banner
  "AIRBORNE — HAVE FUN UP THERE", HUD airspeed/altitude live (54–59 KT,
  12–16 M). ALL CHECKS PASSED.
- Screenshots: 1280×800 JPEG, 54–88 KiB each (caps: ≤256 KiB, long ≤1280,
  short ≥480). 1-start: title over island vista, plane on runway.
  2-play: chase view banking toward the amber ring, beacon pillar, mountain
  + lake + town + runway, full HUD. 3-cockpit: nose view on final approach,
  runway dead ahead. 4-end: PERFECT LANDING results, score consistent
  with HUD (1602).

Deterministic flight-model test (Node, no rendering),
`test/test-flight-model.mjs` — ALL 9 CHECKS PASSED:
- Takeoff: airborne, speed 33.7 m/s, climbing to 120 m in 10 s sim.
- Banking 3 s turns heading 78.8°.
- Stall drops the nose (pitch 0.20 → −0.06).
- Gentle final approach lands on the runway (outcome `landed`, z=402).
- Steep dive into terrain crashes (outcome `crashed`).
- Ring crossing: through the hoop counts, a 40 m wide miss does not.

Entry program check: `MAKEFUN_OUTPUT_DIR=out node main.ts` run twice →
byte-identical outputs. Dossier: 15 source files (77,993 bytes, all inside
the 160 KiB text cap), 1 vendored file (three.module.min.js, 670,681
bytes), game/ 16 files / 748,674 bytes (caps: 993 files / 48 MiB).
index.html 10,788 bytes (cap 1 MiB). No `http(s)`, `fetch` or XHR
references in game source.

## Weaknesses found & fixed (revision rounds)

1. Takeoff impossible — ground branch zeroed pitch every step while the
   takeoff check required pitch > 4°. Fixed: pitch is kept on the ground;
   gravity along the flight path is 0 while rolling.
2. Landing alignment check was convoluted and wrong for south landings.
   Fixed: aligned when heading within 25° of 0° or 180°.
3. HUD speed/altitude updaters targeted the whole panel div and would
   have wiped the tapes. Fixed: they target the value spans.
4. Attitude ball rendered at the top-left corner (canvas had no
   `position: absolute`). Fixed in CSS.
5. Compass strip numbers ran together ("330345000015030"). Fixed: span
   margins.
6. Speed/altitude tapes showed negative values at standstill. Fixed:
   clamped at 0.
7. Clouds rendered dark olive (Lambert undersides + green hemisphere
   bounce). Fixed: unlit white MeshBasicMaterial.
8. Terrain was a beige beach pancake — most lowland sat at 0.4 m.
   Fixed: interior floor lifted (rolling 16±34 m hills), sand only at the
   rim, patchy grass colour variation. The island now reads green with a
   mountain, lake, town and runway.
9. Cover shot hid the plane behind the menu (3 framing attempts). Fixed:
   fixed-framing camera from above-behind; plane now sits clearly in the
   free band below the menu.
10. Beacon pillar showed on the title screen as a stray line. Fixed:
    beacon only while playing.
11. Results panel score (1602) disagreed with HUD score (1480). Fixed:
    time bonus is folded into the mission score in showResults.
12. Dive test hit the sea and reported "ditched" — correct behaviour,
    wrong test spot; test moved over land and now asserts `crashed`.

## Remaining weaknesses (honest)

- vs the known top entries (full 3D three.js, cockpit MFD, precision
  landing): our plane is low-poly primitives, not a detailed model; there
  is no cockpit interior in chase view (nose cam has a CSS frame only, no
  3D cockpit geometry); no engine sound beyond a procedural hum (no
  recorded audio); terrain is stylised flat-shaded colour bands, not
  textured; only 3 missions and one island; no wind, no weather, no
  multiplayer/AI traffic. The ring course is fixed per seed (same layout
  every run with seed 1).
- The judge compares screenshots pairwise: our strongest cards are the
  readable play shot (plane + ring + beacon + terrain + full HUD) and the
  complete mission structure. The weakest card is visual richness vs a
  photoreal-style entry — mitigated, not eliminated, by the clean
  golden-hour palette.
- SwiftShader headless runs at ~1.5 fps, so the live browser test proves
  takeoff only with a long poll; the deterministic Node model test is the
  stronger evidence for the flight model.
- Not yet done (main session's job): git init + commit, `makefun init`
  anchor, bundle, local check, submit. Kit files (`kit.tar.gz`,
  `best-flight-game-20261126-0057-kit/`) are listed in `.gitignore` and
  must NOT be committed.

