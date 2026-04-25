/**
 * scripts/convert_to_webp.mjs
 *
 * Converts ALL jpg / jpeg / png images in public/images/watches/ to WebP.
 * Run with: node scripts/convert_to_webp.mjs
 *
 * - Skips files that already have a .webp counterpart
 * - Uses sharp (already in package.json devDependencies) for conversion
 * - Keeps original files intact — you can delete them manually after verifying
 * - Also renames "photo_X_timestamp.ext" files to "X.ext" automatically
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watchesDir = path.join(__dirname, "..", "public", "images", "watches");

if (!fs.existsSync(watchesDir)) {
  console.error("❌ Directory not found:", watchesDir);
  process.exit(1);
}

const files = fs.readdirSync(watchesDir);
let converted = 0;
let skipped = 0;
let renamed = 0;

console.log(`\n📁 Processing ${files.length} files in:\n   ${watchesDir}\n`);

for (const originalFile of files) {
  let file = originalFile;
  const ext = path.extname(file).toLowerCase();
  let fullPath = path.join(watchesDir, file);

  // ── Step 1: Rename "photo_X_timestamp.ext" → "X.ext" ──
  const timestampMatch = file.match(/^photo_(\d+)_/);
  if (timestampMatch) {
    const num = timestampMatch[1];
    const newName = `${num}${ext}`;
    const newPath = path.join(watchesDir, newName);
    if (!fs.existsSync(newPath)) {
      fs.renameSync(fullPath, newPath);
      console.log(`🔄 Renamed: ${file}  →  ${newName}`);
      renamed++;
    }
    // Update references for next step
    file = newName;
    fullPath = newPath;
  }

  // ── Step 2: Convert JPG / PNG → WebP ──
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
    const baseName = path.basename(file, ext);
    const webpPath = path.join(watchesDir, `${baseName}.webp`);

    if (fs.existsSync(webpPath)) {
      console.log(`⏭  Skipped  (WebP exists): ${file}`);
      skipped++;
      continue;
    }

    try {
      await sharp(fullPath)
        .resize({ width: 800, height: 800, fit: "cover", position: "center" })
        .webp({ quality: 88 })
        .toFile(webpPath);
      console.log(`✅ Converted: ${file}  →  ${baseName}.webp`);
      converted++;
    } catch (err) {
      console.error(`❌ Failed to convert ${file}:`, err.message);
    }
  }
}

console.log(`
─────────────────────────────
  ✅ Converted : ${converted} files
  ⏭  Skipped   : ${skipped} files (already have .webp)
  🔄 Renamed   : ${renamed} files
─────────────────────────────
Done! Run "npm run dev" and check /admin to see your new models.
`);
