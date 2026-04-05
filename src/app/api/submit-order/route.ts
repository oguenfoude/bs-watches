import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

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

// Dedup set
const processedIds = new Set<string>();


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

function getWatchImageAttachment(watchId: string) {
  const match = watchId.match(/model-(\d+)/);
  if (!match) return null;
  const num = match[1];
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
  const attachment = getWatchImageAttachment(orderData.selectedWatchId);

  const imageBlock = attachment
    ? `<img src="cid:${attachment.cid}" alt="${watchName}" style="max-width:220px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />`
    : "";

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
// API HANDLERS
// ─────────────────────────────────────────────
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  try {
    const orderData: OrderData = await request.json();

    if (!orderData.clientRequestId) {
      orderData.clientRequestId =
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    // Dedup
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
    const phoneDigits = (orderData.phone || "").replace(/\D/g, "");
    if (phoneDigits.length !== 10 || !/^0[567]/.test(phoneDigits)) {
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

    try {
      await sendEmailNotification(orderData);
      console.log("Email sent to:", process.env.ORDER_NOTIFICATION_EMAIL);
    } catch (error) {
      console.error("Failed to send email:", error);
    }

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
