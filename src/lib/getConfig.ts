import { SiteConfig, DEFAULT_CONFIG } from "./site-config";

// ─────────────────────────────────────────────────────────
// getConfig — reads site settings
//
// Priority:
//   1. Vercel KV  (production — when KV env vars present)
//   2. Local JSON file  (local dev fallback)
//   3. Hardcoded defaults
//
// saveConfig — writes site settings (same priority)
// ─────────────────────────────────────────────────────────

const KV_KEY = "site-config";

function hasKv(): boolean {
  return !!(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

export async function getConfig(): Promise<SiteConfig> {
  // 1 — Vercel KV (production)
  if (hasKv()) {
    try {
      const { kv } = await import("@vercel/kv");
      const stored = await kv.get<SiteConfig>(KV_KEY);
      if (stored) return { ...DEFAULT_CONFIG, ...stored };
    } catch (e) {
      console.error("[getConfig] KV read failed:", e);
    }
  }

  // 2 — Local JSON (dev)
  try {
    const { default: fs } = await import("fs");
    const { default: path } = await import("path");
    const filePath = path.join(
      process.cwd(),
      "src",
      "app",
      "data",
      "site-config.json"
    );
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("[getConfig] Local JSON read failed:", e);
  }

  // 3 — Hardcoded defaults
  return DEFAULT_CONFIG;
}

export async function saveConfig(newConfig: SiteConfig): Promise<void> {
  // 1 — Vercel KV (production)
  if (hasKv()) {
    try {
      const { kv } = await import("@vercel/kv");
      await kv.set(KV_KEY, newConfig);
      return;
    } catch (e) {
      console.error("[saveConfig] KV write failed:", e);
      throw new Error("فشل حفظ الإعدادات في KV");
    }
  }

  // 2 — Local JSON (dev)
  try {
    const { default: fs } = await import("fs");
    const { default: path } = await import("path");
    const filePath = path.join(
      process.cwd(),
      "src",
      "app",
      "data",
      "site-config.json"
    );
    fs.writeFileSync(filePath, JSON.stringify(newConfig, null, 2), "utf-8");
  } catch (e) {
    console.error("[saveConfig] Local JSON write failed:", e);
    throw new Error("فشل حفظ الإعدادات محلياً");
  }
}

/** Returns a sorted list of watch image IDs found in public/images/watches/ */
export async function getAvailableWatchIds(): Promise<number[]> {
  try {
    const { default: fs } = await import("fs");
    const { default: path } = await import("path");
    const dir = path.join(process.cwd(), "public", "images", "watches");
    const files = fs.readdirSync(dir);
    const ids = [
      ...new Set(
        files
          .map((f) => parseInt(f.replace(/\.\w+$/, ""), 10))
          .filter((n) => !isNaN(n))
      ),
    ].sort((a, b) => a - b);
    return ids;
  } catch {
    return DEFAULT_CONFIG.watchIds;
  }
}
