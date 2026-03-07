"use client";

import { useMemo, useState, useEffect } from "react";
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
  Package,
  Gift,
  Star,
  Eye,
} from "lucide-react";

// ============================================
// TYPES
// ============================================
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

// ============================================
// CONSTANTS
// ============================================

// Price
const BOX_PRICE = 2500;

// 10 Models (Included in Box)
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
];

// Delivery Costs
const DELIVERY_COST: Record<DeliveryOption, number> = {
  desk: 500,
  home: 800,
};

const API_URL = "/api/submit-order";

// ============================================
// META PIXEL SETUP
// ============================================

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
            win.fbq("init", "YOUR_PIXEL_ID");
            win.fbq("track", "PageView");
          }
        }, 100);
      }
    }
  } catch {
    // Silent fail
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
      if (typeof win.fbq === "function") {
        win.fbq("track", event, params);
      }
    }
  } catch {
    // Silent fail
  }
}

// ============================================
// UTILITIES
// ============================================

function formatDZD(v: number): string {
  try {
    return new Intl.NumberFormat("ar-DZ").format(v) + " دج";
  } catch {
    return v.toLocaleString() + " دج";
  }
}

// ============================================
// VALIDATION
// ============================================

interface ValidationErrors {
  fullName?: string;
  phone?: string;
  wilaya?: string;
  baladiya?: string;
  watch?: string;
  delivery?: string;
}

