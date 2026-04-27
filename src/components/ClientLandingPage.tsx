"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  Building2,
  ShieldCheck,
  Truck,
  Gift,
  Clock,
} from "lucide-react";
import type { SiteConfig } from "@/lib/site-config";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type DeliveryOption = "desk" | "home";

interface FormFields {
  fullName: string;
  phone: string;
  wilaya: string;
  baladiya: string;
  notes: string;
}

interface WatchItem {
  id: string;
  name: string;
  image: string;
}

interface ValidationErrors {
  fullName?: string;
  phone?: string;
  wilaya?: string;
  baladiya?: string;
  watch?: string;
  delivery?: string;
}

interface ClientLandingPageProps {
  config: SiteConfig;
}

const API_URL = "/api/submit-order";

// ─────────────────────────────────────────────
// META PIXEL
// ─────────────────────────────────────────────
function initMetaPixel(): void {
  try {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      fbq?: (a: string, b: string, c?: Record<string, unknown>) => void;
      _fbq?: unknown;
    };
    if (w.fbq) return;
    const s = document.createElement("script");
    s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`;
    document.head.appendChild(s);
    setTimeout(() => {
      if (w.fbq) {
        w.fbq("init", "1301109644932375");
        w.fbq("track", "PageView");
      }
    }, 100);
  } catch {
    /* silent */
  }
}

function trackFb(ev: string, p?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      fbq?: (a: string, b: string, c?: Record<string, unknown>) => void;
    };
    if (typeof w.fbq === "function") w.fbq("track", ev, p);
  } catch {
    /* silent */
  }
}

function formatDZD(v: number): string {
  return v.toLocaleString("ar-DZ") + " د.ج";
}

// ─────────────────────────────────────────────
// ANTI-FAKE PHONE VALIDATION
// ─────────────────────────────────────────────
function validatePhone(raw: string): string | undefined {
  const d = raw.replace(/\D/g, "");
  if (!d) return "أدخل رقم الهاتف";
  if (d.length < 10) return "الرقم قصير — يجب أن يكون 10 أرقام";
  if (d.length > 10) return "الرقم طويل — يجب أن يكون 10 أرقام";
  if (!/^0[567]/.test(d)) return "يجب أن يبدأ الرقم بـ 05 أو 06 أو 07";
  if (/^(.)\1+$/.test(d)) return "رقم الهاتف غير صحيح";
  if (/^0[567](\d)\1{7}$/.test(d)) return "رقم الهاتف غير صحيح";
  const tail = d.slice(2);
  const isAsc = tail.split("").every((c, i, a) => i === 0 || +c === +a[i - 1] + 1);
  const isDesc = tail.split("").every((c, i, a) => i === 0 || +c === +a[i - 1] - 1);
  if (isAsc || isDesc) return "رقم الهاتف غير صحيح";
  const seg = tail.slice(0, 4);
  if (tail === seg + seg) return "رقم الهاتف غير صحيح";
  return undefined;
}

function validateName(raw: string): string | undefined {
  const n = raw.trim();
  if (!n) return "أدخل اسمك الكامل";
  if (n.length < 3) return "الاسم قصير جداً";
  if (n.split(/\s+/).filter(Boolean).length < 2) return "أدخل الاسم واللقب";
  if (/^(.)\1+$/i.test(n.replace(/\s/g, ""))) return "الاسم غير صحيح";
  return undefined;
}

function validateForm(
  f: FormFields,
  wId: string | null,
  del: DeliveryOption | null,
): ValidationErrors {
  const e: ValidationErrors = {};
  const nameErr = validateName(f.fullName || "");
  if (nameErr) e.fullName = nameErr;
  const phoneErr = validatePhone(f.phone || "");
  if (phoneErr) e.phone = phoneErr;
  if (!(f.wilaya || "").trim()) e.wilaya = "أدخل اسم الولاية";
  if (!(f.baladiya || "").trim()) e.baladiya = "أدخل اسم البلدية";
  if (!wId) e.watch = "اختر رقم الموديل";
  if (!del) e.delivery = "اختر طريقة التوصيل";
  return e;
}

// ─────────────────────────────────────────────
// SWIPE HOOK
// ─────────────────────────────────────────────
function useSwipe(onLeft: () => void, onRight: () => void) {
  const sx = useRef(0),
    ex = useRef(0),
    sy = useRef(0),
    ey = useRef(0),
    active = useRef(false);
  const onStart = useCallback((e: React.TouchEvent) => {
    sx.current = e.targetTouches[0].clientX;
    sy.current = e.targetTouches[0].clientY;
    active.current = true;
  }, []);
  const onMove = useCallback((e: React.TouchEvent) => {
    if (!active.current) return;
    ex.current = e.targetTouches[0].clientX;
    ey.current = e.targetTouches[0].clientY;
  }, []);
  const onEnd = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    const dx = sx.current - ex.current;
    const dy = sy.current - ey.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) onLeft();
      else onRight();
    }
  }, [onLeft, onRight]);
  return { onStart, onMove, onEnd };
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function ClientLandingPage({ config }: ClientLandingPageProps) {
  useEffect(() => {
    initMetaPixel();
  }, []);

  // ── Derive constants from config ──
  const WATCH_PRICE = config.price;
  const OLD_PRICE = config.oldPrice;
  const DELIVERY_COST: Record<DeliveryOption, number> = useMemo(() => ({
    desk: config.deliveryCostDesk,
    home: config.deliveryCostHome,
  }), [config.deliveryCostDesk, config.deliveryCostHome]);
  const WATCHES: WatchItem[] = config.watchIds.map((n) => ({
    id: `model-${n}`,
    name: `موديل ${n}`,
    image: `/api/watches/${n}?v=${config.lastUpdated || ""}`,
  }));

  // ── Image carousel state ──
  const [cur, setCur] = useState(0);
  const [dir, setDir] = useState(0);

  const goTo = useCallback(
    (i: number) => {
      setDir(i > cur ? 1 : -1);
      setCur(i);
    },
    [cur],
  );
  const next = useCallback(() => {
    setDir(1);
    setCur((p) => (p + 1) % WATCHES.length);
  }, [WATCHES.length]);
  const prev = useCallback(() => {
    setDir(-1);
    setCur((p) => (p - 1 + WATCHES.length) % WATCHES.length);
  }, [WATCHES.length]);
  const swipe = useSwipe(next, prev);

  // ── Form state ──
  const [watchId, setWatchId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryOption | null>(null);
  const [form, setForm] = useState<FormFields>({
    fullName: "",
    phone: "",
    wilaya: "",
    baladiya: "",
    notes: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const watch = useMemo(
    () => WATCHES.find((w) => w.id === watchId) || null,
    [watchId, WATCHES],
  );
  const total = useMemo(
    () => WATCH_PRICE + (delivery ? DELIVERY_COST[delivery] : 0),
    [delivery, WATCH_PRICE, DELIVERY_COST],
  );

  const selectWatch = useCallback(
    (id: string) => {
      setWatchId(id);
      setErrors((p) => ({ ...p, watch: undefined }));
      const idx = WATCHES.findIndex((w) => w.id === id);
      if (idx !== -1) goTo(idx);
      trackFb("AddToCart", {
        content_type: "product",
        content_ids: [id],
        value: WATCH_PRICE,
        currency: "DZD",
      });
    },
    [goTo, WATCHES, WATCH_PRICE],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form, watchId, delivery);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      document
        .querySelector("[data-error='true']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          wilaya: form.wilaya.trim(),
          baladiya: form.baladiya.trim(),
          notes: form.notes?.trim() || "",
          selectedWatchId: watchId!,
          selectedWatchName: watch?.name || watchId!,
          boxPrice: WATCH_PRICE,
          deliveryOption: delivery!,
          deliveryCost: DELIVERY_COST[delivery!],
          total,
          clientRequestId:
            crypto.randomUUID?.() ||
            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        trackFb("Purchase", {
          content_type: "product",
          content_ids: [watchId],
          value: total,
          currency: "DZD",
        });
        setSuccess(true);
        setTimeout(() => window.location.reload(), 10000);
      } else {
        setSubmitErr(result.error || "حدث خطأ. يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setSubmitErr("فشل الاتصال. يرجى التحقق من الإنترنت.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Thumbnail window ──
  const thumbs = useMemo(() => {
    const count = 5;
    const half = Math.floor(count / 2);
    let start = cur - half;
    if (start < 0) start = 0;
    if (start + count > WATCHES.length) start = Math.max(0, WATCHES.length - count);
    return WATCHES.slice(start, start + count).map((w, i) => ({
      ...w,
      idx: start + i,
    }));
  }, [cur, WATCHES]);

  // ── Slide animation ──
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  // ── Input class helper ──
  const inp = (err: boolean) =>
    `w-full border rounded-lg px-4 py-3.5 text-base bg-white transition-all duration-150 focus:outline-none focus:ring-2 placeholder:text-gray-400 ${
      err
        ? "border-red-400 focus:ring-red-200 bg-red-50/40"
        : "border-gray-300 focus:ring-amber-200 focus:border-amber-500 hover:border-gray-400"
    }`;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-900">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-extrabold text-gray-900 text-xl tracking-tight">
            BS <span className="text-amber-600">Monters</span>
          </span>
          <a
            href="#order-form"
            className="bg-gray-900 text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            اطلب الآن
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-10">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">

          {/* ── IMAGE COLUMN ── */}
          <div className="order-1 lg:sticky lg:top-20 space-y-3">

            {/* Main image */}
            <div
              className="relative w-full rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-md select-none cursor-grab active:cursor-grabbing"
              style={{ aspectRatio: "1 / 1" }}
              onTouchStart={swipe.onStart}
              onTouchMove={swipe.onMove}
              onTouchEnd={swipe.onEnd}
            >
              <AnimatePresence initial={false} custom={dir} mode="wait">
                <motion.div
                  key={cur}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={WATCHES[cur].image}
                    alt={WATCHES[cur].name}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Discount badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  {config.discountBadge}
                </span>
              </div>

              {/* Model number badge */}
              <div className="absolute bottom-3 left-3 z-10">
                <span className="bg-black/60 text-white text-sm font-bold px-3 py-1 rounded-lg backdrop-blur-sm">
                  {WATCHES[cur].name}
                </span>
              </div>

              {/* Nav arrows */}
              <button
                onClick={prev}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition-all"
                aria-label="السابق"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={next}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition-all"
                aria-label="التالي"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Thumbnails row */}
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={prev}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors"
                aria-label="السابق"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex gap-2 overflow-hidden">
                {thumbs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      goTo(t.idx);
                      setWatchId(t.id);
                      setErrors((p) => ({ ...p, watch: undefined }));
                    }}
                    className={`relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      cur === t.idx
                        ? "border-gray-900 shadow-md w-20 h-20"
                        : "border-gray-200 opacity-55 hover:opacity-90 w-16 h-16"
                    }`}
                  >
                    <Image
                      src={t.image}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={next}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors"
                aria-label="التالي"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Model counter */}
            <p className="text-center text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{cur + 1}</span> من{" "}
              <span className="font-semibold text-gray-800">{WATCHES.length}</span> موديل
            </p>
          </div>

          {/* ── INFO + FORM COLUMN ── */}
          <div className="order-2 space-y-5" id="order-form">

            {/* Title */}
            <div>
              <p className="text-amber-600 text-sm font-semibold mb-1">
                {config.subtitle}
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                {config.title}
              </h1>
              <p className="text-gray-500 mt-2 text-base leading-relaxed">
                {config.description}
              </p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-red-600">
                {formatDZD(WATCH_PRICE)}
              </span>
              <span className="text-xl text-gray-400 line-through">
                {formatDZD(OLD_PRICE)}
              </span>
              <span className="text-sm bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                {config.discountBadge}
              </span>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Gift, label: "طقم إكسسوارات مجاني" },
                { icon: ShieldCheck, label: "ضمان سنة كاملة" },
                { icon: Truck, label: "الدفع عند الاستلام" },
                { icon: Clock, label: "توصيل 24-48 ساعة" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700"
                >
                  <Icon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* ─── ORDER FORM ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                أكمل طلبك
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Model selector */}
                <div data-error={errors.watch ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    موديل الساعة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={watchId || ""}
                    onChange={(e) => e.target.value && selectWatch(e.target.value)}
                    className={inp(!!errors.watch) + " cursor-pointer appearance-none"}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "left 14px center",
                    }}
                  >
                    <option value="">— اختر الموديل —</option>
                    {WATCHES.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {errors.watch && (
                    <p className="text-red-500 text-xs mt-1">{errors.watch}</p>
                  )}
                  {watch && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>تم اختيار: <strong>{watch.name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Full name */}
                <div data-error={errors.fullName ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    الاسم واللقب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, fullName: e.target.value }));
                      setErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    placeholder="مثال: أحمد بوعلام"
                    className={inp(!!errors.fullName)}
                    autoComplete="name"
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
                  )}
                </div>

                {/* Phone */}
                <div data-error={errors.phone ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    maxLength={10}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm((f) => ({ ...f, phone: val }));
                      setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    placeholder="مثال: 0555123456"
                    className={inp(!!errors.phone)}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    يبدأ بـ 05 أو 06 أو 07 — 10 أرقام
                  </p>
                </div>

                {/* Wilaya + Baladiya */}
                <div className="grid grid-cols-2 gap-3">
                  <div data-error={errors.wilaya ? "true" : undefined}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      الولاية <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.wilaya}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, wilaya: e.target.value }));
                        setErrors((p) => ({ ...p, wilaya: undefined }));
                      }}
                      placeholder="مثال: الجزائر"
                      className={inp(!!errors.wilaya)}
                    />
                    {errors.wilaya && (
                      <p className="text-red-500 text-xs mt-1">{errors.wilaya}</p>
                    )}
                  </div>
                  <div data-error={errors.baladiya ? "true" : undefined}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      البلدية <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.baladiya}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, baladiya: e.target.value }));
                        setErrors((p) => ({ ...p, baladiya: undefined }));
                      }}
                      placeholder="مثال: باب الزوار"
                      className={inp(!!errors.baladiya)}
                    />
                    {errors.baladiya && (
                      <p className="text-red-500 text-xs mt-1">{errors.baladiya}</p>
                    )}
                  </div>
                </div>

                {/* Delivery */}
                <div data-error={errors.delivery ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    طريقة التوصيل <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        {
                          key: "desk" as DeliveryOption,
                          icon: Building2,
                          label: "للمكتب",
                          cost: DELIVERY_COST.desk,
                        },
                        {
                          key: "home" as DeliveryOption,
                          icon: Home,
                          label: "للمنزل",
                          cost: DELIVERY_COST.home,
                        },
                      ] as const
                    ).map(({ key, icon: Icon, label, cost }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setDelivery(key);
                          setErrors((p) => ({ ...p, delivery: undefined }));
                        }}
                        className={`flex flex-col items-center gap-1 py-3.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          delivery === key
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{label}</span>
                        <span className="text-xs font-normal text-gray-500">
                          {formatDZD(cost)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {errors.delivery && (
                    <p className="text-red-500 text-xs mt-1">{errors.delivery}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    ملاحظات{" "}
                    <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="عنوان تفصيلي أو رقم هاتف إضافي..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 resize-none transition-all hover:border-gray-400"
                  />
                </div>

                {/* Order summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>الساعة {watch ? `(${watch.name})` : ""}</span>
                    <span className="font-medium">{formatDZD(WATCH_PRICE)}</span>
                  </div>
                  {delivery && (
                    <div className="flex justify-between text-gray-600">
                      <span>
                        التوصيل ({delivery === "home" ? "للمنزل" : "للمكتب"})
                      </span>
                      <span className="font-medium">
                        {formatDZD(DELIVERY_COST[delivery])}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-gray-900 text-base pt-2 border-t border-gray-200">
                    <span>المجموع</span>
                    <span className="text-red-600">{formatDZD(total)}</span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-lg font-extrabold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>اضغط هنا للطلب — {formatDZD(total)}</>
                  )}
                </button>

                {submitErr && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
                    {submitErr}
                  </div>
                )}

                {/* Trust footer */}
                <p className="text-center text-xs text-gray-400">
                  🔒 معلوماتك آمنة — الدفع عند الاستلام فقط
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ── SUCCESS MODAL ── */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                تم استلام طلبك! ✅
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                سنتصل بك قريباً لتأكيد الطلب وترتيب التوصيل
              </p>
              <div className="bg-gray-50 rounded-xl p-3 mb-5">
                <span className="text-gray-500 text-sm">المجموع: </span>
                <span className="font-extrabold text-gray-900 text-base">
                  {formatDZD(total)}
                </span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                حسناً، شكراً!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 bg-white mt-10">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="font-bold text-gray-800 mb-1">
            BS <span className="text-amber-600">Monters</span>
          </p>
          <p className="text-xs text-gray-400">
            {new Date().getFullYear()} — جميع الحقوق محفوظة
          </p>
        </div>
      </footer>
    </div>
  );
}
