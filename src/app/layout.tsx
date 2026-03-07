import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Tajawal } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tajawal = Tajawal({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

// NOTE: Replace https://example.com with your real production domain once deployed
export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "الهدية الفاخرة | اطلب ساعتك الآن مع توصيل سريع", // default root title
    template: "%s | ساعات فاخرة في الجزائر", // used if child pages set a title
  },
  description:
    "أقوى عرض ساعات رجالية فاخرة في الجزائر – تصميم أنيق، جودة عالية، سعر ترويجي محدود + دفع عند الاستلام وتوصيل سريع لجميع الولايات.",
  keywords: [
    "ساعات",
    "ساعات رجالية",
    "ساعة فاخرة",
    "شراء ساعة",
    "ساعة ذكية",
    "توصيل سريع",
    "الدفع عند الاستلام",
    "الجزائر",
    "عرض خاص",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    url: "https://example.com/",
    siteName: "عروض الساعات الفاخرة",
    title: "ساعات فاخرة بعرض خاص في الجزائر | اطلب ساعتك الآن مع توصيل سريع",
    description:
      "اكتشف تشكيلة من 11 ساعة فاخرة بسعر ترويجي محدود – اطلب الآن والدفع عند الاستلام مع خدمة توصيل سريعة لكل الولايات.",
    images: [
      {
        url: "/images/watches/1.webp",
        width: 800,
        height: 800,
        alt: "عرض ساعات فاخرة",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ساعات فاخرة بعرض خاص في الجزائر",
    description:
      "11 موديل مميز + توصيل سريع + الدفع عند الاستلام. احجز الآن قبل انتهاء العرض!",
    images: ["/images/watches/1.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: { icon: "/favicon.ico" },
  other: {
    "theme-color": "#0f172a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${tajawal.variable} antialiased`}
      >
        {/* Structured Data (JSON-LD) */}
        <Script
          id="ld-json"
          type="application/ld+json"
          strategy="afterInteractive"
        >{`
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "عروض الساعات الفاخرة",
            "url": "https://example.com/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://example.com/?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }
        `}</Script>
        {/* Meta Pixel Code (Updated Pixel ID: 1301109644932375) */}
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1301109644932375');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1301109644932375&ev=PageView&noscript=1" alt="" />',
          }}
        />
        {/* End Meta Pixel Code */}
        {children}
      </body>
    </html>
  );
}
