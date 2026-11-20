import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceDirectory = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const screenshotsSource = join(sourceDirectory, 'screenshots');
const screenshotsOutput = join(outputDirectory, 'screenshots');

// Stage the static entry and optional captures before building the dossier,
// which reads both directories from the output tree.
mkdirSync(outputDirectory, { recursive: true });
cpSync(join(sourceDirectory, 'game'), join(outputDirectory, 'game'), { recursive: true });
mkdirSync(screenshotsOutput, { recursive: true });
if (existsSync(screenshotsSource)) {
  cpSync(screenshotsSource, screenshotsOutput, { recursive: true });
}

const dossier = buildDossier(outputDirectory, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDirectory, 'dossier.json'), dossier);
console.log(`Tidebreak files and dossier written to ${outputDirectory}`);
