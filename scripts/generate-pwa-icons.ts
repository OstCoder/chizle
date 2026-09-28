// Generates the PWA icon set in public/icons from the Chizle glyph.
//
// Run with: npm run icons   (uses the devDependency `sharp`)
//
// The glyph is the one from public/favicon.svg, authored on a 32×32 grid and
// scaled up. Four outputs cover the manifest + platform needs:
//   icon-192.png / icon-512.png  — standard install icons (rounded corners)
//   maskable-512.png             — full-bleed, glyph inside the safe zone
//   apple-touch-icon.png         — iOS home screen (full-bleed, iOS rounds)

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUT_DIR = join(process.cwd(), "public", "icons");
const BG = "#0c0d13"; // matches public/favicon.svg
const ACCENT = "#f97316";

const GLYPH = `
  <path d="M9 22c0-4.5 3-7 7-7s7 2.5 7 7" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="12" cy="13" r="1.5" fill="${ACCENT}"/>
  <circle cx="20" cy="13" r="1.5" fill="${ACCENT}"/>
  <path d="M16 4v4" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round"/>
`;

function iconSvg(size: number, radius: number, contentRatio: number): string {
  const content = size * contentRatio;
  const scale = content / 32;
  const offset = (size - content) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale.toFixed(4)})">${GLYPH}</g>
  </svg>`;
}

async function write(
  name: string,
  size: number,
  radius: number,
  contentRatio: number,
): Promise<void> {
  const svg = Buffer.from(iconSvg(size, radius, contentRatio));
  await sharp(svg).png().toFile(join(OUT_DIR, name));
  console.log(`✓ public/icons/${name} (${size}×${size})`);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await write("icon-192.png", 192, 42, 0.66);
  await write("icon-512.png", 512, 112, 0.66);
  // Maskable: the OS crops to a circle at 80% — keep background full-bleed
  // and the glyph comfortably inside the safe zone.
  await write("maskable-512.png", 512, 0, 0.5);
  await write("apple-touch-icon.png", 180, 0, 0.56);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
