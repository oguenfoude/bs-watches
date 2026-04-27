"use client";
/* eslint-disable */

import { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import CountdownTimer from "../components/ui/CountdownTimer";
import ProductCarousel from "../components/ui/ProductCarousel";
import wilayas from "./data/algerian-wilayas.json";
import cities from "./data/algeria-cities.json";

type DeliveryOption = "home" | "office";

type FormData = {
  fullName: string;
  phone: string;
  wilayaId?: number;
  baladiya?: string;
  notes?: string;
};

type WatchItem = { id: string; name: string; image: string };

// Types for JSON data
type WilayaItem = { id: number; name_ar: string; name_fr?: string };
type CityWilaya = {
  code: string;
  name_ar: string;
  name_fr?: string;
  baladiyat: Array<{ name_ar: string; name_fr?: string }>;
};
type CitiesData = { wilayas: CityWilaya[] };

const WATCHES: WatchItem[] = Array.from({ length: 20 }).map((_, i) => {
  const idx = i + 1;
  return { id: `w${idx}`, name: `ساعة رقم ${idx}`, image: `/images/watches/${idx}.jpg` };
});

const BASE_PRICE = 2500; // دج — السعر الخاص للعرض
const DELIVERY_COST: Record<DeliveryOption, number> = {
  home: 700,
  office: 450,
};

const TOTAL_STEPS = 5 as const; // يشمل شاشة النجاح
const FLOW_STEPS = 4 as const; // عدد الخطوات قبل النجاح

const API_URL = "/api/submit-order";

// Helpers
const pad2 = (n: number) => n.toString().padStart(2, "0");

// Meta Pixel safe tracker
declare global {
  interface Window {
    fbq?: (action: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}
function trackFb(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      window.fbq("track", event, params);
    } catch {}
  }
}

function useWilayaOptions() {
  // Sort by id to keep consistent order
  const options = useMemo(
    () =>
      (wilayas as Array<WilayaItem>)
        .slice()
        .sort((a, b) => a.id - b.id)
        .map((w) => ({ value: w.id, label: w.name_ar })),
    []
  );
  return options;
}

function useBaladiyaOptions(wilayaId?: number) {
  const list = useMemo(() => {
    if (!wilayaId) return [] as string[];
    const code = pad2(wilayaId);
    const wilaya = (cities as CitiesData).wilayas.find((w) => w.code === code);
    if (!wilaya) return [] as string[];
    const names: string[] = (wilaya.baladiyat || [])
      .map((b) => (b?.name_ar || "").toString().trim())
      .filter(Boolean);
    // unique + sort
    const unique: string[] = Array.from(new Set(names));
    unique.sort((a: string, b: string) => a.localeCompare(b, "ar"));
    return unique;
  }, [wilayaId]);
  return list;
}

function formatDZD(v: number) {
  try {
    return new Intl.NumberFormat("ar-DZ").format(v) + " دج";
  } catch {
    return v.toLocaleString() + " دج";
  }
}

function CheckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={className}
    >
      <path d="M20 7L10 17l-6-6" />
    </svg>
  );
}

