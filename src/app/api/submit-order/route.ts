import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Order data interface
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

// Response interface
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  clientRequestId?: string;
  row?: number;
}

// Track processed request IDs
const processedIds = new Set<string>();

// Get Google Sheets client
function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Google credentials (EMAIL/PRIVATE_KEY) not configured");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

// Get email transporter
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

// Append order to Google Sheets
async function appendToSheet(orderData: OrderData): Promise<number> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID not configured");
  }

  const sheets = getGoogleSheetsClient();

  const now = new Date();
  const watchLabel = orderData.selectedWatchName || orderData.selectedWatchId;
  const rowData = [
    now.toISOString(),
    orderData.clientRequestId || "",
    orderData.fullName,
    orderData.phone,
    orderData.wilaya,
    orderData.baladiya,
    watchLabel,
    orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب",
    orderData.boxPrice.toString(),
    orderData.deliveryCost.toString(),
    orderData.total.toString(),
    orderData.notes || "",
    "جديد",
  ];

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:M",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowData] },
    });

    const updatedRange = response.data.updates?.updatedRange || "";
    const rowMatch = updatedRange.match(/:(\d+)$/);
    return rowMatch ? parseInt(rowMatch[1], 10) : 0;
  } catch (error) {
    // If Sheet1 doesn't exist, try without sheet name (default sheet)
    if (
      error instanceof Error &&
      error.message?.includes("Unable to parse range")
    ) {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:M",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [rowData] },
      });

      const updatedRange = response.data.updates?.updatedRange || "";
      const rowMatch = updatedRange.match(/:(\d+)$/);
      return rowMatch ? parseInt(rowMatch[1], 10) : 0;
    }
    throw error;
  }
}

// Read watch image from disk and return as Buffer + filename
function getWatchImageAttachment(
  watchId: string,
): { content: Buffer; filename: string; cid: string } | null {
  const match = watchId.match(/model-(\d+)/);
  if (!match) return null;

  const imageNumber = match[1];
  const imagePath = path.join(
    process.cwd(),
    "public",
    "images",
    "watches",
    `${imageNumber}.webp`,
  );

  try {
    const content = fs.readFileSync(imagePath);
    return {
      content,
      filename: `watch-${imageNumber}.webp`,
      cid: `watch-image-${imageNumber}@bsmonters`,
    };
  } catch (err) {
    console.error(`Failed to read watch image at ${imagePath}:`, err);
    return null;
  }
}

