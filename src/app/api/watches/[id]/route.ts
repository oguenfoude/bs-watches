import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Clean up the ID to ensure it's just a number (e.g. remove .webp if someone appended it)
  const cleanId = id.replace(/\.\w+$/, "");

  // 1. Check if the image exists in Vercel KV (custom uploaded)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const base64Data = await kv.get<string>(`watch_img_${cleanId}`);
      if (base64Data) {
        const buffer = Buffer.from(base64Data, "base64");
        
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (e) {
      console.error(`[Image Fetch] Failed to fetch image ${cleanId} from KV:`, e);
    }
  }

  // 2. Fallback to local file system (default images)
  try {
    const filePath = path.join(process.cwd(), "public", "images", "watches", `${cleanId}.webp`);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        },
      });
    }
  } catch (e) {
    console.error(`[Image Fetch] Failed to fetch image ${cleanId} from fs:`, e);
  }

  // 3. Image not found
  return new NextResponse("Image Not Found", { status: 404 });
}