export default function Page() {
  const [step, setStep] = useState<number>(1);
  const prevStepRef = useRef<number>(1);
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(null);
  const [formData, setFormData] = useState<FormData>({ fullName: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const wilayaOptions = useWilayaOptions();
  const baladiyaOptions = useBaladiyaOptions(formData.wilayaId);
  const selectedWatch = useMemo(() => WATCHES.find((w) => w.id === selectedWatchId) || null, [selectedWatchId]);

  const total = useMemo(() => {
    if (!deliveryOption) return BASE_PRICE;
    return BASE_PRICE + DELIVERY_COST[deliveryOption];
  }, [deliveryOption]);
  const progress = useMemo(() => {
    const current = Math.min(step, Number(FLOW_STEPS));
    return (current / Number(FLOW_STEPS)) * 100;
  }, [step]);
  const stepName = useMemo(() => {
    switch (step) {
      case 1:
        return "ابدأ";
      case 2:
        return "اختيار الساعة";
      case 3:
        return "ملخص الطلب";
      case 4:
        return "بيانات التوصيل";
      default:
        return "تم";
    }
  }, [step]);

  // Clear baladiya when wilaya changes
  useEffect(() => {
    setFormData((fd) => ({ ...fd, baladiya: undefined }));
  }, [formData.wilayaId]);

  // Smoothly scroll to top on step change (better on phones)
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  // store previous step for potential analytics comparisons
  prevStepRef.current = step;
  }, [step]);

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!selectedWatchId) errs["watch"] = "الرجاء اختيار ساعة.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!deliveryOption) errs["delivery"] = "الرجاء اختيار طريقة التوصيل.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep5 = () => {
    const errs: Record<string, string> = {};
    const name = formData.fullName?.trim() || "";
    const phone = (formData.phone || "").replace(/\D/g, "");
    if (name.length < 2) errs["fullName"] = "الاسم الكامل مطلوب (حرفان على الأقل).";
    if (phone.length < 9 || phone.length > 13) errs["phone"] = "رقم هاتف غير صالح.";
    if (!formData.wilayaId) errs["wilayaId"] = "الولاية مطلوبة.";
    if (!formData.baladiya) errs["baladiya"] = "البلدية مطلوبة.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;

    // Fire InitiateCheckout when moving from summary to checkout
    if (step === 3) {
      const content = selectedWatchId ? [{ id: selectedWatchId, quantity: 1, item_price: BASE_PRICE }] : undefined;
      trackFb("InitiateCheckout", {
        value: total,
        currency: "DZD",
        contents: content,
        content_type: content ? "product" : undefined,
      });
    }

    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submitOrder = async () => {
    if (!validateStep5()) return;
    if (typeof window !== "undefined" && !navigator.onLine) {
      setSubmitError("❌ لا يوجد اتصال بالإنترنت. تأكد من الاتصال وحاول مرة أخرى.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const payload = {
      fullName: formData.fullName.trim(),
      phone: (formData.phone || "").replace(/\D/g, ""),
      wilayaId: formData.wilayaId,
      wilayaNameAr: wilayaOptions.find((w) => w.value === formData.wilayaId)?.label || "",
      baladiyaNameAr: formData.baladiya || "",
      selectedWatchId,
      deliveryOption,
      total,
      timestamp: new Date().toISOString(),
    };

    const attempt = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // وقت مناسب لـ API route + Google Script
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("REQUEST_FAILED");
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "REQUEST_FAILED");
        return true;
      } catch (error) {
        clearTimeout(timeout);
        console.error('خطأ في الإرسال:', error);
        return false;
      }
    };

    // محاولة واحدة مع وقت مناسب للـ API route
    const ok = await attempt();
    if (!ok) {
      setIsSubmitting(false);
      setSubmitError("⚠️ تعذّر إرسال الطلب. تأكد من اتصال الإنترنت وحاول مرة أخرى.");
      return;
    }

  setIsSubmitting(false);
  
  // Fire Lead event for successful order
  trackFb('Lead', {
    value: total,
    currency: 'DZD',
    content_name: 'Watch Order Completed'
  });
  
  setStep(5);
  };

  const ctaText = useMemo(() => {
    switch (step) {
      case 1:
        return "اختر ساعتك الآن";
      case 2:
        return "التالي";
      case 3:
        return "التالي";
      case 4:
        return isSubmitting ? "⏳ جارٍ إرسال طلبك..." : "✅ تأكيد الطلب الآن";
  case 5:
        return "🏠 طلب ساعة أخرى";
      default:
        return "التالي";
    }
  }, [step, isSubmitting]);

  const onPrimary = () => {
    if (step === 4) return submitOrder();
    if (step === 5) {
      // reset
      setSelectedWatchId(null);
      setDeliveryOption(null);
      setFormData({ fullName: "", phone: "" });
      setErrors({});
      setSubmitError(null);
      setStep(1);
      return;
    }
    next();
  };

  const disablePrimary = step === 2 && !selectedWatchId ? true : step === 3 && !deliveryOption ? true : step === 4 && isSubmitting ? true : false;

  // Watch selection handler with Pixel event
  const handleSelectWatch = (id: string) => {
    setSelectedWatchId(id);
    const w = WATCHES.find((x) => x.id === id);
    trackFb("AddToCart", {
      content_type: "product",
      content_ids: [id],
      content_name: w?.name,
      value: BASE_PRICE,
      currency: "DZD",
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      {/* Header */}
      <Header cartCount={selectedWatchId ? 1 : 0} cartTotal={selectedWatchId ? formatDZD(total) : "0 د.ج"} />
      
      {/* Hero Section */}
      <section id="home" className="relative bg-gradient-to-br from-red-50 via-white to-orange-50 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Product Info */}
            <div className="text-center lg:text-right space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-4">
                  الساعة الرجالية <span className="text-red-600">الأكثر طلباً</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  متبقي فقط <span className="font-bold text-orange-600">5 قطع</span> من المخزون المحترف
                </p>
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-red-100">
                <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                  <span className="text-5xl md:text-6xl font-black text-red-600">{formatDZD(BASE_PRICE)}</span>
                  <div className="text-right">
                    <span className="text-2xl text-gray-500 line-through block">{formatDZD(2990)}</span>
                    <span className="text-sm text-green-600 font-bold">وفر 490 د.ج</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg text-center">
                  <span className="font-bold">🔥 عرض محدود - فقط لفترة قصيرة!</span>
                </div>
              </div>

              {/* Countdown Timer */}
              <CountdownTimer />

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">جودة عالية</h3>
                      <p className="text-sm text-gray-600">ضمان شامل</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xl">🚚</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">توصيل سريع</h3>
                      <p className="text-sm text-gray-600">24-48 ساعة</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => {
                  document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                مشاهدة في الوقت الحالي ❓
              </button>
            </div>

            {/* Right: Product Image */}
            <div className="order-first lg:order-last">
              <ProductCarousel 
                images={selectedWatchId ? [WATCHES.find(w => w.id === selectedWatchId)?.image || "/images/watches/1.jpg"] : ["/images/watches/1.jpg"]}
                productName="ساعة فاخرة"
                className="max-w-md mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Watch Selection Section */}
      <section id="products" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              اختر ساعتك المفضلة
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              تشكيلة من 20 ساعة فاخرة بأعلى جودة. كل الصور حقيقية مصورة من طرفنا
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {WATCHES.map((watch, index) => {
              const selected = selectedWatchId === watch.id;
              return (
                <button
                  key={watch.id}
                  onClick={() => handleSelectWatch(watch.id)}
                  className={`group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-3 md:p-4 ${
                    selected ? "ring-4 ring-red-500 scale-105" : "hover:scale-105"
                  }`}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
                    <Image 
                      src={watch.image} 
                      alt={watch.name} 
                      fill 
                      className="object-cover transition-transform duration-300 group-hover:scale-110" 
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      priority={index < 10}
                      quality={85}
                    />
                    {selected && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm md:text-base font-semibold text-gray-900 text-center">
                    {watch.name}
                  </div>
                </button>
              );
            })}
          </div>
          
          {errors["watch"] && (
            <div className="mt-6 text-center text-red-600 font-medium">
              {errors["watch"]}
            </div>
          )}
        </div>
      </section>

      {/* Order Form Section */}
      <section id="order-form" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              معلومات الزبون
            </h2>
            <p className="text-lg text-gray-600">
              املأ البيانات لتأكيد طلبك. الدفع عند الاستلام
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Order Summary */}
            <div className="space-y-6">
              {/* Selected Watch */}
              {selectedWatch && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-bold text-xl mb-4 text-gray-900">الساعة المختارة</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50">
                      <Image 
                        src={selectedWatch.image} 
                        alt={selectedWatch.name} 
                        fill 
                        className="object-cover" 
                        sizes="80px"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{selectedWatch.name}</h4>
                      <p className="text-2xl font-bold text-red-600">{formatDZD(BASE_PRICE)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Options */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="font-bold text-xl mb-4 text-gray-900">طريقة التوصيل</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="home"
                      checked={deliveryOption === "home"}
                      onChange={(e) => setDeliveryOption(e.target.value as DeliveryOption)}
                      className="w-5 h-5 text-red-600"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">توصيل للمنزل</div>
                      <div className="text-sm text-gray-600">{formatDZD(DELIVERY_COST.home)} إضافية</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="radio"
                      name="delivery"
                      value="office"
                      checked={deliveryOption === "office"}
                      onChange={(e) => setDeliveryOption(e.target.value as DeliveryOption)}
                      className="w-5 h-5 text-red-600"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">توصيل للمكتب</div>
                      <div className="text-sm text-gray-600">{formatDZD(DELIVERY_COST.office)} إضافية</div>
                    </div>
                  </label>
                </div>
                {errors["delivery"] && (
                  <p className="text-red-600 text-sm mt-3">{errors["delivery"]}</p>
                )}
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">المبلغ الإجمالي</span>
                  <span className="text-3xl font-black">{formatDZD(total)}</span>
                </div>
                <p className="text-red-100 text-sm mt-2 text-center">
                  الدفع نقداً عند الاستلام
                </p>
              </div>
            </div>

            {/* Right: Customer Form */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <form onSubmit={async (e) => {
                e.preventDefault();
                
                // Validate all steps
                if (!validateStep2() || !validateStep3() || !validateStep5()) {
                  return;
                }

                setIsSubmitting(true);
                setSubmitError(null);

                try {
                  const orderData = {
                    fullName: formData.fullName,
                    phone: formData.phone,
                    wilayaId: formData.wilayaId,
                    wilayaNameAr: wilayaOptions.find(w => w.value === formData.wilayaId)?.label,
                    baladiya: formData.baladiya,
                    baladiyaNameAr: formData.baladiya,
                    selectedWatchId,
                    deliveryOption,
                    total,
                    notes: formData.notes,
                    clientRequestId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
                    setStep(5);
                  } else {
                    setSubmitError(result.error || "حدث خطأ غير متوقع");
                  }
                } catch (error) {
                  setSubmitError("فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
                } finally {
                  setIsSubmitting(false);
                }
              }} className="space-y-6">
                
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-800">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(f => ({ ...f, fullName: e.target.value }))}
                    placeholder="أدخل اسمك الكامل"
                    className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-red-400 text-base ${
                      errors["fullName"] ? "border-red-400" : "border-gray-200"
                    }`}
                    required
                  />
                  {errors["fullName"] && (
                    <p className="text-red-600 text-sm mt-2">{errors["fullName"]}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-800">
                    رقم الهاتف *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-red-400 text-base ${
                      errors["phone"] ? "border-red-400" : "border-gray-200"
                    }`}
                    required
                  />
                  {errors["phone"] && (
                    <p className="text-red-600 text-sm mt-2">{errors["phone"]}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">سنتصل بك لتأكيد الطلب وتحديد موعد التوصيل</p>
                </div>

                {/* Wilaya */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-800">
                    الولاية *
                  </label>
                  <select
                    value={formData.wilayaId || ""}
                    onChange={(e) => setFormData(f => ({ ...f, wilayaId: e.target.value ? Number(e.target.value) : undefined }))}
                    className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-red-400 text-base ${
                      errors["wilayaId"] ? "border-red-400" : "border-gray-200"
                    }`}
                    required
                  >
                    <option value="">اختر الولاية</option>
                    {wilayaOptions.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                  {errors["wilayaId"] && (
                    <p className="text-red-600 text-sm mt-2">{errors["wilayaId"]}</p>
                  )}
                </div>

                {/* Baladiya */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-800">
                    البلدية *
                  </label>
                  <select
                    value={formData.baladiya || ""}
                    onChange={(e) => setFormData(f => ({ ...f, baladiya: e.target.value }))}
                    disabled={!formData.wilayaId}
                    className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-red-400 text-base ${
                      errors["baladiya"] ? "border-red-400" : "border-gray-200"
                    } ${!formData.wilayaId ? "opacity-50 cursor-not-allowed" : ""}`}
                    required
                  >
                    <option value="">{formData.wilayaId ? "اختر البلدية" : "اختر الولاية أولاً"}</option>
                    {baladiyaOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {errors["baladiya"] && (
                    <p className="text-red-600 text-sm mt-2">{errors["baladiya"]}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-800">
                    عنوان تفصيلي أو ملاحظات
                  </label>
                  <textarea
                    value={formData.notes ?? ""}
                    onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="مثال: بجانب مسجد الهدى، الطابق الثاني، أو أي تفاصيل تساعد على الوصول"
                    className="w-full rounded-xl bg-white border-2 border-gray-200 px-4 py-4 shadow-sm focus:outline-none focus:border-red-400 text-base"
                  />
                  <p className="text-sm text-gray-600 mt-2">اختياري - لكن يساعد مندوب التوصيل في الوصول بسهولة</p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedWatchId || !deliveryOption}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      جارٍ إرسال طلبك...
                    </div>
                  ) : (
                    "اضغط هنا للطلب 🛒"
                  )}
                </button>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                    <strong>خطأ:</strong> {submitError}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      <AnimatePresence>
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckIcon className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  🎉 تم استلام طلبك بنجاح!
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  سنتصل بك خلال الساعات القليلة القادمة لتأكيد الطلب وتحديد موعد التوصيل
                </p>
              </div>
              
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedWatchId(null);
                  setDeliveryOption(null);
                  setFormData({ fullName: "", phone: "" });
                  setErrors({});
                  setSubmitError(null);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                طلب جديد
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <Footer />

      {/* Fixed WhatsApp Button */}
      <a
        href="https://wa.me/213776863561?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D8%AD%D9%88%D9%84%20%D8%B9%D8%B1%D8%B6%20%D8%A7%D9%84%D8%B3%D8%A7%D8%B9%D8%A7%D8%AA%20%D9%88%D8%AA%D8%A3%D9%83%D9%8A%D8%AF%20%D8%B7%D9%84%D8%A8%D9%8A"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="راسلنا على واتساب"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.62-6.003C.122 5.281 5.403 0 12.057 0c3.182 0 6.167 1.24 8.41 3.482a11.79 11.79 0 013.49 8.401c-.003 6.654-5.284 11.936-11.938 11.936a11.95 11.95 0 01-6.003-1.621L.057 24zm6.597-3.807c1.735.995 3.27 1.591 5.392 1.593 5.448 0 9.886-4.434 9.889-9.885.003-5.462-4.415-9.89-9.881-9.894-5.45 0-9.887 4.434-9.89 9.884a9.83 9.83 0 001.662 5.513l-.999 3.648 3.827-.859zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.03-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.298-.496.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
        </svg>
      </a>
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm shadow-xl p-5 sm:p-7 lg:p-8 mx-2 sm:mx-0">
      {children}
    </div>
  );
}

function StepTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{children}</h1>
      {subtitle ? <p className="text-slate-600 mt-1">{subtitle}</p> : null}
    </div>
  );
}

function Step1Hero() {
  return (
    <StepCard>
      <div className="grid gap-10 sm:grid-cols-2 items-center">
        <div className="order-2 sm:order-1 space-y-8 text-center sm:text-right">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">البوكس الفاخر - عرض خاص لمدة 3 أيام فقط</h1>
          <div className="space-y-3 text-slate-800">
            <p className="text-xl font-semibold leading-relaxed text-amber-700">🎁 البوكس الفاخر يحتوي على:</p>
            <p className="text-lg leading-relaxed">• ساعة فاخرة + خاتم + براسلي</p>
            <p className="text-lg leading-relaxed">• علبة فاخرة مجانية للهدايا</p>
            <p className="text-lg leading-relaxed">• عطر Sauvage (قارورة كبيرة) هدية من عندنا</p>
            <p className="text-lg leading-relaxed">• برتموني JeeP كاليتي ما شاء الله بالضمان</p>
            <div className="relative p-6 bg-gradient-to-r from-red-50 to-red-100 rounded-2xl border-2 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute -top-3 right-4 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold animate-pulse">
                عرض خاص
              </div>
              <div className="absolute -top-3 left-4 bg-yellow-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                🔥 محدود
              </div>
              <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-red-600 text-center leading-none drop-shadow-lg">
                {formatDZD(BASE_PRICE)}
              </p>
              <p className="text-red-700 font-bold text-center mt-2 text-lg animate-bounce">
                فقط لفترة محدودة!
              </p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-6 space-y-4 text-sm">
            <div className="font-semibold text-slate-800 text-base">معلومات الطلب:</div>
            <ul className="text-slate-600 space-y-2 leading-relaxed">
              <li>الدفع عند الاستلام</li>
              <li>رسوم التوصيل حسب المنطقة</li>
              <li>إمكانية فحص المنتج قبل الدفع</li>
            </ul>
          </div>
        </div>
        <div className="order-1 sm:order-2 mt-4 sm:mt-0">
          <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm shadow-2xl">
            <video 
              className="absolute inset-0 w-full h-full object-cover" 
              src="/videos/box.mp4" 
              poster="/images/box/box.jpg" 
              autoPlay 
              loop 
              muted 
              playsInline
              preload="metadata"
              style={{ objectFit: 'cover' }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </StepCard>
  );
}

// —

function Step3Watch({
  watches,
  selectedWatchId,
  onSelect,
  error,
}: {
  watches: WatchItem[];
  selectedWatchId: string | null;
  onSelect: (id: string) => void;
  error?: string;
}) {
  return (
    <StepCard>
  <div className="space-y-8">
        <StepTitle subtitle="اختر ساعة واحدة من المجموعة. يمكنك مراجعة اختيارك في الخطوة التالية وتعديله إذا رغبت.">اختيار الساعة المفضلة</StepTitle>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {watches.map((w, index) => {
            const selected = selectedWatchId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => onSelect(w.id)}
                className={`group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm shadow-lg p-5 text-start transition hover:shadow-xl active:scale-[0.98] min-h-[200px] sm:min-h-[220px] ${selected ? "shadow-[0_0_0_6px_rgba(34,211,238,0.25)]" : ""}`}
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-50 grid place-items-center mb-4">
                  <Image 
                    src={w.image} 
                    alt={w.name} 
                    fill 
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" 
                    className="object-cover" 
                    priority={index < 6}
                    quality={85}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                  />
                  {selected && (
                    <span className="absolute top-3 left-3 text-white bg-cyan-500/95 rounded-full p-2 shadow-lg">
                      <CheckIcon className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <div className="font-semibold text-base sm:text-lg text-center">{w.name}</div>
              </button>
            );
          })}
        </div>
        {error ? <p className="text-red-600 text-sm mt-3 px-2">{error}</p> : null}
      </div>
    </StepCard>
  );
}

function Step4Summary({
  deliveryOption,
  setDeliveryOption,
  total,
  selectedWatch,
}: {
  deliveryOption: DeliveryOption | null;
  setDeliveryOption: (o: DeliveryOption) => void;
  total: number;
  selectedWatch: WatchItem | null;
}) {
  return (
    <StepCard>
  <div className="space-y-8">
        <StepTitle>مراجعة الطلب والتوصيل</StepTitle>
  <div className="space-y-6">
    <div className="grid sm:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800 text-lg">الساعة المختارة</h3>
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 shadow-lg">
          {selectedWatch ? (
            <Image 
              src={selectedWatch.image} 
              alt={selectedWatch.name} 
              fill 
              className="object-cover object-center" 
              priority
              quality={90}
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          ) : (
            <div className="grid place-items-center h-full text-slate-500">لم تقم باختيار ساعة</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800 text-lg">العلبة الفاخرة</h3>
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 shadow-lg">
          <Image 
            src="/images/box/box.jpg" 
            alt="صورة العلبة الفاخرة" 
            fill 
            className="object-cover object-center" 
            priority
            quality={90}
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </div>
    </div>
    <div className="text-center p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border-2 border-red-200 shadow-md hover:shadow-lg transition-all duration-300">
      <p className="text-sm text-slate-600 mb-1">السعر الأساسي</p>
      <p className="text-3xl font-black text-red-600 drop-shadow-sm">{formatDZD(BASE_PRICE)}</p>
    </div>
  </div>
          <div className="space-y-6">
            <fieldset className="space-y-4">
              <legend className="font-semibold text-slate-800 text-lg">
                اختر طريقة التوصيل <span className="text-red-500">*</span>
              </legend>
              <div className="grid grid-cols-1 gap-5">
                <label className={`cursor-pointer rounded-xl px-5 py-4 shadow-sm bg-slate-50 hover:bg-slate-100 transition border-2 ${deliveryOption === "home" ? "border-cyan-400 bg-cyan-50" : "border-slate-200"}`}>
                  <input
                    type="radio"
                    name="delivery"
                    className="sr-only"
                    checked={deliveryOption === "home"}
                    onChange={() => setDeliveryOption("home")}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-base">التوصيل للمنزل</span>
                      <span className="text-cyan-700 font-semibold">{formatDZD(DELIVERY_COST.home)}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      التوصيل إلى عنوان منزلك خلال 2-3 أيام عمل
                    </div>
                    {deliveryOption === "home" && (
                      <div className="flex items-center text-cyan-600 text-sm font-medium pt-1">
                        <CheckIcon className="w-4 h-4 ml-2" />
                        محدد
                      </div>
                    )}
                  </div>
                </label>
                <label className={`cursor-pointer rounded-xl px-5 py-4 shadow-sm bg-slate-50 hover:bg-slate-100 transition border-2 ${deliveryOption === "office" ? "border-cyan-400 bg-cyan-50" : "border-slate-200"}`}>
                  <input
                    type="radio"
                    name="delivery"
                    className="sr-only"
                    checked={deliveryOption === "office"}
                    onChange={() => setDeliveryOption("office")}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-base">التوصيل للمكتب</span>
                      <span className="text-cyan-700 font-semibold">{formatDZD(DELIVERY_COST.office)}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      التوصيل إلى مكان عملك خلال 1-2 أيام عمل
                    </div>
                    {deliveryOption === "office" && (
                      <div className="flex items-center text-cyan-600 text-sm font-medium pt-1">
                        <CheckIcon className="w-4 h-4 ml-2" />
                        محدد
                      </div>
                    )}
                  </div>
                </label>
              </div>
              {!deliveryOption && (
                <p className="text-red-600 text-sm px-2">الرجاء اختيار طريقة التوصيل</p>
              )}
            </fieldset>
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-5 border-2 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between font-bold text-xl">
                <span className="text-slate-800">إجمالي المبلغ</span>
                <span className="text-3xl font-black text-red-600 drop-shadow-sm">{deliveryOption ? formatDZD(total) : "---"}</span>
              </div>
              <div className="text-sm text-red-700 mt-2 font-medium">
                {deliveryOption ? "يشمل الساعة + رسوم التوصيل" : "اختر طريقة التوصيل لمعرفة الإجمالي"}
              </div>
            </div>
          </div>
      </div>
    </StepCard>
  );
}
function Step5Checkout({
  formData,
  setFormData,
  wilayaOptions,
  baladiyaOptions,
  total,
  errors,
  submitError,
  isSubmitting,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  wilayaOptions: { value: number; label: string }[];
  baladiyaOptions: string[];
  total: number;
  errors: Record<string, string>;
  submitError: string | null;
  isSubmitting: boolean;
}) {
 
  return (
    <StepCard>
  <div className="space-y-7">
        <StepTitle>بيانات التوصيل والدفع</StepTitle>
  <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-700">
          <strong>تذكير:</strong> الدفع عند الاستلام - لن نطلب منك أي مبلغ الآن. ستدفع فقط عند وصول الطلب وفحص المحتويات.
        </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-800">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="أدخل اسمك الكامل كما هو في بطاقة الهوية"
              className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-cyan-400 text-base ${errors["fullName"] ? "border-red-400" : "border-slate-200"}`}
            />
            {errors["fullName"] && <p className="text-red-600 text-sm mt-2 px-1">{errors["fullName"]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-800">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              maxLength={13}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setFormData((f) => ({ ...f, phone: digits }));
              }}
              placeholder="مثال: 0551234567"
              className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-cyan-400 text-base ${errors["phone"] ? "border-red-400" : "border-slate-200"}`}
            />
            <div className="text-sm text-slate-600 mt-2 px-1">سنتصل بك لتأكيد الطلب وتحديد موعد التوصيل</div>
            {errors["phone"] && <p className="text-red-600 text-sm mt-2 px-1">{errors["phone"]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-800">
              الولاية <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.wilayaId ?? ""}
              onChange={(e) =>
                setFormData((f) => ({ ...f, wilayaId: e.target.value ? Number(e.target.value) : undefined }))
              }
              className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-cyan-400 text-base ${errors["wilayaId"] ? "border-red-400" : "border-slate-200"}`}
            >
              <option value="">اختر الولاية</option>
              {wilayaOptions.map((w) => (
                <option key={w.value} value={w.value}>
                 {w.value}-{w.label} 
                </option>
              ))}
            </select>
            {errors["wilayaId"] && <p className="text-red-600 text-sm mt-2 px-1">{errors["wilayaId"]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-800">
              البلدية <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.baladiya ?? ""}
              onChange={(e) => setFormData((f) => ({ ...f, baladiya: e.target.value || undefined }))}
              disabled={!formData.wilayaId}
              className={`w-full rounded-xl bg-white border-2 px-4 py-4 shadow-sm focus:outline-none focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-base ${errors["baladiya"] ? "border-red-400" : "border-slate-200"}`}
            >
              <option value="">{formData.wilayaId ? "اختر البلدية" : "اختر الولاية أولاً"}</option>
              {baladiyaOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {errors["baladiya"] && <p className="text-red-600 text-sm mt-2 px-1">{errors["baladiya"]}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-2 text-slate-800">عنوان تفصيلي أو ملاحظات</label>
            <textarea
              value={formData.notes ?? ""}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              placeholder="مثال: بجانب مسجد الهدى، الطابق الثاني، أو أي تفاصيل تساعد على الوصول"
              className="w-full rounded-xl bg-white border-2 border-slate-200 px-4 py-4 shadow-sm focus:outline-none focus:border-cyan-400 text-base leading-relaxed"
            />
            <div className="text-sm text-slate-600 mt-2 px-1">اختياري - لكن يساعد مندوب التوصيل في الوصول بسهولة</div>
          </div>
        </div>

        {isSubmitting && (
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-blue-800">
                <div className="font-bold">جارٍ إرسال طلبك...</div>
                <div className="text-sm">يرجى عدم إغلاق الصفحة</div>
              </div>
            </div>
          </div>
        )}

        {submitError ? (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3">
            <strong>خطأ:</strong> {submitError}
          </div>
        ) : null}

        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between font-bold text-xl">
            <span className="text-slate-800">المبلغ الإجمالي</span>
            <span className="text-4xl font-black text-red-600 drop-shadow-sm">{formatDZD(total)}</span>
          </div>
          <div className="text-sm text-red-700 mt-2 font-medium text-center">
            ستدفع هذا المبلغ نقداً عند استلام الطلب
          </div>
        </div>
      </div>
    </StepCard>
  );
}

function StepSuccess() {
  return (
    <StepCard>
      <div className="min-h-[50vh] grid place-items-center text-center space-y-8 py-8">
        {/* Success Icon with Animation */}
        <div className="relative">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white grid place-items-center shadow-2xl animate-bounce">
            <CheckIcon className="w-12 h-12" />
          </div>
          <div className="absolute -inset-2 rounded-full bg-emerald-500/20 animate-ping"></div>
        </div>

        {/* Success Message */}
        <div className="space-y-4 max-w-lg">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-600 drop-shadow-sm">
            🎉 تم استلام طلبك بنجاح!
          </h2>
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-lg">
            <p className="text-lg text-emerald-800 font-semibold mb-3">
              📞 سنتصل بك قريباً لتأكيد الطلب
            </p>
            <p className="text-emerald-700 leading-relaxed">
              سيتصل بك فريق خدمة العملاء خلال <span className="font-bold text-emerald-800">الساعات القليلة القادمة</span> لتأكيد الطلب وتحديد موعد التوصيل المناسب لك.
            </p>
          </div>
        </div>

        {/* Process Steps */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 max-w-md shadow-xl border border-slate-200">
          <div className="font-bold text-slate-800 text-lg mb-4 flex items-center justify-center gap-2">
            ⚡ ماذا يحدث الآن؟
          </div>
          <div className="space-y-4 text-right">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
              <span className="text-blue-800 font-medium">مراجعة طلبك وتأكيد التفاصيل</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
              <span className="text-green-800 font-medium">الاتصال بك لتحديد موعد التوصيل</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
              <span className="text-purple-800 font-medium">تحضير الطقم وشحنه إليك</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">4</span>
              <span className="text-orange-800 font-medium">التوصيل والدفع عند الاستلام</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 border-2 border-amber-200 shadow-md max-w-md">
          <div className="font-bold text-amber-800 text-center mb-2">
            💡 نصيحة مهمة
          </div>
          <p className="text-amber-700 text-sm text-center leading-relaxed">
            يرجى الاحتفاظ بهاتفك قريباً منك لاستقبال مكالمة التأكيد. 
            إذا فاتتك المكالمة، سنعاود الاتصال بك مرة أخرى.
          </p>
        </div>

        {/* Thank You Message */}
        <div className="text-slate-600 text-lg font-medium">
          شكراً لك على ثقتك بنا! 🙏
        </div>
      </div>
    </StepCard>
  );
}
