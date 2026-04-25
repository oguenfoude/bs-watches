import fs from 'fs';
import path from 'path';

const watchesDir = path.join(process.cwd(), 'public', 'images', 'watches');

// Read all files in the directory
const files = fs.readdirSync(watchesDir);

console.log(`Starting renaming process for ${files.length} files...`);

let renameCount = 0;

for (const file of files) {
  // We're looking for files like "photo_1_2026-04-25_11-10-17.webp"
  // or just general names we want to clean up if needed.
  // The user's files are named e.g. "photo_10_2026-04-25_11-10-17.jpg"
  
  const match = file.match(/^photo_(\d+)_/);
  
  if (match) {
    const num = match[1];
    const ext = path.extname(file);
    const newName = `${num}${ext}`;
    
    // Check if the old and new name are the same, skip if so
    if (file !== newName) {
      const oldPath = path.join(watchesDir, file);
      const newPath = path.join(watchesDir, newName);
      
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`[SUCCESS] Renamed: ${file}  ->  ${newName}`);
        renameCount++;
      } catch (err) {
        console.error(`[ERROR] Failed to rename ${file}:`, err);
      }
    }
  } else {
    // Check if it already matches (\d+)\.(jpg|webp|png)
    const exactMatch = file.match(/^\d+\.(jpg|webp|png|jpeg)$/i);
    if (!exactMatch) {
      console.log(`[SKIPPED] Doesn't match expected pattern: ${file}`);
    }
  }
}

console.log(`\nProcess completed. Successfully renamed ${renameCount} files.`);