// Send email notification
async function sendEmailNotification(orderData: OrderData): Promise<void> {
  const transporter = getEmailTransporter();
  if (!transporter) return;

  // Get notification emails from env (comma separated)
  const notificationEmails =
    process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_FROM_EMAIL;
  if (!notificationEmails) return;

  const deliveryLabel =
    orderData.deliveryOption === "home" ? "توصيل للمنزل" : "توصيل للمكتب";

  const watchName = orderData.selectedWatchName || orderData.selectedWatchId;

  // Get the watch image as a CID attachment
  const watchImageAttachment = getWatchImageAttachment(
    orderData.selectedWatchId,
  );

  // Build image HTML: embedded CID if available, otherwise just text
  const imageHtml = watchImageAttachment
    ? `<img src="cid:${watchImageAttachment.cid}" alt="${watchName}" style="max-width: 250px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />`
    : `<p style="color: #92400e; font-style: italic;">صورة الموديل غير متوفرة</p>`;

  const mailOptions = {
    from: `"طلبات المتجر" <${process.env.SMTP_FROM_EMAIL}>`,
    to: notificationEmails, // Can be comma-separated for multiple recipients
    subject: `🛒 طلب جديد #${orderData.clientRequestId?.slice(-6)} - ${orderData.fullName}`,
    attachments: watchImageAttachment
      ? [
          {
            filename: watchImageAttachment.filename,
            content: watchImageAttachment.content,
            cid: watchImageAttachment.cid,
            contentType: "image/webp",
          },
        ]
      : [],
    html: `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffbeb; border-radius: 16px; overflow: hidden; border: 1px solid #fde68a;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #92400e, #b45309); color: white; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px;">🛒 طلب جديد</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">رقم الطلب: #${orderData.clientRequestId?.slice(-6)}</p>
        </div>
        
        <div style="padding: 24px;">
          
          <!-- Product Image Section -->
          <div style="text-align: center; margin-bottom: 24px; padding: 24px; background: white; border-radius: 12px; border: 2px solid #fde68a;">
            <h3 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px;">الموديل المختار</h3>
            ${imageHtml}
            <p style="font-size: 20px; font-weight: bold; color: #92400e; margin: 16px 0 4px 0;">${watchName}</p>
            <p style="font-size: 14px; color: #78716c; margin: 0;">السعر: ${orderData.boxPrice.toLocaleString()} دج</p>
          </div>

          <!-- Order Details Table -->
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4;">
            <tr style="background: #fef3c7;">
              <td style="padding: 14px 16px; font-weight: bold; width: 35%; color: #78716c; font-size: 14px;">الاسم</td>
              <td style="padding: 14px 16px; font-size: 15px; color: #1c1917;">${orderData.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; font-weight: bold; color: #78716c; font-size: 14px; border-top: 1px solid #f5f5f4;">الهاتف</td>
              <td style="padding: 14px 16px; font-size: 15px; color: #1c1917; border-top: 1px solid #f5f5f4;">${orderData.phone}</td>
            </tr>
            <tr style="background: #fef3c7;">
              <td style="padding: 14px 16px; font-weight: bold; color: #78716c; font-size: 14px;">الولاية</td>
              <td style="padding: 14px 16px; font-size: 15px; color: #1c1917;">${orderData.wilaya}</td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; font-weight: bold; color: #78716c; font-size: 14px; border-top: 1px solid #f5f5f4;">البلدية</td>
              <td style="padding: 14px 16px; font-size: 15px; color: #1c1917; border-top: 1px solid #f5f5f4;">${orderData.baladiya}</td>
            </tr>
            <tr style="background: #fef3c7;">
              <td style="padding: 14px 16px; font-weight: bold; color: #78716c; font-size: 14px;">التوصيل</td>
              <td style="padding: 14px 16px; font-size: 15px; color: #1c1917;">${deliveryLabel}</td>
            </tr>
            ${
              orderData.notes
                ? `
            <tr>
              <td style="padding: 14px 16px; font-weight: bold; color: #78716c; font-size: 14px; border-top: 1px solid #f5f5f4;">ملاحظات</td>
              <td style="padding: 14px 16px; font-size: 15px; color: #1c1917; border-top: 1px solid #f5f5f4;">${orderData.notes}</td>
            </tr>
            `
                : ""
            }
          </table>

          <!-- Price Summary -->
          <div style="margin-top: 20px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4;">
            <div style="padding: 14px 16px; display: flex; justify-content: space-between; border-bottom: 1px solid #f5f5f4;">
              <span style="color: #78716c;">سعر الطقم</span>
              <span style="color: #1c1917; font-weight: 600;">${orderData.boxPrice.toLocaleString()} دج</span>
            </div>
            <div style="padding: 14px 16px; display: flex; justify-content: space-between; border-bottom: 1px solid #f5f5f4;">
              <span style="color: #78716c;">التوصيل</span>
              <span style="color: #1c1917; font-weight: 600;">${orderData.deliveryCost.toLocaleString()} دج</span>
            </div>
            <div style="padding: 16px; display: flex; justify-content: space-between; background: linear-gradient(135deg, #92400e, #b45309); color: white;">
              <span style="font-weight: bold; font-size: 16px;">المجموع الكلي</span>
              <span style="font-weight: bold; font-size: 20px;">${orderData.total.toLocaleString()} دج</span>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f5f5f4; padding: 16px; text-align: center; font-size: 12px; color: #a8a29e;">
          تم استلام هذا الطلب من المتجر الإلكتروني
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

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

    // Check for duplicates
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

    // Validate required fields
    if (!orderData.fullName?.trim() || orderData.fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "الاسم الكامل مطلوب" },
        { status: 400 },
      );
    }

    const phoneDigits = (orderData.phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 13) {
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

    let rowNumber = 0;

    // Try to save to Google Sheets
    try {
      rowNumber = await appendToSheet(orderData);
      console.log("✅ Order saved to sheet, row:", rowNumber);
    } catch (error) {
      console.error("❌ Failed to save to sheet:", error);
    }

    // Try to send email
    try {
      await sendEmailNotification(orderData);
      console.log("✅ Email sent to:", process.env.ORDER_NOTIFICATION_EMAIL);
    } catch (error) {
      console.error("❌ Failed to send email:", error);
    }

    // Return success even if sheet/email failed
    return NextResponse.json(
      {
        success: true,
        message: "تم استلام الطلب بنجاح",
        clientRequestId: orderData.clientRequestId,
        row: rowNumber,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { success: true, message: "تم استلام الطلب (بانتظار التأكيد)" },
      { status: 200 },
    );
  }
}

// Simple test endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "API is working",
    timestamp: new Date().toISOString(),
  });
}
