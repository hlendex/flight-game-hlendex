// AERORIDGE — entry program for make.fun best-flight-game-20261126-0057.
// Node 22, standard library only; nothing is installed before it runs.
//
// The job is small and must be exact: copy the finished game (game/) and the
// screenshots (screenshots/) from this repository into the directory the
// grader gives us, then write /output/dossier.json with make.fun's vendored
// library, which describes those exact bytes for the judge.
//
// Determinism matters: the grader runs this program twice in fresh
// containers with no network, and both runs must write identical bytes. So
// there are no timestamps, no random numbers, no reads from outside this
// repository — just plain copies of files that already exist, in a fixed
// order, plus the dossier the library computes from them.
//
// Test it locally (MAKEFUN_OUTPUT_DIR stands in for /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// This file's directory is the repository root.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// The grader wants /output; the env var is the local stand-in.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, from the competition's own reference data: the dossier
// text is capped at 160 KiB; at most 4 screenshots of 256 KiB each; game/
// holds at most 993 files and 48 MiB in all, and no path under it is longer
// than 1000 bytes. Everything is copied as-is, so staying inside the caps
// is the game's own job — this program only refuses to invent files.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// The game: static files only — index.html, its ES modules and the vendored
// three.js build. Nothing here is fetched or generated at hand-in time.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

// The screenshots: real renders of the game's own code, first by name is the
// cover image the judge sees largest.
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier is computed from exactly what was just copied, so it always
// describes the bytes that are actually handed in.
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, LIMITS));
