"use server";

import { revalidatePath } from "next/cache";
import { getConfig, saveConfig, getAvailableWatchIds } from "@/lib/getConfig";
import { SiteConfig } from "@/lib/site-config";

// ─────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────
export async function verifyAdminPassword(
  password: string
): Promise<{ ok: boolean }> {
  const adminPw = process.env.ADMIN_PASSWORD || "admin123";
  return { ok: password === adminPw };
}

// ─────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────
export async function loadSiteConfig(): Promise<SiteConfig> {
  return getConfig();
}

export async function loadAvailableWatchIds(): Promise<number[]> {
  return getAvailableWatchIds();
}

// ─────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────
export async function updateSiteConfig(
  newConfig: SiteConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    // ── Validate ──
    if (!newConfig.title?.trim())
      return { success: false, error: "العنوان الرئيسي مطلوب" };
    if (!newConfig.subtitle?.trim())
      return { success: false, error: "العنوان الفرعي مطلوب" };
    if (!newConfig.description?.trim())
      return { success: false, error: "وصف المنتج مطلوب" };
    if (newConfig.price <= 0)
      return { success: false, error: "السعر يجب أن يكون أكبر من صفر" };
    if (newConfig.oldPrice <= 0)
      return { success: false, error: "السعر القديم يجب أن يكون أكبر من صفر" };
    if (newConfig.deliveryCostDesk < 0 || newConfig.deliveryCostHome < 0)
      return { success: false, error: "تكاليف التوصيل لا يمكن أن تكون سالبة" };
    if (!Array.isArray(newConfig.watchIds) || newConfig.watchIds.length === 0)
      return { success: false, error: "يجب تفعيل موديل واحد على الأقل" };

    await saveConfig(newConfig);

    // Revalidate landing page so changes are instant
    revalidatePath("/");

    return { success: true };
  } catch (e) {
    console.error("[updateSiteConfig] Error:", e);
    return { success: false, error: "حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى." };
  }
}

// ─────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────
export async function deleteWatchModel(
  id: number,
  adminPw: string
): Promise<{ success: boolean; error?: string }> {
  const envPw = process.env.ADMIN_PASSWORD || "admin123";
  if (adminPw !== envPw) {
    return { success: false, error: "غير مصرح لك" };
  }

  try {
    const fs = await import("fs");
    const path = await import("path");
    const watchesDir = path.default.join(process.cwd(), "public", "images", "watches");
    
    // Delete the image files (.webp, .jpg, .png)
    const exts = [".webp", ".jpg", ".jpeg", ".png"];
    let deletedFiles = false;
    for (const ext of exts) {
      const filePath = path.default.join(watchesDir, `${id}${ext}`);
      if (fs.default.existsSync(filePath)) {
        fs.default.unlinkSync(filePath);
        deletedFiles = true;
      }
    }

    // Delete from KV if it exists there
    let deletedFromKv = false;
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import("@vercel/kv");
      const deleted = await kv.del(`watch_img_${id}`);
      if (deleted > 0) deletedFromKv = true;
    }

    if (!deletedFiles && !deletedFromKv) {
       // It might be okay if it doesn't exist, we still want to clean it up
    }

    // Also remove the ID from the active configuration
    const currentConfig = await getConfig();
    if (currentConfig.watchIds.includes(id)) {
      currentConfig.watchIds = currentConfig.watchIds.filter((x) => x !== id);
      await saveConfig(currentConfig);
      revalidatePath("/");
    }

    return { success: true };
  } catch (e) {
    console.error("[deleteWatchModel] Error:", e);
    return { success: false, error: "حدث خطأ أثناء الحذف." };
  }
}
