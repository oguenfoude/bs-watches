import { NextRequest, NextResponse, after } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { kv } from "@vercel/kv";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface OrderData {
  fullName: string;
  phone: string;
  wilaya: string;
  baladiya: string;
  selectedWatchId: string;
  selectedWatchName?: string;
  boxPrice: number;
  deliveryOption: "home" | "desk";
  deliveryCost: number;
  total: number;
  notes?: string;
  clientRequestId?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  clientRequestId?: string;
}

// ─────────────────────────────────────────────
// IN-MEMORY RATE LIMITER  (1 order / IP / hour)
// ─────────────────────────────────────────────
const processedIds = new Set<string>();

interface RateEntry {
  count: number;
  firstAt: number;  // ms timestamp
}
const ipRateMap = new Map<string, RateEntry>();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX      = 1;               // max orders per window

/** Returns true when the request should be blocked. */
function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = ipRateMap.get(ip);

  // No prior entry — create it and allow
  if (!entry) {
    ipRateMap.set(ip, { count: 1, firstAt: now });
    return false;
  }

  // Window expired — reset
  if (now - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    ipRateMap.set(ip, { count: 1, firstAt: now });
    return false;
  }

  // Within window and already hit the limit
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  // Within window but still under limit
  entry.count += 1;
  return false;
}

/** Clean up old entries every hour to avoid memory build-up. */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRateMap.entries()) {
    if (now - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
      ipRateMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

// ─────────────────────────────────────────────
// SERVER-SIDE ANTI-FAKE PHONE VALIDATION
// ─────────────────────────────────────────────
function isValidAlgerianPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 10)          return false;
  if (!/^0[567]/.test(d))       return false;
  // all same digit (0555555555)
  if (/^(.)\1+$/.test(d))       return false;
  // last-8 all same (0511111111)
  if (/^0[567](\d)\1{7}$/.test(d)) return false;
  // ascending or descending sequence in digits 2-10
  const tail = d.slice(2);
  const asc  = tail.split("").every((c, i, a) => i === 0 || +c === +a[i-1] + 1);
  const desc = tail.split("").every((c, i, a) => i === 0 || +c === +a[i-1] - 1);
  if (asc || desc) return false;
  // repeated 4-digit block (0512341234)
  const seg = tail.slice(0, 4);
  if (tail === seg + seg) return false;
  return true;
}


// ─────────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────────
function getEmailTransporter() {
  const emailUser = process.env.SMTP_FROM_EMAIL;
  const emailPass = process.env.SMTP_PASSWORD;
  const emailHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const emailPort = parseInt(process.env.SMTP_PORT || "587", 10);
  if (!emailUser || !emailPass) {
    console.warn("Email credentials not configured");
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: { user: emailUser, pass: emailPass },
  });
}

async function getWatchImageAttachment(watchId: string) {
  const match = watchId.match(/model-(\d+)/);
  if (!match) return null;
  const num = match[1];

  // 1. Try KV first
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const base64Data = await kv.get<string>(`watch_img_${num}`);
      if (base64Data) {
        return {
          content: Buffer.from(base64Data, "base64"),
          filename: `watch-${num}.webp`,
          cid: `watch-image-${num}@bsmonters`,
        };
      }
    } catch (e) {
      console.error(`Failed to read image from KV for email:`, e);
    }
  }

  // 2. Fallback to local FS
  const imagePath = path.join(
    process.cwd(),
    "public",
    "images",
    "watches",
    `${num}.webp`,
  );

  try {
    const content = fs.readFileSync(imagePath);
    return {
      content,
      filename: `watch-${num}.webp`,
      cid: `watch-image-${num}@bsmonters`,
    };
  } catch (err) {
    console.error(`Failed to read image ${imagePath}:`, err);
    return null;
  }
}

