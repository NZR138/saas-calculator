import { Resend } from "resend";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return Response.json({ success: false, error: "Missing RESEND_API_KEY" });
    }

    if (!process.env.ADMIN_EMAIL) {
      return Response.json({ success: false, error: "Missing ADMIN_EMAIL" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: "noreply@ukprofit.co.uk",
      to: process.env.ADMIN_EMAIL,
      subject: "UK Profit Test Email",
      html: "<strong>Email system works ✅</strong>",
    });

    return Response.json({ success: true, result });

  } catch (error: any) {
    return Response.json({
      success: false,
      error: error?.message || "Unknown error"
    });
  }
}
