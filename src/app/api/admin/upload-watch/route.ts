import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { kv } from "@vercel/kv";

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
      // Auto-assign: find the next available ID from local and KV
      const localIds: number[] = [];
      if (fs.existsSync(watchesDir)) {
        const existingFiles = fs.readdirSync(watchesDir);
        existingFiles.forEach(f => {
          const n = parseInt(f.replace(/\.\w+$/, ""), 10);
          if (!isNaN(n)) localIds.push(n);
        });
      }
      
      const kvIds: number[] = [];
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
          const keys = await kv.keys("watch_img_*");
          keys.forEach(k => {
            const n = parseInt(k.replace("watch_img_", ""), 10);
            if (!isNaN(n)) kvIds.push(n);
          });
        } catch (e) {
          console.error("Failed to read KV keys for ID generation:", e);
        }
      }

      const allIds = [...localIds, ...kvIds];
      watchId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
    }

    // ── Convert to WebP using sharp ──
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const webpBuffer = await sharp(buffer)
      .resize({ width: 800, height: 800, fit: "cover", position: "center" })
      .webp({ quality: 88 })
      .toBuffer();

    // ── Save to KV or Local (Fallback) ──
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      // Production / KV Mode
      const base64String = webpBuffer.toString("base64");
      await kv.set(`watch_img_${watchId}`, base64String);
    } else {
      // Local Fallback
      const outputPath = path.join(watchesDir, `${watchId}.webp`);
      fs.writeFileSync(outputPath, webpBuffer);
    }

    return NextResponse.json({
      success: true,
      watchId,
      path: `/api/watches/${watchId}`,
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
    const { getAvailableWatchIds } = await import("@/lib/getConfig");
    const ids = await getAvailableWatchIds();
    return NextResponse.json({ success: true, ids });
  } catch (e) {
    console.error("[GET upload-watch] Error:", e);
    return NextResponse.json({ success: false, error: "Could not read watches directory" }, { status: 500 });
  }
}