async function sendEmailNotification(orderData: OrderData): Promise<void> {
  const transporter = getEmailTransporter();
  if (!transporter) return;

  const to =
    process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_FROM_EMAIL;
  if (!to) return;

  const watchName = orderData.selectedWatchName || orderData.selectedWatchId;
  const deliveryLabel =
    orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب";
  const attachment = await getWatchImageAttachment(orderData.selectedWatchId);


  const html = `
  <div dir="rtl" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);border:1px solid #f0f0f0;">
    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#e11d48,#be123c);padding:40px 30px;text-align:center;color:white;position:relative;">
      <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">طلبية جديدة 📦</h1>
      <p style="margin:10px 0 0;font-size:15px;opacity:0.9;">لقد تلقيت طلب شراء جديد من متجرك</p>
      <div style="margin-top:20px;display:inline-block;background:rgba(255,255,255,0.2);padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
        المعرف: #${orderData.clientRequestId?.slice(-8)}
      </div>
    </div>

    <div style="padding:40px 30px;">
      <!-- PRODUCT CARD -->
      <div style="display:flex;align-items:center;background:#f8fafc;padding:20px;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:30px;">
        ${
          attachment
            ? `<div style="flex-shrink:0;margin-left:20px;">
                 <img src="cid:${attachment.cid}" alt="${watchName}" style="width:90px;height:90px;object-fit:cover;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.1);" />
               </div>`
            : ""
        }
        <div>
          <span style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;">المنتج المطلوب</span>
          <h2 style="margin:6px 0 8px;font-size:20px;color:#0f172a;font-weight:700;">${watchName}</h2>
          <span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:4px 10px;border-radius:8px;font-size:14px;font-weight:700;">
            ${orderData.boxPrice.toLocaleString()} دج
          </span>
        </div>
      </div>

      <!-- CUSTOMER DETAILS -->
      <h3 style="font-size:16px;color:#0f172a;margin:0 0 16px;font-weight:700;padding-right:10px;border-right:4px solid #e11d48;">
        تفاصيل الزبون المشتري
      </h3>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:30px;">
        <table style="width:100%;border-collapse:collapse;text-align:right;">
          ${[
            ["الاسم الكامل", orderData.fullName],
            ["رقم الهاتف", `<a href="tel:${orderData.phone}" style="color:#e11d48;font-weight:600;text-decoration:none;">${orderData.phone}</a>`],
            ["التوصيل", deliveryLabel],
            ["العنوان / الولاية", `<strong>${orderData.wilaya}</strong> — ${orderData.baladiya}`],
            ...(orderData.notes ? [["ملاحظات الطلب", `<div style="background:#fef3c7;padding:10px;border-radius:8px;color:#92400e;font-size:14px;border:1px dashed #fcd34d;">${orderData.notes}</div>`]] : []),
          ]
            .map(
              ([label, value], i) => `
            <tr style="border-bottom:${i === 4 || (!orderData.notes && i === 3) ? 'none' : '1px solid #f1f5f9'};">
              <td style="padding:16px 20px;color:#64748b;font-size:14px;font-weight:600;width:35%;">${label}</td>
              <td style="padding:16px 20px;color:#0f172a;font-size:15px;line-height:1.5;">${value}</td>
            </tr>
          `
            )
            .join("")}
        </table>
      </div>

      <!-- HIGHLIGHTED TOTAL -->
      <div style="background:#0f172a;border-radius:16px;padding:24px;display:flex;justify-content:space-between;align-items:center;color:#ffffff;box-shadow:0 10px 25px rgba(15,23,42,0.2);">
        <div style="font-size:16px;font-weight:600;opacity:0.9;">مبلغ الدفع الكلي <br/><span style="font-size:12px;font-weight:400;opacity:0.7;">(يتضمن مصاريف التوصيل)</span></div>
        <div style="font-size:28px;font-weight:800;color:#2dd4bf;">${orderData.total.toLocaleString()} دج</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:13px;color:#94a3b8;font-weight:500;">
        تم استلام هذا الطلب من المتجر الإلكتروني <br/>
        <strong style="color:#0f172a;">BS Monters</strong> — ${new Date().toLocaleString("ar-DZ")}
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"BS Monters" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject: `طلب جديد #${orderData.clientRequestId?.slice(-6)} — ${orderData.fullName}`,
    attachments: attachment
      ? [
          {
            filename: attachment.filename,
            content: attachment.content,
            cid: attachment.cid,
            contentType: "image/webp",
          },
        ]
      : [],
    html,
  });
}

