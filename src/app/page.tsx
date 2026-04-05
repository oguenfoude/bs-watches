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
  Star,
  Eye,
  Package,
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
  { id: "model-15", name: "موديل 15", image: "/images/watches/15.webp" },
  { id: "model-16", name: "موديل 16", image: "/images/watches/16.webp" },
  { id: "model-17", name: "موديل 17", image: "/images/watches/17.webp" },
  { id: "model-18", name: "موديل 18", image: "/images/watches/18.webp" },
  { id: "model-19", name: "موديل 19", image: "/images/watches/19.webp" },
  { id: "model-20", name: "موديل 20", image: "/images/watches/20.webp" },
  { id: "model-21", name: "موديل 21", image: "/images/watches/21.webp" },
  { id: "model-22", name: "موديل 22", image: "/images/watches/22.webp" },
  { id: "model-23", name: "موديل 23", image: "/images/watches/23.webp" },
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
  if (!selectedWatchId) errors.watch = "اختر الموديل الذي يعجبك";
  if (!deliveryOption) errors.delivery = "اختر طريقة التوصيل المناسبة لك";
  return errors;
}

// ─────────────────────────────────────────────
// SWIPEABLE IMAGE CAROUSEL HOOK
// ─────────────────────────────────────────────
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    // Only swipe if horizontal movement > vertical and threshold met
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swiped left → next (RTL: so this means "forward")
        onSwipeLeft();
      } else {
        // Swiped right → prev
        onSwipeRight();
      }
    }
  }, [onSwipeLeft, onSwipeRight]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

