"use client";
/* eslint-disable */

import { useMemo, useState, useEffect } from "react";
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

  // Clear baladiya when wilaya changes
  useEffect(() => {
    setFormData((fd) => ({ ...fd, baladiya: undefined }));
  }, [formData.wilayaId]);

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