// ─────────────────────────────────────────────
// GOOGLE SHEETS
// ─────────────────────────────────────────────
async function saveToGoogleSheets(orderData: OrderData): Promise<void> {
  if (process.env.SHEETS_ENABLED === "false") return;
  
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    console.warn("Google Sheets credentials not configured");
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const date = new Date();
    const dateStr = date.toLocaleDateString("en-GB");
    const timeStr = date.toLocaleTimeString("en-GB");
    
    const watchName = orderData.selectedWatchName || orderData.selectedWatchId;
    const deliveryLabel = orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب";

    const values = [[
      dateStr,
      timeStr,
      orderData.clientRequestId?.slice(-8) || "",
      orderData.fullName,
      orderData.phone,
      orderData.wilaya,
      orderData.baladiya,
      watchName,
      orderData.boxPrice,
      deliveryLabel,
      orderData.deliveryCost,
      orderData.total,
      orderData.notes || "",
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:M", // Append to the first sheet
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    console.log("Successfully appended to Google Sheets");
  } catch (error) {
    console.error("Failed to append to Google Sheets:", error);
  }
}

// ─────────────────────────────────────────────
// API HANDLERS
// ─────────────────────────────────────────────
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  try {
    // ── Extract real client IP ──
    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp  = (forwarded ? forwarded.split(",")[0] : null)
      || request.headers.get("x-real-ip")
      || "unknown";

    // ── IP rate limit check ──
    if (isRateLimited(clientIp)) {
      console.warn(`Rate limit hit for IP: ${clientIp}`);
      return NextResponse.json(
        {
          success: false,
          error: "لقد أرسلت طلباً مؤخراً. يرجى الانتظار ساعة قبل إرسال طلب جديد.",
        },
        { status: 429 },
      );
    }

    const orderData: OrderData = await request.json();

    if (!orderData.clientRequestId) {
      orderData.clientRequestId =
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    // ── Dedup (same request ID sent twice) ──
    if (processedIds.has(orderData.clientRequestId)) {
      return NextResponse.json(
        {
          success: true,
          message: "تم معالجة الطلب مسبقاً",
          clientRequestId: orderData.clientRequestId,
        },
        { status: 200 },
      );
    }

    // Validate
    if (!orderData.fullName?.trim() || orderData.fullName.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "الاسم الكامل مطلوب" },
        { status: 400 },
      );
    }
    // ── Enhanced server-side phone validation ──
    if (!isValidAlgerianPhone(orderData.phone || "")) {
      return NextResponse.json(
        { success: false, error: "رقم هاتف غير صالح" },
        { status: 400 },
      );
    }
    if (!orderData.wilaya?.trim()) {
      return NextResponse.json(
        { success: false, error: "الولاية مطلوبة" },
        { status: 400 },
      );
    }
    if (!orderData.baladiya?.trim()) {
      return NextResponse.json(
        { success: false, error: "البلدية مطلوبة" },
        { status: 400 },
      );
    }
    if (!orderData.selectedWatchId) {
      return NextResponse.json(
        { success: false, error: "يرجى اختيار الموديل" },
        { status: 400 },
      );
    }
    if (
      !orderData.deliveryOption ||
      !["home", "desk"].includes(orderData.deliveryOption)
    ) {
      return NextResponse.json(
        { success: false, error: "يرجى اختيار طريقة التوصيل" },
        { status: 400 },
      );
    }

    processedIds.add(orderData.clientRequestId);

    // ✅ Fire integrations AFTER the response is sent — zero latency for the user
    after(async () => {
      // 1. Google Sheets
      await saveToGoogleSheets(orderData);

      // 2. Email
      if (process.env.EMAIL_ENABLED !== "false") {
        try {
          await sendEmailNotification(orderData);
          console.log("Email sent to:", process.env.ORDER_NOTIFICATION_EMAIL);
        } catch (error) {
          console.error("Failed to send email:", error);
        }
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم استلام الطلب بنجاح",
        clientRequestId: orderData.clientRequestId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: true, message: "تم استلام الطلب" },
      { status: 200 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
