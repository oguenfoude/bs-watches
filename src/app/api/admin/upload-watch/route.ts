import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// ─────────────────────────────────────────────────────────────
// POST /api/admin/upload-watch
// Accepts a multipart image upload, converts to WebP via sharp,
// saves as the next sequential ID in /public/images/watches/.
//
// Requires x-admin-password header matching ADMIN_PASSWORD env var.
// ─────────────────────────────────────────────────────────────

export const runtime = "nodejs"; // Need Node runtime for fs + sharp

export async function POST(request: NextRequest) {
  // ── Auth ──
  const pw = request.headers.get("x-admin-password") ?? "";
  const adminPw = process.env.ADMIN_PASSWORD ?? "admin123";
  if (pw !== adminPw) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const customIdRaw = formData.get("customId") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No image file provided" }, { status: 400 });
    }

    // Only accept images
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "File must be an image (JPG, PNG, or WebP)" },
        { status: 400 },
      );
    }

    const watchesDir = path.join(process.cwd(), "public", "images", "watches");

    // Ensure directory exists
    if (!fs.existsSync(watchesDir)) {
      fs.mkdirSync(watchesDir, { recursive: true });
    }

    // ── Determine the ID to use ──
    let watchId: number;
    if (customIdRaw && !isNaN(parseInt(customIdRaw, 10))) {
      watchId = parseInt(customIdRaw, 10);
    } else {
      // Auto-assign: find the next available ID
      const existingFiles = fs.readdirSync(watchesDir);
      const existingIds = existingFiles
        .map((f) => parseInt(f.replace(/\.\w+$/, ""), 10))
        .filter((n) => !isNaN(n) && n > 0);
      watchId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    }

    const outputPath = path.join(watchesDir, `${watchId}.webp`);

    // ── Convert to WebP using sharp (already in package.json) ──
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { default: sharp } = await import("sharp");
    await sharp(buffer)
      .resize({ width: 800, height: 800, fit: "cover", position: "center" })
      .webp({ quality: 88 })
      .toFile(outputPath);

    return NextResponse.json({
      success: true,
      watchId,
      path: `/images/watches/${watchId}.webp`,
      message: `موديل ${watchId} تم حفظه بنجاح`,
    });
  } catch (error) {
    console.error("[upload-watch] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process image. Make sure the file is a valid image." },
      { status: 500 },
    );
  }
}

// List currently available watch image IDs
export async function GET(request: NextRequest) {
  const pw = request.headers.get("x-admin-password") ?? "";
  const adminPw = process.env.ADMIN_PASSWORD ?? "admin123";
  if (pw !== adminPw) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const watchesDir = path.join(process.cwd(), "public", "images", "watches");
    const files = fs.readdirSync(watchesDir);
    const ids = [
      ...new Set(
        files
          .map((f) => parseInt(f.replace(/\.\w+$/, ""), 10))
          .filter((n) => !isNaN(n) && n > 0),
      ),
    ].sort((a, b) => a - b);

    return NextResponse.json({ success: true, ids });
  } catch {
    return NextResponse.json({ success: false, error: "Could not read watches directory" }, { status: 500 });
  }
}