function validateForm(
  formData: FormData,
  selectedWatchId: string | null,
  deliveryOption: DeliveryOption | null,
): ValidationErrors {
  const errors: ValidationErrors = {};

  const name = formData.fullName?.trim() || "";
  if (name.length < 2) {
    errors.fullName = "الاسم الكامل مطلوب (حرفان على الأقل)";
  }

  const phone = (formData.phone || "").replace(/\D/g, "");
  if (phone.length < 9 || phone.length > 13) {
    errors.phone = "رقم الهاتف غير صالح";
  }

  if (!formData.wilaya?.trim()) {
    errors.wilaya = "الولاية مطلوبة";
  }

  if (!formData.baladiya?.trim()) {
    errors.baladiya = "البلدية مطلوبة";
  }

  if (!selectedWatchId) {
    errors.watch = "يرجى اختيار موديل الساعة";
  }

  if (!deliveryOption) {
    errors.delivery = "يرجى اختيار طريقة التوصيل";
  }

  return errors;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Page() {
  useEffect(() => {
    initMetaPixel();
  }, []);

  // State
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(
    null,
  );
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

  // Get Selected Watch
  const selectedWatch = useMemo(
    () => WATCHES.find((w) => w.id === selectedWatchId) || null,
    [selectedWatchId],
  );

  // Calculate Total Price
  const total = useMemo(() => {
    let price = BOX_PRICE;
    if (deliveryOption) {
      price += DELIVERY_COST[deliveryOption];
    }
    return price;
  }, [deliveryOption]);

  // Handlers
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";

    trackFb("ViewContent", {
      content_type: "product",
      content_ids: [WATCHES[index].id],
      content_name: WATCHES[index].name,
      value: BOX_PRICE,
      currency: "DZD",
    });
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % WATCHES.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + WATCHES.length) % WATCHES.length);
  };

  const handleWatchSelect = (watchId: string) => {
    setSelectedWatchId(watchId);
    setErrors((prev) => ({ ...prev, watch: undefined }));
    trackFb("AddToCart", {
      content_type: "product",
      content_ids: [watchId],
      value: BOX_PRICE,
      currency: "DZD",
    });
  };

  const handleDeliverySelect = (option: DeliveryOption) => {
    setDeliveryOption(option);
    setErrors((prev) => ({ ...prev, delivery: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(
      formData,
      selectedWatchId,
      deliveryOption,
    );
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstErrorElement = document.querySelector("[data-error='true']");
      firstErrorElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
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
        boxPrice: BOX_PRICE,
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
        setTimeout(() => {
          window.location.reload();
        }, 10000);
      } else {
        setSubmitError(result.error || "حدث خطأ. يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setSubmitError("فشل الاتصال. يرجى التحقق من الإنترنت.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styles - White, Brown, Red Theme
  const inputBaseClass =
    "w-full rounded-xl border px-4 py-3.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2";
  const inputNormalClass = `${inputBaseClass} border-amber-200 focus:border-amber-600 focus:ring-amber-600/10`;
  const inputErrorClass = `${inputBaseClass} border-red-300 focus:border-red-500 focus:ring-red-500/10`;

  return (
    <div dir="rtl" className="min-h-screen bg-white text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-amber-100 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-700 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-800">
                  متجر الساعات
                </h1>
                <p className="text-xs text-amber-700">أناقة وجودة</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-500">السعر</p>
              <p className="text-xl font-bold text-red-600">
                {formatDZD(BOX_PRICE)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-amber-50 to-white py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Main Product Image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-amber-100 shadow-xl border-4 border-amber-100">
              <Image
                src="/images/box/box.webp"
                alt="طقم الساعة الفاخر"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                عرض مميز
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur rounded-full text-sm font-medium text-slate-800 shadow">
                    <Gift className="w-4 h-4 text-amber-700" />
                    علبة فاخرة
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur rounded-full text-sm font-medium text-slate-800 shadow">
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                    ضمان سنة
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Content */}
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-red-600 mb-2">
                  منتج حصري
                </p>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
                  طقم ساعة فاخر
                  <span className="block text-amber-700 text-2xl md:text-3xl mt-2">
                    11 موديل متوفر
                  </span>
                </h1>
              </div>

              <p className="text-lg text-slate-600 leading-relaxed">
                احصل على طقم ساعة فاخر يشمل العلبة والإكسسوارات. اختر من 11
                موديل مميز بنفس السعر.
              </p>

              {/* Price Box */}
              <div className="bg-white rounded-2xl p-6 border-2 border-amber-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">السعر شامل الموديل</p>
                    <p className="text-4xl font-bold text-red-600">
                      {formatDZD(BOX_PRICE)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      اختر أي موديل من الـ 11 متاح
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-700 rounded-2xl flex items-center justify-center mb-2">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-xs text-slate-500">11 موديل</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>11 موديل للاختيار</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>علبة فاخرة</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>ضمان سنة كاملة</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span>دفع عند الاستلام</span>
                </div>
              </div>

              <a
                href="#models"
                className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                onClick={() => trackFb("InitiateCheckout")}
              >
                <Eye className="w-5 h-5" />
                شاهد الموديلات
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Models Gallery */}
      <section id="models" className="py-16 bg-amber-50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-700 border border-amber-200 rounded-full text-sm font-semibold mb-4">
              <Star className="w-4 h-4 text-red-600" />
              11 موديل متاح
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              اختر موديلك المفضل
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              جميع الموديلات متضمنة في السعر. اضغط على أي صورة لمشاهدتها
              بالتفصيل
            </p>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {WATCHES.map((watch, index) => (
              <motion.div
                key={watch.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-amber-100"
                onClick={() => openLightbox(index)}
              >
                <div className="aspect-[4/5] relative">
                  <Image
                    src={watch.image}
                    alt={watch.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover"
                    loading={index < 5 ? "eager" : "lazy"}
                  />

                  {/* Model Number */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-700 text-white rounded-full text-sm font-bold shadow">
                      {index + 1}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <p className="font-medium text-slate-800 text-sm text-center">
                    {watch.name}
                  </p>
                  <p className="text-red-600 text-xs text-center mt-1">
                    متضمن في السعر
                  </p>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-amber-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-semibold flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    عرض التفاصيل
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Selection Note */}
          <div className="mt-8 text-center">
            <p className="text-slate-700 bg-white inline-block px-6 py-3 rounded-full shadow-sm border border-amber-200">
              اختر الموديل في نموذج الطلب أدناه
            </p>
          </div>
        </div>
      </section>

      {/* Order Form */}
      <section id="order" className="py-16 bg-white">
        <div className="mx-auto max-w-2xl px-4">
          <div className="bg-amber-50 rounded-3xl shadow-xl p-8 md:p-12 border border-amber-200">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                أكمل طلبك
              </h2>
              <p className="text-slate-600">اختر الموديل واملأ بياناتك</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Model Selection (Required) */}
              <div
                className="bg-white rounded-2xl p-6 border-2 border-amber-300"
                data-error={errors.watch ? "true" : undefined}
              >
                <label className="block text-sm font-bold text-slate-800 mb-3">
                  اختر موديل الساعة *
                </label>

                <select
                  value={selectedWatchId || ""}
                  onChange={(e) => handleWatchSelect(e.target.value)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm focus:outline-none focus:ring-2 appearance-none bg-white cursor-pointer ${
                    errors.watch
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                      : "border-amber-200 focus:border-amber-600 focus:ring-amber-600/10"
                  }`}
                  style={{ backgroundImage: "none" }}
                >
                  <option value="">-- اختر موديل --</option>
                  {WATCHES.map((watch) => (
                    <option key={watch.id} value={watch.id}>
                      {watch.name}
                    </option>
                  ))}
                </select>

                <p className="text-xs text-slate-500 mt-2">
                  جميع الموديلات بنفس السعر {formatDZD(BOX_PRICE)}
                </p>

                {errors.watch && (
                  <p className="text-red-500 text-sm mt-2 font-medium">
                    {errors.watch}
                  </p>
                )}

                {/* Selected Model Preview */}
                {selectedWatch && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-4 border-t border-amber-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-amber-200">
                        <Image
                          src={selectedWatch.image}
                          alt={selectedWatch.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">
                          {selectedWatch.name}
                        </p>
                        <p className="text-emerald-600 text-sm font-medium">
                          تم الاختيار
                        </p>
                        <p className="text-red-600 font-bold">
                          {formatDZD(BOX_PRICE)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-error={errors.fullName ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    الاسم الكامل *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData((f) => ({
                          ...f,
                          fullName: e.target.value,
                        }));
                        setErrors((prev) => ({ ...prev, fullName: undefined }));
                      }}
                      placeholder="أحمد محمد"
                      className={
                        errors.fullName ? inputErrorClass : inputNormalClass
                      }
                    />
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.fullName && (
                    <p className="text-red-500 text-sm mt-2">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div data-error={errors.phone ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    رقم الهاتف *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, phone: e.target.value }));
                        setErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      placeholder="0555 123 456"
                      className={
                        errors.phone ? inputErrorClass : inputNormalClass
                      }
                    />
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-2">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-error={errors.wilaya ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    الولاية *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.wilaya}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, wilaya: e.target.value }));
                        setErrors((prev) => ({ ...prev, wilaya: undefined }));
                      }}
                      placeholder="مثال: الجزائر العاصمة"
                      className={
                        errors.wilaya ? inputErrorClass : inputNormalClass
                      }
                    />
                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.wilaya && (
                    <p className="text-red-500 text-sm mt-2">{errors.wilaya}</p>
                  )}
                </div>

                <div data-error={errors.baladiya ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    البلدية *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.baladiya}
                      onChange={(e) => {
                        setFormData((f) => ({
                          ...f,
                          baladiya: e.target.value,
                        }));
                        setErrors((prev) => ({ ...prev, baladiya: undefined }));
                      }}
                      placeholder="مثال: باب الزوار"
                      className={
                        errors.baladiya ? inputErrorClass : inputNormalClass
                      }
                    />
                    <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                  {errors.baladiya && (
                    <p className="text-red-500 text-sm mt-2">
                      {errors.baladiya}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Options */}
              <div data-error={errors.delivery ? "true" : undefined}>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  طريقة التوصيل *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Desk Delivery */}
                  <button
                    type="button"
                    onClick={() => handleDeliverySelect("desk")}
                    className={`relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                      deliveryOption === "desk"
                        ? "border-amber-600 bg-amber-50"
                        : "border-amber-200 hover:border-amber-400"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        deliveryOption === "desk"
                          ? "border-amber-600"
                          : "border-slate-300"
                      }`}
                    >
                      {deliveryOption === "desk" && (
                        <div className="w-3 h-3 rounded-full bg-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-700" />
                        <span className="font-bold text-slate-800">
                          توصيل للمكتب
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        استلام من مكتبنا
                      </p>
                      <p className="text-lg font-bold text-red-600 mt-2">
                        {formatDZD(DELIVERY_COST.desk)}
                      </p>
                    </div>
                  </button>

                  {/* Home Delivery */}
                  <button
                    type="button"
                    onClick={() => handleDeliverySelect("home")}
                    className={`relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                      deliveryOption === "home"
                        ? "border-amber-600 bg-amber-50"
                        : "border-amber-200 hover:border-amber-400"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        deliveryOption === "home"
                          ? "border-amber-600"
                          : "border-slate-300"
                      }`}
                    >
                      {deliveryOption === "home" && (
                        <div className="w-3 h-3 rounded-full bg-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-amber-700" />
                        <span className="font-bold text-slate-800">
                          توصيل للمنزل
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        توصيل حتى باب المنزل
                      </p>
                      <p className="text-lg font-bold text-red-600 mt-2">
                        {formatDZD(DELIVERY_COST.home)}
                      </p>
                    </div>
                  </button>
                </div>
                {errors.delivery && (
                  <p className="text-red-500 text-sm mt-3">{errors.delivery}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="عنوان تفصيلي أو ملاحظات خاصة..."
                  className="w-full rounded-xl border border-amber-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/10 focus:border-amber-600 resize-none"
                />
              </div>

              {/* Total & Submit */}
              <div className="pt-6 border-t border-amber-200">
                {/* Price Summary */}
                <div className="bg-white rounded-xl p-4 mb-6 border border-amber-200">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-slate-700">الطقم + الموديل المختار</p>
                      <p className="text-xs text-slate-500">
                        {selectedWatch ? selectedWatch.name : "لم يتم الاختيار"}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-800">
                      {formatDZD(BOX_PRICE)}
                    </p>
                  </div>

                  {deliveryOption && (
                    <div className="flex items-center justify-between py-2 border-t border-amber-100">
                      <p className="text-slate-700">
                        {deliveryOption === "desk"
                          ? "توصيل للمكتب"
                          : "توصيل للمنزل"}
                      </p>
                      <p className="font-semibold text-slate-800">
                        + {formatDZD(DELIVERY_COST[deliveryOption])}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-amber-300">
                    <p className="font-bold text-slate-800">المجموع الكلي</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatDZD(total)}
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      تأكيد الطلب
                    </>
                  )}
                </button>

                {submitError && (
                  <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm text-center">
                    {submitError}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-amber-900/95 z-50 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 left-6 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl mx-4 aspect-[3/4] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={WATCHES[lightboxIndex].image}
                alt={WATCHES[lightboxIndex].name}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 896px"
                priority
              />

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-900/80 to-transparent p-8">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/60 text-sm mb-1">
                      موديل {lightboxIndex + 1} من {WATCHES.length}
                    </p>
                    <p className="text-white text-2xl font-bold">
                      {WATCHES[lightboxIndex].name}
                    </p>
                    <p className="text-red-400 text-xl font-bold mt-1">
                      متضمن في السعر
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {WATCHES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === lightboxIndex ? "bg-red-500 w-6" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-amber-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-red-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                تم استلام طلبك!
              </h3>

              <p className="text-slate-600 mb-6 text-lg">
                سنقوم بالاتصال بك قريباً لتأكيد طلبك
              </p>

              <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
                <div className="text-sm text-slate-500 mb-1">رقم الطلب</div>
                <div className="text-xl font-bold text-slate-800">
                  #{Date.now().toString().slice(-6)}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  الإجمالي: {formatDZD(total)}
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl"
              >
                إعادة تحميل الآن
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-amber-50 border-t border-amber-200 text-slate-600 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} جميع الحقوق محفوظة
          </p>
        </div>
      </footer>
    </div>
  );
}
