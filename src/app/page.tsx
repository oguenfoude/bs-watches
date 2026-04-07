"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Home,
  Building2,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────
type DeliveryOption = "desk" | "home";
interface FormFields { fullName: string; phone: string; wilaya: string; baladiya: string; notes: string; }
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
    const w = window as unknown as { fbq?: (a: string, b: string, c?: Record<string, unknown>) => void; _fbq?: unknown; };
    if (w.fbq) return;
    const s = document.createElement("script");
    s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`;
    document.head.appendChild(s);
    setTimeout(() => { if (w.fbq) { w.fbq("init", "1301109644932375"); w.fbq("track", "PageView"); } }, 100);
  } catch { /* silent */ }
}

function trackFb(ev: string, p?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined") return;
    const w = window as unknown as { fbq?: (a: string, b: string, c?: Record<string, unknown>) => void; };
    if (typeof w.fbq === "function") w.fbq("track", ev, p);
  } catch { /* silent */ }
}

function formatDZD(v: number): string {
  return v.toLocaleString("ar-DZ") + " د.ج";
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────
function validateForm(f: FormFields, wId: string | null, del: DeliveryOption | null): ValidationErrors {
  const e: ValidationErrors = {};
  const name = (f.fullName || "").trim();
  if (!name) e.fullName = "أدخل اسمك الكامل";
  else if (name.length < 3) e.fullName = "الاسم قصير جداً";
  const digits = (f.phone || "").replace(/\D/g, "");
  if (!digits) e.phone = "أدخل رقم الهاتف";
  else if (digits.length < 10) e.phone = "الرقم قصير — يجب 10 أرقام";
  else if (digits.length > 10) e.phone = "الرقم طويل — يجب 10 أرقام";
  else if (!/^0[567]/.test(digits)) e.phone = "يجب أن يبدأ بـ 05 أو 06 أو 07";
  if (!f.wilaya?.trim()) e.wilaya = "أدخل اسم الولاية";
  if (!f.baladiya?.trim()) e.baladiya = "أدخل اسم البلدية";
  if (!wId) e.watch = "اختر رقم الموديل";
  if (!del) e.delivery = "اختر طريقة التوصيل";
  return e;
}

// ─────────────────────────────────────────────
// SWIPE HOOK
// ─────────────────────────────────────────────
function useSwipe(onLeft: () => void, onRight: () => void) {
  const sx = useRef(0), ex = useRef(0), sy = useRef(0), ey = useRef(0), a = useRef(false);
  const onStart = useCallback((e: React.TouchEvent) => { sx.current = e.targetTouches[0].clientX; sy.current = e.targetTouches[0].clientY; a.current = true; }, []);
  const onMove = useCallback((e: React.TouchEvent) => { if (!a.current) return; ex.current = e.targetTouches[0].clientX; ey.current = e.targetTouches[0].clientY; }, []);
  const onEnd = useCallback(() => {
    if (!a.current) return; a.current = false;
    const dx = sx.current - ex.current, dy = sy.current - ey.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) { if (dx > 0) { onLeft(); } else { onRight(); } }
  }, [onLeft, onRight]);
  return { onStart, onMove, onEnd };
}

// ─────────────────────────────────────────────
// COUNTDOWN TIMER (matching reference style)
// ─────────────────────────────────────────────
function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    setMounted(true);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const units = [
    { val: mounted ? pad(t.s) : "00", label: "ثانية" },
    { val: mounted ? pad(t.m) : "00", label: "دقيقة" },
    { val: mounted ? pad(t.h) : "00", label: "ساعة" },
    { val: mounted ? pad(t.d) : "00", label: "يوم" },
  ];

  return (
    <div className="flex items-center justify-center gap-3" dir="ltr">
      {units.map(({ val, label }, i) => (
        <div key={label} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-3xl md:text-4xl font-bold text-gray-800 tabular-nums min-w-[48px] text-center">{val}</span>
            <span className="text-xs text-gray-500 mt-0.5">{label}</span>
          </div>
          {i < units.length - 1 && <span className="text-2xl text-gray-400 font-light mb-4">:</span>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function Page() {
  useEffect(() => { initMetaPixel(); }, []);

  // Carousel (manual only — no auto-play)
  const [cur, setCur] = useState(0);
  const [dir, setDir] = useState(0);

  const goTo = useCallback((i: number) => { setDir(i > cur ? 1 : -1); setCur(i); }, [cur]);
  const next = useCallback(() => { setDir(1); setCur(p => (p + 1) % WATCHES.length); }, []);
  const prev = useCallback(() => { setDir(-1); setCur(p => (p - 1 + WATCHES.length) % WATCHES.length); }, []);

  const swipe = useSwipe(next, prev);

  // Form
  const [watchId, setWatchId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryOption | null>(null);
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState<FormFields>({ fullName: "", phone: "", wilaya: "", baladiya: "", notes: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [viewers, setViewers] = useState(5);
  const [stock] = useState(6);

  useEffect(() => { setViewers(Math.floor(Math.random() * 16) + 5); }, []);

  const watch = useMemo(() => WATCHES.find(w => w.id === watchId) || null, [watchId]);
  const unitTotal = useMemo(() => WATCH_PRICE + (delivery ? DELIVERY_COST[delivery] : 0), [delivery]);
  const total = unitTotal * qty;

  const selectWatch = (id: string) => {
    setWatchId(id); setErrors(p => ({ ...p, watch: undefined }));
    trackFb("AddToCart", { content_type: "product", content_ids: [id], value: WATCH_PRICE, currency: "DZD" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form, watchId, delivery);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setSubmitting(true); setSubmitErr(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(), phone: form.phone.trim(), wilaya: form.wilaya.trim(), baladiya: form.baladiya.trim(),
          notes: form.notes?.trim() || "",
          selectedWatchId: watchId!, selectedWatchName: watch?.name || watchId!, boxPrice: WATCH_PRICE,
          deliveryOption: delivery!, deliveryCost: DELIVERY_COST[delivery!], quantity: qty, total,
          clientRequestId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        trackFb("Purchase", { content_type: "product", content_ids: [watchId], value: total, currency: "DZD" });
        setSuccess(true); setTimeout(() => window.location.reload(), 10000);
      } else { setSubmitErr(result.error || "حدث خطأ. يرجى المحاولة مرة أخرى."); }
    } catch { setSubmitErr("فشل الاتصال. يرجى التحقق من الإنترنت."); }
    finally { setSubmitting(false); }
  };

  const slideV = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  const thumbs = useMemo(() => {
    const c = 5, h = Math.floor(c / 2);
    let s = cur - h; if (s < 0) s = 0; if (s + c > WATCHES.length) s = Math.max(0, WATCHES.length - c);
    return WATCHES.slice(s, s + c).map((w, i) => ({ ...w, idx: s + i }));
  }, [cur]);

  const inputCls = (err: boolean) =>
    `w-full border rounded-md px-4 py-3 text-sm bg-white placeholder-gray-400 transition-colors focus:outline-none focus:border-gray-500 ${err ? "border-red-400 bg-red-50/30" : "border-gray-300 hover:border-gray-400"}`;

  // ═══════════════════════════════════════════
  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f4f4] text-gray-900 w-full" suppressHydrationWarning>

  

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-800 text-lg tracking-wide">BS Monters</span>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900 transition-colors">الصفحة الرئيسية</a>
            <a href="#order" className="hover:text-gray-900 transition-colors">اطلب الآن</a>
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          MAIN — info+form (left) | images (right)
          ═══════════════════════════════════════════ */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* ── LEFT: INFO + FORM ── */}
          <div className="space-y-6 order-2 lg:order-1">

            {/* Product Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">بوكس الفخامة</h1>

            {/* Stock Urgency */}
            <p className="text-red-600 font-semibold text-sm">
              سارع! فقط <span className="font-black">{stock}</span> قطع متبقية في المخزن!
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold text-[#dc2626]">{formatDZD(WATCH_PRICE)}</span>
              <span className="text-xl text-gray-400 line-through">{formatDZD(OLD_PRICE)}</span>
            </div>

            {/* Live Viewers */}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>يشاهده</span>
              <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-sm">{viewers}</span>
              <span>متصفح في الوقت الحالي.</span>
            </div>

            {/* Progress Bar (animated stock) */}
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-progress-stripe"
                style={{ width: "35%", background: "repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #dc2626 10px, #dc2626 20px)" }}
              />
            </div>

            {/* Countdown Timer */}
            <CountdownTimer />

            {/* ─── ORDER FORM ─── */}
            <div id="order" className="pt-4 border-t border-gray-300">
              <h2 className="text-xl font-bold text-gray-800 mb-5">معلومات الزبون</h2>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Name + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div data-error={errors.fullName ? "true" : undefined}>
                    <input
                      type="text" value={form.fullName}
                      onChange={e => { setForm(f => ({ ...f, fullName: e.target.value })); setErrors(p => ({ ...p, fullName: undefined })); }}
                      placeholder="الاسم واللقب"
                      className={inputCls(!!errors.fullName)}
                    />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                  </div>
                  <div data-error={errors.phone ? "true" : undefined}>
                    <input
                      type="tel" value={form.phone} maxLength={10}
                      onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setForm(f => ({ ...f, phone: v })); setErrors(p => ({ ...p, phone: undefined })); }}
                      placeholder="رقم الهاتف"
                      className={inputCls(!!errors.phone)}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                </div>

                {/* Wilaya + Baladiya */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div data-error={errors.wilaya ? "true" : undefined}>
                    <input
                      type="text" value={form.wilaya}
                      onChange={e => { setForm(f => ({ ...f, wilaya: e.target.value })); setErrors(p => ({ ...p, wilaya: undefined })); }}
                      placeholder="الولاية"
                      className={inputCls(!!errors.wilaya)}
                    />
                    {errors.wilaya && <p className="text-red-500 text-xs mt-1">{errors.wilaya}</p>}
                  </div>
                  <div data-error={errors.baladiya ? "true" : undefined}>
                    <input
                      type="text" value={form.baladiya}
                      onChange={e => { setForm(f => ({ ...f, baladiya: e.target.value })); setErrors(p => ({ ...p, baladiya: undefined })); }}
                      placeholder="البلدية"
                      className={inputCls(!!errors.baladiya)}
                    />
                    {errors.baladiya && <p className="text-red-500 text-xs mt-1">{errors.baladiya}</p>}
                  </div>
                </div>

                {/* Model Selector (dropdown) */}
                <div data-error={errors.watch ? "true" : undefined}>
                  <select
                    value={watchId || ""}
                    onChange={e => selectWatch(e.target.value)}
                    className={`${inputCls(!!errors.watch)} cursor-pointer appearance-none`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "left 12px center" }}
                  >
                    <option value="">اختر رقم الموديل (ضروري)</option>
                    {WATCHES.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  {errors.watch && <p className="text-red-500 text-xs mt-1">{errors.watch}</p>}
                </div>

                {/* Notes */}
                <div>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="ملاحظات (اختياري) — عنوان تفصيلي أو رقم هاتف إضافي..."
                    rows={2}
                    className="w-full border rounded-md px-4 py-3 text-sm bg-white placeholder-gray-400 transition-colors focus:outline-none focus:border-gray-500 border-gray-300 hover:border-gray-400 resize-none"
                  />
                </div>

                {/* Delivery Options */}
                <div data-error={errors.delivery ? "true" : undefined}>
                  <p className="text-sm font-semibold text-gray-700 mb-2">طريقة التوصيل</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: "desk" as DeliveryOption, icon: Building2, label: "للمكتب", cost: DELIVERY_COST.desk },
                      { key: "home" as DeliveryOption, icon: Home, label: "للمنزل", cost: DELIVERY_COST.home },
                    ]).map(({ key, icon: Icon, label, cost }) => (
                      <button
                        key={key} type="button"
                        onClick={() => { setDelivery(key); setErrors(p => ({ ...p, delivery: undefined })); }}
                        className={`flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold transition-all ${
                          delivery === key ? "border-[#dc2626] bg-red-50 text-[#dc2626]" : "border-gray-300 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                        <span className="text-xs font-normal text-gray-400">({formatDZD(cost)})</span>
                      </button>
                    ))}
                  </div>
                  {errors.delivery && <p className="text-red-500 text-xs mt-1.5">{errors.delivery}</p>}
                </div>

                {/* Submit + Quantity Row */}
                <div className="flex items-stretch gap-3 pt-2">
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-gray-400 text-white text-lg font-bold py-4 rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /><span>جاري الإرسال...</span></>
                    ) : (
                      <span>اضغط هنا للطلب</span>
                    )}
                  </button>

                  {/* Quantity Selector */}
                  <div className="flex items-center border border-gray-300 rounded-md bg-white">
                    <button type="button" onClick={() => setQty(q => Math.min(q + 1, 10))} className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors rounded-r-md">
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-center font-bold text-gray-800 min-w-[40px] tabular-nums border-x border-gray-300">{qty}</span>
                    <button type="button" onClick={() => setQty(q => Math.max(q - 1, 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors rounded-l-md">
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Total if quantity > 1 */}
                {qty > 1 && (
                  <p className="text-center text-sm text-gray-600">
                    المجموع: <strong className="text-[#dc2626]">{formatDZD(total)}</strong> ({qty} قطع)
                  </p>
                )}

                {submitErr && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600 text-sm text-center">{submitErr}</div>
                )}
              </form>
            </div>
          </div>

          {/* ── RIGHT: IMAGE CAROUSEL (sticky) ── */}
          <div className="space-y-3 order-1 lg:order-2 lg:sticky lg:top-8">
            {/* Main Image */}
            <div
              className="relative aspect-square rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing select-none"
              onTouchStart={swipe.onStart}
              onTouchMove={swipe.onMove}
              onTouchEnd={swipe.onEnd}
            >
              <AnimatePresence initial={false} custom={dir} mode="wait">
                <motion.div
                  key={cur}
                  custom={dir}
                  variants={slideV}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <Image src={WATCHES[cur].image} alt={WATCHES[cur].name} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                </motion.div>
              </AnimatePresence>

              {/* Model name badge */}
              <div className="absolute bottom-4 right-4 z-10">
                <span className="bg-red-500/90 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-md">
                  بوكس رقم <span>{cur + 1}</span>
                </span>
              </div>

              {/* Arrows */}
              <button onClick={prev} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all" aria-label="السابق">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={next} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all" aria-label="التالي">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Thumbnails */}
            <div id="model-thumbnails" className="flex items-center gap-1.5 justify-center">
              <button onClick={prev} className="w-7 h-7 rounded bg-white hover:bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex gap-1.5 overflow-hidden">
                {thumbs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { goTo(t.idx); selectWatch(t.id); }}
                    className={`relative w-16 h-16 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${
                      cur === t.idx ? "border-gray-800 shadow-md" : "border-gray-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image src={t.image} alt={t.name} fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
              <button onClick={next} className="w-7 h-7 rounded bg-white hover:bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── SUCCESS MODAL ── */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح! ✅</h3>
              <p className="text-gray-500 mb-5 text-sm">سنتصل بك قريباً لتأكيد الطلب وترتيب التوصيل</p>
              <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm">
                <span className="text-gray-400">الإجمالي: </span>
                <span className="font-bold text-gray-900">{formatDZD(total)}</span>
              </div>
              <button onClick={() => window.location.reload()} className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors">حسناً</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <div className="border-t border-gray-300 bg-white mt-8">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center">
          <p className="text-gray-500 text-sm font-medium mb-6">BS Monters</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-sm">
            <div>
              <h4 className="font-bold text-gray-800 mb-2 border-b-2 border-[#dc2626] inline-block pb-1">عن المتجر</h4>
              <div className="space-y-1 text-gray-500">
                <p>عن المتجر</p>
                <p>طرق الدفع</p>
                <p>الشحن والتسليم</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-2 border-b-2 border-[#dc2626] inline-block pb-1">الشروط والسياسات</h4>
              <div className="space-y-1 text-gray-500">
                <p>شروط الاستخدام</p>
                <p>سياسة الاسترجاع</p>
                <p>سياسة الخصوصية</p>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-2 border-b-2 border-[#dc2626] inline-block pb-1">اتصل بنا</h4>
              <div className="space-y-1 text-gray-500">
                <p>اتصل بنا</p>
                <p>الأسئلة المتكررة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
