import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

const dossierPath = join(out, 'dossier.json');
const dossierRaw = readFileSync(dossierPath);
const dossier = JSON.parse(dossierRaw.toString('utf8'));

if (!Array.isArray(dossier.images) || dossier.images.length === 0) {
  throw new Error('dossier.json has no images');
}
if (!dossier.text || dossier.text.length === 0) {
  throw new Error('dossier.json has no text');
}
if (!existsSync(join(out, 'app', 'index.html'))) {
  throw new Error('copied app/index.html is missing from output directory');
}

console.log(`Dossier written to ${dossierPath}: ${dossierRaw.length} bytes, ${dossier.images.length} images`);

for (const shot of ['1-checklist.jpg', '2-guide.jpg', '3-roadmap.jpg', '4-spoiler.jpg']) {
  if (!existsSync(join(out, 'screenshots', shot))) {
    throw new Error(`screenshot ${shot} missing from output directory`);
  }
}
console.log('All 4 screenshots present in output');

const trophiesPath = join(out, 'app', 'data', 'trophies.json');
const trophiesData = JSON.parse(readFileSync(trophiesPath, 'utf8'));
const trophies = trophiesData.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  throw new Error('trophies.json must list 55 trophies');
}
console.log('Trophy data verified: 55 trophies');
