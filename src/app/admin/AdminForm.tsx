"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import {
  verifyAdminPassword,
  loadSiteConfig,
  loadAvailableWatchIds,
  updateSiteConfig,
  deleteWatchModel,
} from "./actions";
import type { SiteConfig } from "@/lib/site-config";
import {
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Settings,
  DollarSign,
  AlignJustify,
  Loader2,
  Upload,
  ImagePlus,
  ExternalLink,
  RefreshCw,
  X,
  Trash2,
} from "lucide-react";

// ─────────────────────────────────────────────
// SHARED UI HELPERS
// ─────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-700" />
        </div>
        <h2 className="font-bold text-slate-800 text-sm flex-1">{title}</h2>
        {badge !== undefined && (
          <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="rtl"
      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all placeholder:text-slate-400"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder={placeholder}
      dir="rtl"
      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all placeholder:text-slate-400 resize-none"
    />
  );
}

function PriceInput({
  value,
  onChange,
  label,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 font-semibold mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-14 text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all font-bold"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
          دج
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WATCH ROW
// ─────────────────────────────────────────────
function WatchRow({
  id,
  index,
  total,
  enabled,
  onMoveUp,
  onMoveDown,
  onToggle,
  onDelete,
}: {
  id: number;
  index: number;
  total: number;
  enabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
        enabled
          ? "bg-white border-slate-200 hover:border-amber-200 shadow-sm"
          : "bg-slate-50/60 border-dashed border-slate-200 opacity-60"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/watches/${id}.webp`}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm">موديل {id}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {enabled ? `#${index + 1} في الكاروسيل` : "مخفي عن الزبائن"}
        </p>
      </div>

      {/* Move arrows (enabled only) */}
      {enabled && (
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-amber-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-amber-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onDelete}
          title="حذف الموديل نهائياً"
          className="w-9 h-9 rounded-xl flex items-center justify-center border-2 border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Toggle eye button */}
        <button
          onClick={onToggle}
          title={enabled ? "إخفاء الموديل" : "إظهار الموديل"}
          className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
            enabled
              ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-slate-50 hover:border-slate-200 hover:text-slate-500"
              : "bg-white border-slate-200 text-slate-400 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
          }`}
        >
          {enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// IMAGE UPLOADER COMPONENT
// ─────────────────────────────────────────────
function ImageUploader({
  adminPw,
  onUploaded,
}: {
  adminPw: string;
  onUploaded: (id: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadedId, setUploadedId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setUploadState("idle");
    setUploadedId(null);
    setErrorMsg("");
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("يرجى اختيار ملف صورة (JPG، PNG، أو WebP)");
      return;
    }
    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setSelectedFile(file);
    setUploadState("idle");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadState("uploading");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/admin/upload-watch", {
        method: "POST",
        headers: { "x-admin-password": adminPw },
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        setUploadedId(result.watchId);
        setUploadState("done");
        onUploaded(result.watchId);
      } else {
        setErrorMsg(result.error || "فشل الرفع");
        setUploadState("error");
      }
    } catch {
      setErrorMsg("فشل الاتصال بالخادم");
      setUploadState("error");
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center p-6 ${
          dragOver
            ? "border-amber-400 bg-amber-50"
            : preview
            ? "border-slate-200 bg-slate-50"
            : "border-slate-300 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/30"
        }`}
        style={{ minHeight: 140 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {preview ? (
          <div className="flex items-center gap-4 w-full">
            {/* Preview thumbnail */}
            <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-slate-800 text-sm">{selectedFile?.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                  : ""}
              </p>
              <p className="text-xs text-amber-600 mt-2 font-semibold">
                سيتم تحويله لـ WebP تلقائياً ✓
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">
                اسحب صورة هنا أو انقر للاختيار
              </p>
              <p className="text-xs text-slate-400 mt-1">JPG، PNG، أو WebP — يتم تحويله لـ WebP تلقائياً</p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Done state */}
      {uploadState === "done" && uploadedId !== null && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">تم رفع موديل {uploadedId} بنجاح! ✅</p>
            <p className="text-xs opacity-80 mt-0.5">تم إضافته في قسم الموديلات أدناه — انقر "حفظ" لتفعيله على الموقع</p>
          </div>
          <button onClick={reset} className="text-emerald-500 hover:text-emerald-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action buttons */}
      {preview && uploadState !== "done" && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploadState === "uploading"}
            className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {uploadState === "uploading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الرفع والتحويل...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                رفع الصورة
              </>
            )}
          </button>
          <button
            onClick={reset}
            disabled={uploadState === "uploading"}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-sm font-semibold"
          >
            إلغاء
          </button>
        </div>
      )}

      {!preview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 font-semibold mb-1">💡 طريقة بديلة (سريعة)</p>
          <p className="text-xs text-amber-600">
            ضع ملفات الصور في <code className="bg-amber-100 px-1 py-0.5 rounded">public/images/watches/</code> ثم شغّل:
          </p>
          <code className="block mt-1.5 text-xs bg-amber-100 text-amber-800 px-3 py-2 rounded-lg font-mono">
            node scripts/convert_to_webp.mjs
          </code>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PASSWORD GATE
// ─────────────────────────────────────────────
function PasswordGate({
  onUnlock,
}: {
  onUnlock: (pw: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { ok } = await verifyAdminPassword(pw);
    setLoading(false);
    if (ok) {
      sessionStorage.setItem("admin_session", "true");
      sessionStorage.setItem("admin_pw", pw); // store for API calls
      onUnlock(pw);
    } else {
      setError("كلمة المرور غير صحيحة");
      setPw("");
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">لوحة التحكم</h1>
          <p className="text-slate-400 text-sm mt-1">BS Monters — Admin</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="كلمة المرور"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all placeholder:text-white/40 pr-4 pl-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-white/30 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> جاري التحقق...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> دخول
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN ADMIN FORM
// ─────────────────────────────────────────────
export default function AdminForm() {
  const [unlocked, setUnlocked] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [availableIds, setAvailableIds] = useState<number[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [, startTransition] = useTransition();

  // Restore session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = sessionStorage.getItem("admin_session") === "true";
      const pw = sessionStorage.getItem("admin_pw") ?? "";
      if (session && pw) {
        setUnlocked(true);
        setAdminPw(pw);
      }
    }
  }, []);

  // Load config + watch list
  useEffect(() => {
    if (!unlocked) return;
    loadSiteConfig().then(setConfig);
    loadAvailableWatchIds().then(setAvailableIds);
  }, [unlocked, refreshKey]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_session");
    sessionStorage.removeItem("admin_pw");
    setUnlocked(false);
    setAdminPw("");
  };

  const handleSave = () => {
    if (!config) return;
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await updateSiteConfig(config);
      if (result.success) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 5000);
      } else {
        setErrorMsg(result.error || "حدث خطأ");
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 6000);
      }
    });
  };

  const refreshWatches = () => setRefreshKey((k) => k + 1);

  // Watch helpers
  const moveUp = useCallback(
    (index: number) => {
      setConfig((c) => {
        if (!c || index === 0) return c;
        const ids = [...c.watchIds];
        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
        return { ...c, watchIds: ids };
      });
    },
    [],
  );

  const moveDown = useCallback(
    (index: number) => {
      setConfig((c) => {
        if (!c || index === c.watchIds.length - 1) return c;
        const ids = [...c.watchIds];
        [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
        return { ...c, watchIds: ids };
      });
    },
    [],
  );

  const toggleWatch = useCallback((id: number) => {
    setConfig((c) => {
      if (!c) return c;
      const enabled = c.watchIds.includes(id);
      if (enabled && c.watchIds.length <= 1) return c; // keep at least 1
      return {
        ...c,
        watchIds: enabled
          ? c.watchIds.filter((x) => x !== id)
          : [...c.watchIds, id],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  };

  const handleImageUploaded = (id: number) => {
    refreshWatches();
    // Auto-enable the newly uploaded watch
    setConfig((c) => {
      if (!c || c.watchIds.includes(id)) return c;
      return { ...c, watchIds: [...c.watchIds, id] };
    });
  };

  const handleDeleteWatch = (id: number) => {
    if (!window.confirm("متأكد من حذف هذا الموديل نهائياً والصورة الخاصة به؟")) return;
    
    startTransition(async () => {
      const result = await deleteWatchModel(id, adminPw);
      if (result.success) {
        setAvailableIds((prev) => prev.filter((x) => x !== id));
        setConfig((c) => c && { ...c, watchIds: c.watchIds.filter((x) => x !== id) });
      } else {
        setErrorMsg(result.error || "فشل الحذف");
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 5000);
      }
    });
  };

  // ── Gates ──
  if (!unlocked)
    return (
      <PasswordGate
        onUnlock={(pw) => {
          setAdminPw(pw);
          setUnlocked(true);
        }}
      />
    );

  if (!config) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  const enabledIds = config.watchIds;
  const disabledIds = availableIds.filter((id) => !enabledIds.includes(id));

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f6fa]">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow shadow-amber-200">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm leading-none">لوحة التحكم</p>
              <p className="text-xs text-slate-400 mt-0.5">BS Monters</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-600 transition-colors px-3 py-2 rounded-lg hover:bg-amber-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              عرض الموقع
            </a>
            <button
              onClick={refreshWatches}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5 pb-28">

        {/* ── SAVE STATUS TOASTS ── */}
        {saveStatus === "success" && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-emerald-700 shadow-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">تم الحفظ بنجاح ✅</p>
              <p className="text-xs opacity-80 mt-0.5">الصفحة الرئيسية تحدّثت فوراً — يمكنك التحقق الآن</p>
            </div>
          </div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">فشل الحفظ ❌</p>
              <p className="text-xs opacity-80 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ── SECTION 1: Text Content ── */}
        <Section title="النصوص والمحتوى" icon={AlignJustify}>
          <Field label="العنوان الرئيسي للمنتج">
            <TextInput
              value={config.title}
              onChange={(v) => updateField("title", v)}
              placeholder="بوكس الفخامة"
            />
          </Field>
          <Field label="السطر الأعلى (Tagline)">
            <TextInput
              value={config.subtitle}
              onChange={(v) => updateField("subtitle", v)}
              placeholder="الأكثر مبيعاً في الجزائر"
            />
          </Field>
          <Field label="وصف المنتج" hint="يظهر تحت العنوان الرئيسي مباشرة">
            <TextArea
              value={config.description}
              onChange={(v) => updateField("description", v)}
              placeholder="10 موديل حصري — ساعة + طقم إكسسوارات + توصيل لباب بيتك."
            />
          </Field>
          <Field label="نص شارة الخصم" hint='مثال: "خصم 25%" — يظهر على صورة المنتج وبجانب السعر'>
            <TextInput
              value={config.discountBadge}
              onChange={(v) => updateField("discountBadge", v)}
              placeholder="خصم 25%"
            />
          </Field>
        </Section>

        {/* ── SECTION 2: Pricing ── */}
        <Section title="الأسعار والتوصيل" icon={DollarSign}>
          <div className="grid grid-cols-2 gap-4">
            <PriceInput
              value={config.price}
              onChange={(v) => updateField("price", v)}
              label="سعر البيع الحالي"
              min={1}
            />
            <PriceInput
              value={config.oldPrice}
              onChange={(v) => updateField("oldPrice", v)}
              label="السعر المشطوب"
              min={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="col-span-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                تكاليف التوصيل
              </p>
            </div>
            <PriceInput
              value={config.deliveryCostDesk}
              onChange={(v) => updateField("deliveryCostDesk", v)}
              label="🏢 للمكتب (Stop Desk)"
              min={0}
            />
            <PriceInput
              value={config.deliveryCostHome}
              onChange={(v) => updateField("deliveryCostHome", v)}
              label="🏠 للمنزل (Home)"
              min={0}
            />
          </div>

          {/* Live price preview */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white">
            <p className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-wide">معاينة</p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-extrabold text-red-400">
                {config.price.toLocaleString("ar-DZ")} د.ج
              </span>
              <span className="text-lg text-slate-500 line-through">
                {config.oldPrice.toLocaleString("ar-DZ")} د.ج
              </span>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {config.discountBadge}
              </span>
            </div>
            <div className="flex gap-3 mt-3 text-sm">
              <span className="text-slate-300">🏢 +{config.deliveryCostDesk.toLocaleString()} دج</span>
              <span className="text-slate-300">🏠 +{config.deliveryCostHome.toLocaleString()} دج</span>
            </div>
          </div>
        </Section>

        {/* ── SECTION 3: Upload New Watch ── */}
        <Section title="إضافة موديل جديد" icon={ImagePlus}>
          <ImageUploader adminPw={adminPw} onUploaded={handleImageUploaded} />
        </Section>

        {/* ── SECTION 4: Watch Models ── */}
        <Section
          title="إدارة الموديلات"
          icon={Eye}
          badge={`${enabledIds.length} / ${availableIds.length}`}
        >
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <span className="font-semibold">مرر فوق الموديل</span> لظهور أزرار التحريك ↑ ↓.
            اضغط 👁 للإخفاء/الإظهار. الترتيب هنا = الترتيب في الكاروسيل.
          </p>

          {/* Enabled */}
          {enabledIds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                ظاهر ({enabledIds.length})
              </p>
              {enabledIds.map((id, index) => (
                <WatchRow
                  key={id}
                  id={id}
                  index={index}
                  total={enabledIds.length}
                  enabled
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  onToggle={() => toggleWatch(id)}
                  onDelete={() => handleDeleteWatch(id)}
                />
              ))}
            </div>
          )}

          {/* Disabled */}
          {disabledIds.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                مخفي ({disabledIds.length})
              </p>
              {disabledIds.map((id) => (
                <WatchRow
                  key={id}
                  id={id}
                  index={-1}
                  total={0}
                  enabled={false}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onToggle={() => toggleWatch(id)}
                  onDelete={() => handleDeleteWatch(id)}
                />
              ))}
            </div>
          )}

          {availableIds.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">لا توجد صور في مجلد الموديلات</p>
              <p className="text-xs mt-1">ارفع صورة من القسم أعلاه</p>
            </div>
          )}
        </Section>
      </main>

      {/* ── STICKY SAVE BUTTON ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-20">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            id="admin-save-btn"
            className="w-full bg-slate-900 hover:bg-amber-500 disabled:bg-slate-400 text-white font-extrabold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري الحفظ والتحديث...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                حفظ جميع التغييرات وتحديث الموقع فوراً
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
