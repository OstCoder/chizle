// CLI validator for the test fixtures in /public/test-faces.
//
// Runs the *analytical* code paths of the pipeline \u2014 image quality, lighting,
// weakspot generation, summary text \u2014 without loading MediaPipe. Good for fast
// offline iteration on ranges and thresholds.
//
// Real-face fixtures (expected.hasFace === true) need MediaPipe to verify
// the face-detection assertion; CLI prints [SKIP] for that assertion and
// tells you to run /test-gallery in the browser instead. The full
// assessImageQuality output is printed regardless so you can see exactly
// what the photo is missing ("Image is too dark", "Lighting is uneven
// across the face", \u2026). Each issue is followed by an actionable fix
// borrowed from lib/diagnostics.

import sharp from "sharp";
import { resolve as pathResolve } from "node:path";
import { testGallery } from "../data/test-gallery";
import { computeLightQuality, assessImageQuality } from "../lib/imageQuality";
import { analyze } from "../lib/analysis";
import { tipsForReason } from "../lib/diagnostics";

const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

// Duck-typed ImageData in Node (no DOM ImageData constructor available).
// Sets up just enough of the shape so lib/imageQuality and lib/analysis accept it.
function makeImageData(
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
): ImageData {
  return { data: pixels, width, height, colorSpace: "srgb" } as unknown as ImageData;
}