// ─────────────────────────────────────────────
// COUNTDOWN TIMER COMPONENT
// ─────────────────────────────────────────────
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Offer ends at midnight tonight
    const getEndOfDay = () => {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      return d;
    };
    const endDate = getEndOfDay();

    const tick = () => {
      const now = new Date().getTime();
      const diff = endDate.getTime() - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-center" dir="ltr">
      {[
        { val: pad(timeLeft.hours), label: "ساعة" },
        { val: pad(timeLeft.minutes), label: "دقيقة" },
        { val: pad(timeLeft.seconds), label: "ثانية" },
      ].map(({ val, label }, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <span className="bg-gray-900 text-white text-lg md:text-xl font-bold px-3 py-1.5 rounded-lg min-w-[44px] tabular-nums">
              {val}
            </span>
            <span className="text-[10px] text-gray-500 mt-1">{label}</span>
          </div>
          {i < 2 && (
            <span className="text-gray-400 font-bold text-lg mb-4">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Page() {
  useEffect(() => {
    initMetaPixel();
  }, []);

  // ── Carousel State ──
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // ── Form State ──
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
  const [viewerCount, setViewerCount] = useState(5); // Static initial value for SSR

  // Set random viewer count only on client
  useEffect(() => {
    setViewerCount(Math.floor(Math.random() * 8) + 3);
  }, []);

  // ── Carousel Navigation ──
  const goToSlide = useCallback((index: number) => {
    setSlideDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  }, [currentSlide]);

  const nextSlide = useCallback(() => {
    setSlideDirection(1);
    setCurrentSlide((p) => (p + 1) % WATCHES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setSlideDirection(-1);
    setCurrentSlide((p) => (p - 1 + WATCHES.length) % WATCHES.length);
  }, []);

  // Auto-play carousel
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setSlideDirection(1);
      setCurrentSlide((p) => (p + 1) % WATCHES.length);
    }, 4000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, []);

  // Pause auto-play on user interaction
  const pauseAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    // Resume after 8 seconds
    setTimeout(() => {
      autoPlayRef.current = setInterval(() => {
        setSlideDirection(1);
        setCurrentSlide((p) => (p + 1) % WATCHES.length);
      }, 4000);
    }, 8000);
  }, []);

  const swipeHandlers = useSwipe(
    () => { pauseAutoPlay(); nextSlide(); },
    () => { pauseAutoPlay(); prevSlide(); },
  );

  const selectedWatch = useMemo(
    () => WATCHES.find((w) => w.id === selectedWatchId) || null,
    [selectedWatchId],
  );

  const total = useMemo(() => {
    let price = WATCH_PRICE;
    if (deliveryOption) price += DELIVERY_COST[deliveryOption];
    return price;
  }, [deliveryOption]);

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
    `w-full rounded-xl border px-4 py-3.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-300 bg-red-50/30 focus:ring-red-200 focus:border-red-400"
        : "border-gray-200 bg-white focus:ring-amber-100 focus:border-amber-400 hover:border-gray-300"
    }`;

  // Slide animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  // Thumbnail strip - show 5 thumbnails around current
  const getVisibleThumbnails = () => {
    const count = 5;
    const half = Math.floor(count / 2);
    let start = currentSlide - half;
    if (start < 0) start = 0;
    if (start + count > WATCHES.length) start = Math.max(0, WATCHES.length - count);
    return WATCHES.slice(start, start + count).map((w, i) => ({
      ...w,
      realIndex: start + i,
    }));
  };

  // ═════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════
  return (
    <div dir="rtl" className="min-h-screen bg-white text-gray-900">

      {/* ── TOP PROMO BAR ── */}
      <div className="bg-gray-900 text-white text-center py-2 px-4">
        <p className="text-xs md:text-sm font-medium flex items-center justify-center gap-2">
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>عرض محدود — ساعة + طقم إكسسوارات مجاني | التوصيل متوفر لجميع الولايات</span>
          <Gift className="w-3.5 h-3.5 text-amber-400" />
        </p>
      </div>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">BS</span>
              </div>
              <span className="font-bold text-gray-900">BS Monters</span>
            </div>
            <a
              href="#order"
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-red-700 transition-all text-base shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.01] active:scale-[0.99]"
              onClick={() => trackFb("InitiateCheckout")}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>اطلب الآن — <span>{formatDZD(WATCH_PRICE)}</span></span>
            </a>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          PRODUCT SECTION — Image Carousel + Product Info
          ═══════════════════════════════════════════ */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-12">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-start">

            {/* ── IMAGE CAROUSEL (Sticky on desktop) ── */}
            <div className="space-y-4 lg:sticky lg:top-24">
              {/* Main Image Slider */}
              <div
                className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-lg border border-gray-100 cursor-grab active:cursor-grabbing select-none"
                onTouchStart={swipeHandlers.handleTouchStart}
                onTouchMove={swipeHandlers.handleTouchMove}
                onTouchEnd={swipeHandlers.handleTouchEnd}
              >
                <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                  <motion.div
                    key={currentSlide}
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={WATCHES[currentSlide].image}
                      alt={WATCHES[currentSlide].name}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Discount badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                    -{Math.round(((OLD_PRICE - WATCH_PRICE) / OLD_PRICE) * 100)}%
                  </span>
                </div>

                {/* Slide counter */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    {currentSlide + 1} / {WATCHES.length}
                  </span>
                </div>

                {/* Navigation arrows */}
                <button
                  onClick={() => { pauseAutoPlay(); prevSlide(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105"
                  aria-label="السابق"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={() => { pauseAutoPlay(); nextSlide(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105"
                  aria-label="التالي"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>

                {/* Bottom model name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 z-10">
                  <p className="text-white font-bold text-lg">{WATCHES[currentSlide].name}</p>
                  <p className="text-amber-300 text-sm font-semibold">{formatDZD(WATCH_PRICE)}</p>
                </div>

                {/* Swipe hint for mobile */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 md:hidden">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: 2, delay: 1 }}
                    className="text-white/70 text-xs flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                    اسحب لتصفح الموديلات
                    <ChevronLeft className="w-3 h-3" />
                  </motion.div>
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={() => { pauseAutoPlay(); prevSlide(); }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>

                <div className="flex gap-1.5 overflow-hidden">
                  {getVisibleThumbnails().map((thumb) => (
                    <button
                      key={thumb.id}
                      onClick={() => {
                        pauseAutoPlay();
                        goToSlide(thumb.realIndex);
                      }}
                      className={`relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                        currentSlide === thumb.realIndex
                          ? "border-amber-500 shadow-md scale-105"
                          : "border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={thumb.image}
                        alt={thumb.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { pauseAutoPlay(); nextSlide(); }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-1 px-4">
                {WATCHES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => { pauseAutoPlay(); goToSlide(idx); }}
                    className={`rounded-full transition-all duration-300 ${
                      idx === currentSlide
                        ? "w-6 h-1.5 bg-amber-500"
                        : "w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`الموديل ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* ── INFO & FORM COLUMN ── */}
            <div className="space-y-10">
              {/* ── PRODUCT INFO ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-5"
              >
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-100">
                    🔥 الأكثر مبيعاً
                  </span>
                  <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-100">
                    ⭐ عرض محدود
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                    ساعة أنيقة + طقم إكسسوارات كامل
                  </h1>
                  <p className="text-gray-500 mt-2 text-sm md:text-base">
                    23 موديل حصري متوفر — اختر الموديل المفضل لديك واطلب الآن
                  </p>
                </div>

                {/* Price Section */}
                <div className="bg-gradient-to-r from-gray-50 to-amber-50/50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl md:text-4xl font-black text-gray-900">
                      {formatDZD(WATCH_PRICE)}
                    </span>
                    <span className="text-lg text-gray-400 line-through decoration-red-400 decoration-2">
                      {formatDZD(OLD_PRICE)}
                    </span>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                      وفر <span>{formatDZD(OLD_PRICE - WATCH_PRICE)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    + مصاريف التوصيل حسب طريقة التوصيل المختارة
                  </p>
                </div>

                {/* Social Proof */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-40" />
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full relative" />
                    </div>
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600"><span>{viewerCount}</span> شخص يشاهد الآن</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs text-gray-500 mr-1">(4.9)</span>
                  </div>
                </div>

                {/* Offer Countdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-red-500" />
                      ينتهي العرض خلال
                    </span>
                  </div>
                  <CountdownTimer />
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Gift, title: "هدية مجانية", desc: "طقم إكسسوارات كامل", color: "text-purple-600 bg-purple-50" },
                    { icon: ShieldCheck, title: "ضمان سنة", desc: "ضمان كامل على الساعة", color: "text-blue-600 bg-blue-50" },
                    { icon: Package, title: "توصيل آمن", desc: "تغليف فاخر ومحمي", color: "text-emerald-600 bg-emerald-50" },
                    { icon: Truck, title: "الدفع عند الاستلام", desc: "لا تدفع حتى تستلم", color: "text-amber-600 bg-amber-50" },
                  ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="bg-white rounded-xl border border-gray-100 p-3 text-center hover:shadow-md transition-shadow">
                      <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <p className="font-semibold text-gray-800 text-xs">{title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── ORDER FORM ── */}
              <div id="order">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                >
            {/* Form Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-5 text-center">
              <h2 className="text-xl font-bold text-white">
                معلومات الزبون
              </h2>
              <p className="text-gray-400 mt-1 text-sm">
                سنتصل بك لتأكيد الطلب وترتيب التوصيل
              </p>
            </div>

            <div className="p-5 md:p-7">
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Watch Model Selection */}
                <div
                  className={`rounded-xl p-4 transition-all ${
                    errors.watch
                      ? "bg-red-50 border-2 border-red-300"
                      : selectedWatch
                        ? "bg-emerald-50 border-2 border-emerald-300"
                        : "bg-gray-50 border-2 border-dashed border-gray-200"
                  }`}
                  data-error={errors.watch ? "true" : undefined}
                >
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    اختر رقم الموديل <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedWatchId || ""}
                    onChange={(e) => handleWatchSelect(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 appearance-none cursor-pointer"
                  >
                    <option value="">— اختر الموديل —</option>
                    {WATCHES.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>

                  {errors.watch && (
                    <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.watch}</p>
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
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 border-emerald-300 shadow-sm">
                            <Image
                              src={selectedWatch.image}
                              alt={selectedWatch.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-sm">{selectedWatch.name}</p>
                            <p className="text-emerald-600 text-xs font-semibold">{formatDZD(WATCH_PRICE)}</p>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      الاسم واللقب <span className="text-red-500">*</span>
                    </label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      رقم الهاتف <span className="text-red-500">*</span>
                    </label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      الولاية <span className="text-red-500">*</span>
                    </label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      البلدية <span className="text-red-500">*</span>
                    </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    طريقة التوصيل <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "desk" as DeliveryOption, icon: Building2, label: "للمكتب", cost: DELIVERY_COST.desk },
                      { key: "home" as DeliveryOption, icon: Home, label: "للمنزل", cost: DELIVERY_COST.home },
                    ].map(({ key, icon: Icon, label, cost }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDeliverySelect(key)}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all text-center ${
                          deliveryOption === key
                            ? "border-amber-400 bg-amber-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${deliveryOption === key ? "text-amber-600" : "text-gray-400"}`} />
                        <span className="font-bold text-gray-800 text-sm">{label}</span>
                        <span className="text-xs text-gray-500">{formatDZD(cost)}</span>
                      </button>
                    ))}
                  </div>
                  {errors.delivery && <p className="text-red-500 text-xs mt-1.5">{errors.delivery}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="عنوان تفصيلي أو رقم هاتف إضافي..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 resize-none bg-white hover:border-gray-300 transition-all duration-200"
                  />
                </div>

                {/* Summary + Submit */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        الساعة {selectedWatch ? `(${selectedWatch.name})` : ""}
                      </span>
                      <span className="font-semibold text-gray-800">{formatDZD(WATCH_PRICE)}</span>
                    </div>
                    {deliveryOption && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          التوصيل {deliveryOption === "home" ? "للمنزل" : "للمكتب"}
                        </span>
                        <span className="font-semibold text-gray-800">
                          {formatDZD(DELIVERY_COST[deliveryOption])}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2.5 border-t border-gray-200">
                      <span className="font-black text-gray-900 text-base">المجموع</span>
                      <span className="font-black text-xl text-gray-900">{formatDZD(total)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.005] active:scale-[0.995]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        <span>اضغط هنا للطلب — <span>{formatDZD(total)}</span></span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-5 mt-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> آمن 100%
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> توصيل 24-48h
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> الدفع عند الاستلام
                    </span>
                  </div>

                  {submitError && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm text-center">
                      {submitError}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
              <h3 className="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح! ✅</h3>
              <p className="text-gray-500 mb-5 text-sm">سنتصل بك قريباً لتأكيد الطلب وترتيب التوصيل</p>
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
      <footer className="border-t border-gray-100 py-6 bg-gray-50">
        <p className="text-center text-xs text-gray-400">
          {new Date().getFullYear()} BS Monters — جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
}
