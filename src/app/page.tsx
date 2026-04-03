"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
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
  X,
  ChevronLeft,
  ChevronRight,
  Gift,
  Eye,
  Truck,
  Clock,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type DeliveryOption = "desk" | "home";

interface FormData {
  fullName: string;
  phone: string;
  wilaya: string;
  baladiya: string;
  notes?: string;
}

interface WatchItem {
  id: string;
  name: string;
  image: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const WATCH_PRICE = 1500;
const OLD_PRICE = 2000;

const WATCHES: WatchItem[] = [
  { id: "model-1", name: "موديل 1", image: "/images/watches/1.webp" },
  { id: "model-2", name: "موديل 2", image: "/images/watches/2.webp" },
  { id: "model-3", name: "موديل 3", image: "/images/watches/3.webp" },
  { id: "model-4", name: "موديل 4", image: "/images/watches/4.webp" },
  { id: "model-5", name: "موديل 5", image: "/images/watches/5.webp" },
  { id: "model-6", name: "موديل 6", image: "/images/watches/6.webp" },
  { id: "model-7", name: "موديل 7", image: "/images/watches/7.webp" },
  { id: "model-8", name: "موديل 8", image: "/images/watches/8.webp" },
  { id: "model-9", name: "موديل 9", image: "/images/watches/9.webp" },
  { id: "model-10", name: "موديل 10", image: "/images/watches/10.webp" },
  { id: "model-11", name: "موديل 11", image: "/images/watches/11.webp" },
  { id: "model-12", name: "موديل 12", image: "/images/watches/12.webp" },
  { id: "model-13", name: "موديل 13", image: "/images/watches/13.webp" },
  { id: "model-14", name: "موديل 14", image: "/images/watches/14.webp" },
];

const DELIVERY_COST: Record<DeliveryOption, number> = {
  desk: 500,
  home: 800,
};

const API_URL = "/api/submit-order";

// ─────────────────────────────────────────────
// META PIXEL
// ─────────────────────────────────────────────
function initMetaPixel(): void {
  try {
    if (typeof window !== "undefined") {
      const win = window as unknown as {
        fbq?: (
          action: string,
          eventName: string,
          params?: Record<string, unknown>,
        ) => void;
        _fbq?: unknown;
      };
      if (!win.fbq) {
        const script = document.createElement("script");
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
        `;
        document.head.appendChild(script);
        setTimeout(() => {
          if (win.fbq) {
            win.fbq("init", "1301109644932375");
            win.fbq("track", "PageView");
          }
        }, 100);
      }
    }
  } catch {
    /* silent */
  }
}

function trackFb(event: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window !== "undefined") {
      const win = window as unknown as {
        fbq?: (
          action: string,
          eventName: string,
          params?: Record<string, unknown>,
        ) => void;
      };
      if (typeof win.fbq === "function") win.fbq("track", event, params);
    }
  } catch {
    /* silent */
  }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function formatDZD(v: number): string {
  try {
    return new Intl.NumberFormat("ar-DZ").format(v) + " دج";
  } catch {
    return v.toLocaleString() + " دج";
  }
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────
interface ValidationErrors {
  fullName?: string;
  phone?: string;
  wilaya?: string;
  baladiya?: string;
  watch?: string;
  delivery?: string;
}

function validatePhone(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "أدخل رقم الهاتف";
  if (digits.length < 10) return "الرقم قصير — يجب أن يكون 10 أرقام";
  if (digits.length > 10) return "الرقم طويل — يجب أن يكون 10 أرقام";
  if (!/^0[567]/.test(digits)) return "الرقم يجب أن يبدأ بـ 05 أو 06 أو 07";
  return undefined;
}

function validateName(raw: string): string | undefined {
  const name = raw.trim();
  if (!name) return "أدخل اسمك الكامل";
  if (name.length < 3) return "الاسم قصير جداً";
  return undefined;
}

function validateForm(
  formData: FormData,
  selectedWatchId: string | null,
  deliveryOption: DeliveryOption | null,
): ValidationErrors {
  const errors: ValidationErrors = {};
  const nameErr = validateName(formData.fullName || "");
  if (nameErr) errors.fullName = nameErr;
  const phoneErr = validatePhone(formData.phone || "");
  if (phoneErr) errors.phone = phoneErr;
  if (!formData.wilaya?.trim()) errors.wilaya = "اختر أو اكتب اسم الولاية";
  if (!formData.baladiya?.trim()) errors.baladiya = "اكتب اسم البلدية أو الحي";
  if (!selectedWatchId) errors.watch = "اختر الموديل الذي يعجبك أعلاه";
  if (!deliveryOption) errors.delivery = "اختر طريقة التوصيل المناسبة لك";
  return errors;
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Page() {
  useEffect(() => {
    initMetaPixel();
  }, []);

  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    phone: "",
    wilaya: "",
    baladiya: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setHeroIdx((p) => (p + 1) % WATCHES.length),
      3500,
    );
    return () => clearInterval(timer);
  }, []);

  const selectedWatch = useMemo(
    () => WATCHES.find((w) => w.id === selectedWatchId) || null,
    [selectedWatchId],
  );

  const total = useMemo(() => {
    let price = WATCH_PRICE;
    if (deliveryOption) price += DELIVERY_COST[deliveryOption];
    return price;
  }, [deliveryOption]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
    trackFb("ViewContent", {
      content_type: "product",
      content_ids: [WATCHES[index].id],
      content_name: WATCHES[index].name,
      value: WATCH_PRICE,
      currency: "DZD",
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  }, []);

  const nextImage = () => setLightboxIndex((p) => (p + 1) % WATCHES.length);
  const prevImage = () =>
    setLightboxIndex((p) => (p - 1 + WATCHES.length) % WATCHES.length);

  const handleWatchSelect = (watchId: string) => {
    setSelectedWatchId(watchId);
    setErrors((prev) => ({ ...prev, watch: undefined }));
    trackFb("AddToCart", {
      content_type: "product",
      content_ids: [watchId],
      value: WATCH_PRICE,
      currency: "DZD",
    });
  };

  const handleDeliverySelect = (option: DeliveryOption) => {
    setDeliveryOption(option);
    setErrors((prev) => ({ ...prev, delivery: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(formData, selectedWatchId, deliveryOption);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const el = document.querySelector("[data-error='true']");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderData = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        wilaya: formData.wilaya.trim(),
        baladiya: formData.baladiya.trim(),
        selectedWatchId: selectedWatchId!,
        selectedWatchName: selectedWatch?.name || selectedWatchId!,
        boxPrice: WATCH_PRICE,
        deliveryOption: deliveryOption!,
        deliveryCost: DELIVERY_COST[deliveryOption!],
        total,
        notes: formData.notes?.trim(),
        clientRequestId:
          crypto.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        trackFb("Purchase", {
          content_type: "product",
          content_ids: [selectedWatchId],
          value: total,
          currency: "DZD",
        });
        setShowSuccess(true);
        setTimeout(() => window.location.reload(), 10000);
      } else {
        setSubmitError(result.error || "حدث خطأ. يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setSubmitError("فشل الاتصال. يرجى التحقق من الإنترنت.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (hasError: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-300 bg-red-50/30 focus:ring-red-200 focus:border-red-400"
        : "border-gray-200 bg-white focus:ring-amber-100 focus:border-amber-400 hover:border-gray-300"
    }`;

  // ═════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════
  return (
    <div dir="rtl" className="min-h-screen bg-white text-gray-900">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">BS</span>
              </div>
              <span className="font-bold text-gray-900">BS Monters</span>
            </div>
            <a
              href="#order"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              onClick={() => trackFb("InitiateCheckout")}
            >
              <ShoppingCart className="w-4 h-4" />
              اطلب الآن
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-lg"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={heroIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={WATCHES[heroIdx].image}
                    alt={WATCHES[heroIdx].name}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Price badge */}
              <div className="absolute top-4 right-4">
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  خصم {Math.round(((OLD_PRICE - WATCH_PRICE) / OLD_PRICE) * 100)}%
                </span>
              </div>

              {/* Model name */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {WATCHES[heroIdx].name}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatDZD(WATCH_PRICE)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              <div>
                <p className="text-amber-600 text-sm font-semibold mb-3">
                  الأكثر مبيعاً في الجزائر
                </p>
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
                  ساعات أنيقة بسعر
                  <span className="text-amber-600"> استثنائي</span>
                </h1>
              </div>

              <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-md">
                14 موديل حصري بتصميم عصري. كل ساعة تأتي مع طقم إكسسوارات كامل
                وتوصيل لجميع الولايات.
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-gray-900">
                  {formatDZD(WATCH_PRICE)}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  {formatDZD(OLD_PRICE)}
                </span>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                {[
                  { icon: Gift, text: "طقم إكسسوارات مجاني" },
                  { icon: ShieldCheck, text: "ضمان سنة كاملة" },
                  { icon: Truck, text: "الدفع عند الاستلام" },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-amber-600" />
                    {text}
                  </span>
                ))}
              </div>

              <a
                href="#order"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors text-base"
                onClick={() => trackFb("InitiateCheckout")}
              >
                <ShoppingCart className="w-5 h-5" />
                اطلب الآن — {formatDZD(WATCH_PRICE)}
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section id="models" className="py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              اختر الموديل المفضل لديك
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              اضغط على أي صورة لمشاهدتها بالتفصيل
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {WATCHES.map((watch, index) => (
              <motion.div
                key={watch.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: index * 0.03, duration: 0.35 }}
                className="group relative rounded-xl overflow-hidden bg-gray-50 cursor-pointer border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all duration-200"
                onClick={() => openLightbox(index)}
              >
                <div className="aspect-[4/5] relative overflow-hidden">
                  <Image
                    src={watch.image}
                    alt={watch.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    loading={index < 5 ? "eager" : "lazy"}
                  />
                  <div className="absolute top-2 right-2">
                    <span className="w-6 h-6 bg-gray-900/60 text-white rounded-md text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="p-2.5 text-center">
                  <p className="font-medium text-gray-800 text-sm">{watch.name}</p>
                  <p className="text-amber-600 text-xs font-semibold mt-0.5">
                    {formatDZD(WATCH_PRICE)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ORDER FORM ── */}
      <section id="order" className="py-14 md:py-20 bg-gray-50">
        <div className="mx-auto max-w-xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                أكمل طلبك
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                سنتصل بك لتأكيد الطلب وترتيب التوصيل
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Model Selection */}
              <div
                className={`rounded-xl p-4 transition-colors ${
                  errors.watch
                    ? "bg-red-50 border border-red-200"
                    : selectedWatch
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-50 border border-gray-100"
                }`}
                data-error={errors.watch ? "true" : undefined}
              >
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  موديل الساعة
                </label>
                <select
                  value={selectedWatchId || ""}
                  onChange={(e) => handleWatchSelect(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 appearance-none cursor-pointer"
                >
                  <option value="">— اختر الموديل —</option>
                  {WATCHES.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                {errors.watch && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.watch}</p>
                )}

                <AnimatePresence>
                  {selectedWatch && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-200/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-emerald-200">
                          <Image
                            src={selectedWatch.image}
                            alt={selectedWatch.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{selectedWatch.name}</p>
                          <p className="text-emerald-600 text-xs">{formatDZD(WATCH_PRICE)}</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div data-error={errors.fullName ? "true" : undefined}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, fullName: e.target.value }));
                        setErrors((p) => ({ ...p, fullName: undefined }));
                      }}
                      placeholder="أحمد بوعلام"
                      className={inputStyle(!!errors.fullName)}
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div data-error={errors.phone ? "true" : undefined}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone}
                      maxLength={10}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData((f) => ({ ...f, phone: val }));
                        setErrors((p) => ({ ...p, phone: undefined }));
                      }}
                      placeholder="0555123456"
                      className={inputStyle(!!errors.phone)}
                    />
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div data-error={errors.wilaya ? "true" : undefined}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الولاية</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.wilaya}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, wilaya: e.target.value }));
                        setErrors((p) => ({ ...p, wilaya: undefined }));
                      }}
                      placeholder="الجزائر العاصمة"
                      className={inputStyle(!!errors.wilaya)}
                    />
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.wilaya && <p className="text-red-500 text-xs mt-1">{errors.wilaya}</p>}
                </div>

                <div data-error={errors.baladiya ? "true" : undefined}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البلدية</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.baladiya}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, baladiya: e.target.value }));
                        setErrors((p) => ({ ...p, baladiya: undefined }));
                      }}
                      placeholder="باب الزوار"
                      className={inputStyle(!!errors.baladiya)}
                    />
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.baladiya && <p className="text-red-500 text-xs mt-1">{errors.baladiya}</p>}
                </div>
              </div>

              {/* Delivery */}
              <div data-error={errors.delivery ? "true" : undefined}>
                <label className="block text-sm font-medium text-gray-700 mb-2">طريقة التوصيل</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "desk" as DeliveryOption, icon: Building2, label: "للمكتب", cost: DELIVERY_COST.desk },
                    { key: "home" as DeliveryOption, icon: Home, label: "للمنزل", cost: DELIVERY_COST.home },
                  ].map(({ key, icon: Icon, label, cost }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDeliverySelect(key)}
                      className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all text-center ${
                        deliveryOption === key
                          ? "border-amber-400 bg-amber-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${deliveryOption === key ? "text-amber-600" : "text-gray-400"}`} />
                      <span className="font-semibold text-gray-800 text-sm">{label}</span>
                      <span className="text-xs text-gray-500">{formatDZD(cost)}</span>
                    </button>
                  ))}
                </div>
                {errors.delivery && <p className="text-red-500 text-xs mt-1.5">{errors.delivery}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="عنوان تفصيلي أو رقم هاتف إضافي..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 resize-none bg-white hover:border-gray-300 transition-all duration-200"
                />
              </div>

              {/* Summary + Submit */}
              <div className="pt-4 border-t border-gray-100">
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      الساعة {selectedWatch ? `(${selectedWatch.name})` : ""}
                    </span>
                    <span className="font-medium text-gray-800">{formatDZD(WATCH_PRICE)}</span>
                  </div>
                  {deliveryOption && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        التوصيل {deliveryOption === "home" ? "للمنزل" : "للمكتب"}
                      </span>
                      <span className="font-medium text-gray-800">
                        {formatDZD(DELIVERY_COST[deliveryOption])}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">المجموع</span>
                    <span className="font-bold text-lg text-gray-900">{formatDZD(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      تأكيد الطلب — {formatDZD(total)}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> آمن 100%
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> توصيل 24-48h
                  </span>
                </div>

                {submitError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm text-center">
                    {submitError}
                  </div>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl mx-4 aspect-[3/4] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={WATCHES[lightboxIndex].image}
                alt={WATCHES[lightboxIndex].name}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 672px"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <p className="text-white/50 text-xs">{lightboxIndex + 1} / {WATCHES.length}</p>
                <p className="text-white text-xl font-bold mt-1">{WATCHES[lightboxIndex].name}</p>
                <p className="text-amber-400 font-bold mt-0.5">{formatDZD(WATCH_PRICE)}</p>
              </div>
            </motion.div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {WATCHES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  className={`h-1 rounded-full transition-all ${
                    idx === lightboxIndex ? "bg-white w-5" : "bg-white/30 w-1"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUCCESS MODAL ── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك</h3>
              <p className="text-gray-500 mb-5 text-sm">سنتصل بك قريباً لتأكيد الطلب</p>
              <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm">
                <span className="text-gray-400">الإجمالي: </span>
                <span className="font-bold text-gray-900">{formatDZD(total)}</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                حسناً
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-6">
        <p className="text-center text-xs text-gray-400">
          {new Date().getFullYear()} BS Monters — جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
}