async function main() {
  let pass = 0;
  let fail = 0;
  let skip = 0;

  // Heads-up banner when real-face fixtures are in the gallery: this run
  // intentionally cannot verify hasFace=true. The user is told where to go
  // for a real verification, instead of silently marking them as FAIL.
  const realFaceFixtures = testGallery.fixtures.filter(
    (f) => f.expected.hasFace,
  );
  if (realFaceFixtures.length > 0) {
    process.stdout.write(
      `\n${C.yellow}note${C.reset}: ${realFaceFixtures.length} fixture${realFaceFixtures.length === 1 ? "" : "s"} declare hasFace: true. ` +
        `This CLI runs analytical pipelines only and cannot trigger MediaPipe. ` +
        `hasFace will be marked [SKIP]; the lighting, contrast, sharpness, and weakspot assertions still run. ` +
        `Visit /test-gallery in a browser to verify face detection.\n`,
    );
  }

  for (const fixture of testGallery.fixtures) {
    process.stdout.write(
      `\n${C.dim}== ${fixture.name} (${fixture.id}) ==${C.reset}\n`,
    );
    process.stdout.write(
      `  ${C.dim}image: ${fixture.image}${C.reset}\n`,
    );

    const rel =
      fixture.image.startsWith("/") ? fixture.image.slice(1) : fixture.image;
    const imagePath = pathResolve(process.cwd(), "public", rel);

    // Resize so the longest side is 1024 px using nearest-neighbour sampling.
    // This matches the browser pipeline's effective behaviour: lib/imageData.ts
    // uses canvas with `imageSmoothingEnabled = false` and the same 1024 max
    // dimension. Without this resize, the CLI reads native-resolution pixels
    // (full JPEG blockiness preserved) while the browser reads downscaled
    // pixels, which amplified the Laplacian-variance sharpness metric ~2-6x
    // on real photos and broke cross-pipeline agreement.
    const raw = await sharp(imagePath)
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        kernel: "nearest",
      })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(
      raw.data.buffer,
      raw.data.byteOffset,
      raw.data.byteLength,
    );
    const imageData = makeImageData(raw.info.width, raw.info.height, pixels);

    const light = computeLightQuality(imageData);
    const checks = assessImageQuality(imageData, false);
    const report = analyze(null, imageData);

    let ok = true;
    let skippedHasFace = false;

    // ---- hasFace check (CLI cannot run MediaPipe) ----
    if (fixture.expected.hasFace) {
      process.stdout.write(
        `  ${C.yellow}SKIP${C.reset} hasFace: could not run MediaPipe (browser-only). Upload via /test-gallery to verify.\n`,
      );
      skippedHasFace = true;
    } else {
      const actualHasFace = report.ratios.faceLength > 0;
      const expHasFace = false;
      if (actualHasFace !== expHasFace) {
        process.stdout.write(
          `  ${C.red}\u2717${C.reset} hasFace: expected ${expHasFace}, got ${actualHasFace}\n`,
        );
        ok = false;
      } else {
        process.stdout.write(
          `  ${C.green}\u2713${C.reset} hasFace: ${String(actualHasFace)}\n`,
        );
      }
    }

    // ---- light assertions ----
    if (fixture.expected.light) {
      const L = fixture.expected.light;
      ok =
        checkRange(
          "light.brightness",
          light.brightness,
          L.brightness,
        ) && ok;
      ok =
        checkRange("light.contrast", light.contrast, L.contrast) && ok;
      ok =
        checkRange("light.evenness", light.evenness, L.evenness) && ok;
      ok =
        checkRange("light.sharpness", light.sharpness, L.sharpness) && ok;
    }

    // ---- weakspotCount ----
    if (fixture.expected.weakspotCount) {
      const [min, max] = fixture.expected.weakspotCount;
      const n = report.weakspots.length;
      const inRange = n >= min && n <= max;
      process.stdout.write(
        `  ${
          inRange ? `${C.green}\u2713${C.reset}` : `${C.red}\u2717${C.reset}`
        } weakspotCount: ${n} ${inRange ? "\u2208" : "\u2209"} [${min}, ${max}]\n`,
      );
      if (!inRange) ok = false;
    }

    // ---- image-quality assessment (always print, regardless of fixture type) ----
    const qualityColor =
      checks.quality === "good"
        ? C.green
        : checks.quality === "ok"
          ? C.yellow
          : C.red;
    const qIcon =
      checks.quality === "good" || checks.quality === "ok"
        ? "\u2713"
        : "\u2717";
    process.stdout.write(
      `  ${qualityColor}${qIcon}${C.reset} imageQuality: ${C.cyan}${checks.quality}${C.reset}` +
        (checks.reason ? ` \u2014 ${checks.reason}` : "") +
        "\n",
    );

    const tips = tipsForReason(checks.reason);
    for (const tip of tips) {
      process.stdout.write(
        `      ${C.dim}\u2192 ${tip}${C.reset}\n`,
      );
    }

    if (report.summary) {
      const summary =
        report.summary.length > 110
          ? report.summary.slice(0, 110) + "\u2026"
          : report.summary;
      process.stdout.write(
        `  ${C.dim}summary: ${summary}${C.reset}\n`,
      );
    }

    if (ok && !skippedHasFace) {
      process.stdout.write(`  ${C.green}PASS${C.reset}\n`);
      pass++;
    } else if (ok && skippedHasFace) {
      process.stdout.write(`  ${C.green}PASS${C.reset} (hasFace skipped)\n`);
      pass++;
      skip++;
    } else {
      process.stdout.write(
        skippedHasFace
          ? `  ${C.red}FAIL${C.reset} (hasFace skipped, other assertions ran)\n`
          : `  ${C.red}FAIL${C.reset}\n`,
      );
      fail++;
    }
  }

  process.stdout.write(`\n${C.dim}== Summary ==${C.reset}\n`);
  process.stdout.write(`  ${C.green}pass${C.reset}: ${pass}\n`);
  process.stdout.write(`  ${C.red}fail${C.reset}: ${fail}\n`);
  if (skip > 0) {
    process.stdout.write(`  ${C.yellow}skip${C.reset}: ${skip}\n`);
  }
  process.stdout.write(
    `  total: ${testGallery.fixtures.length}\n`,
  );

  if (fail > 0) process.exit(1);
}

function checkRange(
  label: string,
  actual: number,
  range: [number, number] | undefined,
): boolean {
  if (!range) return true;
  const ok = actual >= range[0] && actual <= range[1];
  process.stdout.write(
    `  ${ok ? `${C.green}\u2713${C.reset}` : `${C.red}\u2717${C.reset}`} ${label}: ${actual.toFixed(2)} ${
      ok ? "\u2208" : "\u2209"
    } [${range[0]}, ${range[1]}]\n`,
  );
  return ok;
}

void main();
