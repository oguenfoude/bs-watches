"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  ShoppingCart,
  Phone,
  User,
  MapPin,
  Home,
  Building2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Truck,
  Clock,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────
type DeliveryOption = "desk" | "home";
interface FormFields { fullName: string; phone: string; wilaya: string; baladiya: string; notes?: string; }
interface WatchItem { id: string; name: string; image: string; }
interface ValidationErrors { fullName?: string; phone?: string; wilaya?: string; baladiya?: string; watch?: string; delivery?: string; }

const WATCH_PRICE = 1500;
const OLD_PRICE = 2000;
const DELIVERY_COST: Record<DeliveryOption, number> = { desk: 500, home: 800 };
const API_URL = "/api/submit-order";

const WATCHES: WatchItem[] = Array.from({ length: 23 }, (_, i) => ({
  id: `model-${i + 1}`,
  name: `موديل ${i + 1}`,
  image: `/images/watches/${i + 1}.webp`,
}));

// ─────────────────────────────────────────────
// META PIXEL
// ─────────────────────────────────────────────
function initMetaPixel(): void {
  try {
    if (typeof window === "undefined") return;
    const win = window as unknown as { fbq?: (a: string, b: string, c?: Record<string, unknown>) => void; _fbq?: unknown; };
    if (win.fbq) return;
    const s = document.createElement("script");
    s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`;
    document.head.appendChild(s);
    setTimeout(() => { if (win.fbq) { win.fbq("init", "1301109644932375"); win.fbq("track", "PageView"); } }, 100);
  } catch { /* silent */ }
}

function trackFb(event: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined") return;
    const win = window as unknown as { fbq?: (a: string, b: string, c?: Record<string, unknown>) => void; };
    if (typeof win.fbq === "function") win.fbq("track", event, params);
  } catch { /* silent */ }
}

function formatDZD(v: number): string {
  return v.toLocaleString("ar-DZ") + " دج";
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────
function validateForm(f: FormFields, watchId: string | null, delivery: DeliveryOption | null): ValidationErrors {
  const e: ValidationErrors = {};
  const name = (f.fullName || "").trim();
  if (!name) e.fullName = "أدخل اسمك الكامل";
  else if (name.length < 3) e.fullName = "الاسم قصير جداً";
  const digits = (f.phone || "").replace(/\D/g, "");
  if (!digits) e.phone = "أدخل رقم الهاتف";
  else if (digits.length < 10) e.phone = "الرقم قصير — يجب 10 أرقام";
  else if (digits.length > 10) e.phone = "الرقم طويل — يجب 10 أرقام";
  else if (!/^0[567]/.test(digits)) e.phone = "الرقم يجب أن يبدأ بـ 05 أو 06 أو 07";
  if (!f.wilaya?.trim()) e.wilaya = "اختر أو اكتب اسم الولاية";
  if (!f.baladiya?.trim()) e.baladiya = "اكتب اسم البلدية أو الحي";
  if (!watchId) e.watch = "اختر الموديل الذي يعجبك";
  if (!delivery) e.delivery = "اختر طريقة التوصيل";
  return e;
}

// ─────────────────────────────────────────────
// SWIPE HOOK
// ─────────────────────────────────────────────
function useSwipe(onLeft: () => void, onRight: () => void) {
  const sx = useRef(0), ex = useRef(0), sy = useRef(0), ey = useRef(0), active = useRef(false);
  const onStart = useCallback((e: React.TouchEvent) => { sx.current = e.targetTouches[0].clientX; sy.current = e.targetTouches[0].clientY; active.current = true; }, []);
  const onMove = useCallback((e: React.TouchEvent) => { if (!active.current) return; ex.current = e.targetTouches[0].clientX; ey.current = e.targetTouches[0].clientY; }, []);
  const onEnd = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    const dx = sx.current - ex.current, dy = sy.current - ey.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) { onLeft(); } else { onRight(); }
    }
  }, [onLeft, onRight]);
  return { onStart, onMove, onEnd };
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Page() {
  useEffect(() => { initMetaPixel(); }, []);

  // ── Carousel ──
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDir, setSlideDir] = useState(0);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = useCallback((i: number) => { setSlideDir(i > currentSlide ? 1 : -1); setCurrentSlide(i); }, [currentSlide]);
  const next = useCallback(() => { setSlideDir(1); setCurrentSlide(p => (p + 1) % WATCHES.length); }, []);
  const prev = useCallback(() => { setSlideDir(-1); setCurrentSlide(p => (p - 1 + WATCHES.length) % WATCHES.length); }, []);

  useEffect(() => {
    autoRef.current = setInterval(() => { setSlideDir(1); setCurrentSlide(p => (p + 1) % WATCHES.length); }, 4000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, []);

  const pauseAuto = useCallback(() => {
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
    setTimeout(() => { autoRef.current = setInterval(() => { setSlideDir(1); setCurrentSlide(p => (p + 1) % WATCHES.length); }, 4000); }, 8000);
  }, []);

  const swipe = useSwipe(() => { pauseAuto(); next(); }, () => { pauseAuto(); prev(); });

  // ── Form ──
  const [watchId, setWatchId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryOption | null>(null);
  const [form, setForm] = useState<FormFields>({ fullName: "", phone: "", wilaya: "", baladiya: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const watch = useMemo(() => WATCHES.find(w => w.id === watchId) || null, [watchId]);
  const total = useMemo(() => WATCH_PRICE + (delivery ? DELIVERY_COST[delivery] : 0), [delivery]);

  const selectWatch = (id: string) => {
    setWatchId(id);
    setErrors(p => ({ ...p, watch: undefined }));
    trackFb("AddToCart", { content_type: "product", content_ids: [id], value: WATCH_PRICE, currency: "DZD" });
  };

  const selectDelivery = (opt: DeliveryOption) => {
    setDelivery(opt);
    setErrors(p => ({ ...p, delivery: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form, watchId, delivery);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(), phone: form.phone.trim(), wilaya: form.wilaya.trim(), baladiya: form.baladiya.trim(),
          selectedWatchId: watchId!, selectedWatchName: watch?.name || watchId!, boxPrice: WATCH_PRICE,
          deliveryOption: delivery!, deliveryCost: DELIVERY_COST[delivery!], total, notes: form.notes?.trim(),
          clientRequestId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        trackFb("Purchase", { content_type: "product", content_ids: [watchId], value: total, currency: "DZD" });
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

  const inputCls = (err: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
      err ? "border-red-300 bg-red-50/30 focus:ring-red-200 focus:border-red-400" : "border-gray-200 bg-white focus:ring-amber-100 focus:border-amber-400 hover:border-gray-300"
    }`;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  const thumbs = useMemo(() => {
    const count = 5, half = Math.floor(count / 2);
    let start = currentSlide - half;
    if (start < 0) start = 0;
    if (start + count > WATCHES.length) start = Math.max(0, WATCHES.length - count);
    return WATCHES.slice(start, start + count).map((w, i) => ({ ...w, idx: start + i }));
  }, [currentSlide]);

  // ═════════════════════════════════════════════
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-900" suppressHydrationWarning>

      {/* ── PROMO BAR ── */}
      <div className="bg-gray-900 text-white text-center py-2.5 px-4">
        <p className="text-xs md:text-sm font-medium flex items-center justify-center gap-2">
          <Gift className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>عرض محدود — ساعة + طقم إكسسوارات مجاني | توصيل لجميع الولايات</span>
          <Gift className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        </p>
      </div>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">BS</span>
            </div>
            <span className="font-bold text-gray-900 text-sm md:text-base">BS Monters</span>
          </div>
          <a
            href="#order"
            onClick={() => trackFb("InitiateCheckout")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs md:text-sm font-bold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>اطلب الآن</span>
          </a>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          MAIN — carousel | form (side by side on desktop)
          ═══════════════════════════════════════════ */}
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">

          {/* ── LEFT: IMAGE CAROUSEL (sticky on desktop) ── */}
          <div className="space-y-3 lg:sticky lg:top-20">
            <div
              className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-lg border border-gray-100 cursor-grab active:cursor-grabbing select-none"
              onTouchStart={swipe.onStart}
              onTouchMove={swipe.onMove}
              onTouchEnd={swipe.onEnd}
            >
              <AnimatePresence initial={false} custom={slideDir} mode="wait">
                <motion.div
                  key={currentSlide}
                  custom={slideDir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <Image src={WATCHES[currentSlide].image} alt={WATCHES[currentSlide].name} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                </motion.div>
              </AnimatePresence>

              {/* Discount badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                  <span>{`-${Math.round(((OLD_PRICE - WATCH_PRICE) / OLD_PRICE) * 100)}%`}</span>
                </span>
              </div>

              {/* Counter */}
              <div className="absolute top-3 left-3 z-10">
                <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  <span>{currentSlide + 1}</span> / <span>{WATCHES.length}</span>
                </span>
              </div>

              {/* Arrows */}
              <button onClick={() => { pauseAuto(); prev(); }} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95" aria-label="السابق">
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
              <button onClick={() => { pauseAuto(); next(); }} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95" aria-label="التالي">
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 z-10">
                <p className="text-white font-bold text-lg">{WATCHES[currentSlide].name}</p>
                <p className="text-amber-300 text-sm font-semibold">{formatDZD(WATCH_PRICE)}</p>
              </div>

              {/* Mobile swipe hint */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 md:hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: 2, delay: 1 }} className="text-white/70 text-xs flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
                  <ChevronRight className="w-3 h-3" />
                  <span>اسحب لتصفح الموديلات</span>
                  <ChevronLeft className="w-3 h-3" />
                </motion.div>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex items-center gap-2 justify-center">
              <button onClick={() => { pauseAuto(); prev(); }} className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors border border-gray-200">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex gap-1.5 overflow-hidden">
                {thumbs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { pauseAuto(); goTo(t.idx); }}
                    className={`relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                      currentSlide === t.idx ? "border-amber-500 shadow-md scale-105" : "border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300"
                    }`}
                  >
                    <Image src={t.image} alt={t.name} fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
              <button onClick={() => { pauseAuto(); next(); }} className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition-colors border border-gray-200">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1 px-4">
              {WATCHES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { pauseAuto(); goTo(idx); }}
                  className={`rounded-full transition-all duration-300 ${idx === currentSlide ? "w-6 h-1.5 bg-amber-500" : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"}`}
                  aria-label={`الموديل ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT: ORDER FORM (directly beside carousel) ── */}
          <div id="order">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              {/* Header with price */}
              <div className="bg-gradient-to-r from-red-600 to-red-500 p-4">
                <h1 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>اطلب الآن — الدفع عند الاستلام</span>
                </h1>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="text-white text-xl font-black">{formatDZD(WATCH_PRICE)}</span>
                  <span className="text-red-200 text-sm line-through">{formatDZD(OLD_PRICE)}</span>
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded">
                    <span>{`-${Math.round(((OLD_PRICE - WATCH_PRICE) / OLD_PRICE) * 100)}%`}</span>
                  </span>
                </div>
                <p className="text-red-100 mt-1.5 text-xs text-center">ساعة أنيقة + طقم إكسسوارات كامل مجاني | 23 موديل متوفر</p>
              </div>

              {/* Trust strip */}
              <div className="flex items-center justify-center gap-4 py-2 px-4 bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 font-medium">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ضمان سنة</span>
                <span className="flex items-center gap-1"><Gift className="w-3 h-3" /> هدية مجانية</span>
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> توصيل سريع</span>
              </div>

              {/* Form Body */}
              <div className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Watch Selection */}
                  <div
                    className={`rounded-xl p-3 transition-all ${
                      errors.watch ? "bg-red-50 border-2 border-red-300" : watchId ? "bg-emerald-50 border-2 border-emerald-300" : "bg-gray-50 border-2 border-dashed border-gray-200"
                    }`}
                    data-error={errors.watch ? "true" : undefined}
                  >
                    <label className="block text-sm font-bold text-gray-800 mb-1.5">
                      اختر رقم الموديل <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={watchId || ""}
                      onChange={e => selectWatch(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 appearance-none cursor-pointer"
                    >
                      <option value="">— اختر الموديل —</option>
                      {WATCHES.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    {errors.watch && <p className="text-red-500 text-xs mt-1 font-medium">{errors.watch}</p>}
                    <AnimatePresence>
                      {watch && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 pt-2 border-t border-gray-200/60">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 border-emerald-300">
                              <Image src={watch.image} alt={watch.name} fill className="object-cover" sizes="48px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{watch.name}</p>
                              <p className="text-emerald-600 text-xs font-semibold">{formatDZD(WATCH_PRICE)}</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Name + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div data-error={errors.fullName ? "true" : undefined}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم واللقب <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type="text" value={form.fullName} onChange={e => { setForm(f => ({ ...f, fullName: e.target.value })); setErrors(p => ({ ...p, fullName: undefined })); }} placeholder="أحمد بوعلام" className={inputCls(!!errors.fullName)} />
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                    </div>
                    <div data-error={errors.phone ? "true" : undefined}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type="tel" value={form.phone} maxLength={10} onChange={e => { const val = e.target.value.replace(/\D/g, "").slice(0, 10); setForm(f => ({ ...f, phone: val })); setErrors(p => ({ ...p, phone: undefined })); }} placeholder="0555123456" className={inputCls(!!errors.phone)} />
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Wilaya + Baladiya */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div data-error={errors.wilaya ? "true" : undefined}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">الولاية <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type="text" value={form.wilaya} onChange={e => { setForm(f => ({ ...f, wilaya: e.target.value })); setErrors(p => ({ ...p, wilaya: undefined })); }} placeholder="الجزائر العاصمة" className={inputCls(!!errors.wilaya)} />
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      {errors.wilaya && <p className="text-red-500 text-xs mt-1">{errors.wilaya}</p>}
                    </div>
                    <div data-error={errors.baladiya ? "true" : undefined}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">البلدية <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type="text" value={form.baladiya} onChange={e => { setForm(f => ({ ...f, baladiya: e.target.value })); setErrors(p => ({ ...p, baladiya: undefined })); }} placeholder="باب الزوار" className={inputCls(!!errors.baladiya)} />
                        <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      {errors.baladiya && <p className="text-red-500 text-xs mt-1">{errors.baladiya}</p>}
                    </div>
                  </div>

                  {/* Delivery */}
                  <div data-error={errors.delivery ? "true" : undefined}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">طريقة التوصيل <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { key: "desk" as DeliveryOption, icon: Building2, label: "للمكتب", cost: DELIVERY_COST.desk },
                        { key: "home" as DeliveryOption, icon: Home, label: "للمنزل", cost: DELIVERY_COST.home },
                      ]).map(({ key, icon: Icon, label, cost }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectDelivery(key)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                            delivery === key ? "border-amber-400 bg-amber-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${delivery === key ? "text-amber-600" : "text-gray-400"}`} />
                          <span className="font-bold text-gray-800 text-sm">{label}</span>
                          <span className="text-xs text-gray-500">{formatDZD(cost)}</span>
                        </button>
                      ))}
                    </div>
                    {errors.delivery && <p className="text-red-500 text-xs mt-1.5">{errors.delivery}</p>}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span></label>
                    <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="عنوان تفصيلي أو رقم هاتف إضافي..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 resize-none bg-white hover:border-gray-300 transition-all" />
                  </div>

                  {/* Summary */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">الساعة {watch ? `(${watch.name})` : ""}</span>
                        <span className="font-semibold text-gray-800">{formatDZD(WATCH_PRICE)}</span>
                      </div>
                      {delivery && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">التوصيل {delivery === "home" ? "للمنزل" : "للمكتب"}</span>
                          <span className="font-semibold text-gray-800">{formatDZD(DELIVERY_COST[delivery])}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-black text-gray-900">المجموع</span>
                        <span className="font-black text-lg text-gray-900">{formatDZD(total)}</span>
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.005] active:scale-[0.995]"
                    >
                      {submitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /><span>جاري الإرسال...</span></>
                      ) : (
                        <><ShoppingCart className="w-5 h-5" /><span>اضغط هنا للطلب — <span>{formatDZD(total)}</span></span></>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> آمن 100%</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> توصيل 24-48h</span>
                      <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> الدفع عند الاستلام</span>
                    </div>

                    {submitErr && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm text-center">{submitErr}</div>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── SUCCESS MODAL ── */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح! ✅</h3>
              <p className="text-gray-500 mb-5 text-sm">سنتصل بك قريباً لتأكيد الطلب وترتيب التوصيل</p>
              <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm">
                <span className="text-gray-400">الإجمالي: </span>
                <span className="font-bold text-gray-900">{formatDZD(total)}</span>
              </div>
              <button onClick={() => window.location.reload()} className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors">حسناً</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 py-6 bg-white">
        <p className="text-center text-xs text-gray-400">
          <span>{new Date().getFullYear()}</span> BS Monters — جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
}
