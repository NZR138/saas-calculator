import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-01-28.clover",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim();
const ADMIN_EMAIL_RECIPIENT = process.env.ADMIN_EMAIL?.trim();

async function sendAdminEmail(request: {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  question_1: string | null;
  question_2: string | null;
  question_3: string | null;
  calculator_snapshot?: Record<string, unknown> | null;
  calculator_results?: Record<string, unknown> | null;
}) {
  if (!ADMIN_EMAIL_RECIPIENT) {
    console.error("Missing ADMIN_EMAIL");
    return;
  }

  if (!FROM_EMAIL) {
    console.error("Missing RESEND_FROM_EMAIL");
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("[stripe-webhook] missing RESEND_API_KEY");
    return;
  }

  const formatTwoDecimals = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "—";
    return numericValue.toFixed(2);
  };

  const formatMargin = (value: unknown) => {
    const formattedValue = formatTwoDecimals(value);
    if (formattedValue === "—") return "—";
    return `${formattedValue}%`;
  };

  const safeQuestion = (value: string | null | undefined) => {
    const trimmedValue = (value ?? "").trim();
    return trimmedValue.length > 0 ? trimmedValue : "—";
  };

  const formatInputValue = (value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue.toFixed(2);
    const textValue = String(value).trim();
    return textValue.length > 0 ? textValue : "—";
  };

  const resend = new Resend(process.env.RESEND_API_KEY);
  let identityEmail = request.guest_email;

  if (!identityEmail && request.user_id) {
    const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
    identityEmail = userData.user?.email ?? null;
  }

  const calculatorResults = (request.calculator_results ?? {}) as Record<string, unknown>;
  const calculatorSnapshot =
    request.calculator_snapshot && typeof request.calculator_snapshot === "object"
      ? (request.calculator_snapshot as Record<string, unknown>)
      : null;

  const snapshotFieldDefinitions: Array<{ key: string; label: string }> = [
    { key: "productPrice", label: "Product Price" },
    { key: "unitsSold", label: "Units Sold" },
    { key: "productCost", label: "Product Cost" },
    { key: "shippingCost", label: "Shipping Cost" },
    { key: "paymentProcessingPercent", label: "Payment Processing %" },
    { key: "adSpend", label: "Ad Spend" },
    { key: "vatIncluded", label: "VAT Included" },
  ];

  const snapshotRows = calculatorSnapshot
    ? snapshotFieldDefinitions
        .filter(({ key }) => Object.prototype.hasOwnProperty.call(calculatorSnapshot, key))
        .map(({ key, label }) => {
          const value = calculatorSnapshot[key];
          return `
            <tr>
              <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${label}</td>
              <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;" align="right">${formatInputValue(value)}</td>
            </tr>
          `;
        })
        .join("")
    : "";

  const inputDataSectionHtml = snapshotRows
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
         <tr>
           <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;">Input</td>
           <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;" align="right">Value</td>
         </tr>
         ${snapshotRows}
       </table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
         <tr>
           <td style="padding:10px 12px;font-size:14px;color:#6b7280;">—</td>
         </tr>
       </table>`;

  const revenueFormatted = formatTwoDecimals(calculatorResults.revenue);
  const totalCostsFormatted = formatTwoDecimals(calculatorResults.totalCosts);
  const profitFormatted = formatTwoDecimals(calculatorResults.profit);
  const marginFormatted = formatMargin(calculatorResults.margin);
  const emailFormatted = (identityEmail ?? "").trim() || "—";
  const question1Formatted = safeQuestion(request.question_1);
  const question2Formatted = safeQuestion(request.question_2);
  const question3Formatted = safeQuestion(request.question_3);
  const renderedAt = new Date().toISOString();

  const adminSendResult = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL_RECIPIENT,
    replyTo: ADMIN_EMAIL_RECIPIENT,
    subject: "New Paid Written Breakdown",
    html: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f7fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
                  <div style="font-size:20px;line-height:28px;font-weight:700;color:#111827;">New Paid Written Breakdown</div>
                  <div style="margin-top:10px;display:inline-block;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;">PAID</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-size:12px;color:#6b7280;padding-bottom:6px;">Request ID</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:600;padding-bottom:16px;word-break:break-all;">${request.id}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#6b7280;padding-bottom:6px;">User Email</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:600;padding-bottom:4px;">${emailFormatted}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:700;padding-bottom:10px;">Questions</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;">1) ${question1Formatted}</td>
                    </tr>
                    <tr><td style="height:8px;"></td></tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;">2) ${question2Formatted}</td>
                    </tr>
                    <tr><td style="height:8px;"></td></tr>
                    <tr>
                      <td style="font-size:14px;color:#111827;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;">3) ${question3Formatted}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td style="font-size:14px;color:#111827;font-weight:700;padding-bottom:10px;">Data Overview</td>
                    </tr>
                    <tr>
                      <td>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                          <tr>
                            <td width="50%" valign="top" style="padding-right:8px;">
                              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                  <td style="font-size:13px;color:#111827;font-weight:700;padding-bottom:8px;">Input Data</td>
                                </tr>
                                <tr>
                                  <td>
                                    ${inputDataSectionHtml}
                                  </td>
                                </tr>
                              </table>
                            </td>
                            <td width="50%" valign="top" style="padding-left:8px;">
                              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                  <td style="font-size:13px;color:#111827;font-weight:700;padding-bottom:8px;">Results</td>
                                </tr>
                                <tr>
                                  <td>
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                                      <tr>
                                        <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;">Metric</td>
                                        <td style="padding:10px 12px;font-size:12px;color:#6b7280;background:#f9fafb;" align="right">Value</td>
                                      </tr>
                                      <tr>
                                        <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">Revenue</td>
                                        <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;" align="right">${revenueFormatted}</td>
                                      </tr>
                                      <tr>
                                        <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">Total Costs</td>
                                        <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;" align="right">${totalCostsFormatted}</td>
                                      </tr>
                                      <tr>
                                        <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;font-weight:700;">Profit</td>
                                        <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;font-weight:700;" align="right">${profitFormatted}</td>
                                      </tr>
                                      <tr>
                                        <td style="padding:10px 12px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">Margin</td>
                                        <td style="padding:10px 12px;font-size:14px;color:#166534;border-top:1px solid #e5e7eb;font-weight:700;" align="right">${marginFormatted}</td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;font-size:12px;line-height:18px;color:#6b7280;">
                  This tool does not constitute financial advice.<br/>
                  Generated at: ${renderedAt}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    text: [
      "New Paid Written Breakdown",
      "",
      `request_id: ${request.id}`,
      `email: ${emailFormatted}`,
      `question_1: ${question1Formatted}`,
      `question_2: ${question2Formatted}`,
      `question_3: ${question3Formatted}`,
      `revenue: ${revenueFormatted}`,
      `totalCosts: ${totalCostsFormatted}`,
      `profit: ${profitFormatted}`,
      `margin: ${marginFormatted}`,
      "Paid: YES",
      `Generated at: ${renderedAt}`,
    ].join("\n"),
  });

  if (adminSendResult.error) {
    const resendError = adminSendResult.error as {
      statusCode?: number;
      message?: string;
    } | null;

    console.error("[stripe-webhook] resend error", {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL_RECIPIENT,
      statusCode: resendError?.statusCode ?? null,
      message: resendError?.message ?? null,
      error: resendError,
    });
    return;
  }

  console.log("[WEBHOOK] EMAIL SENT");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("❌ Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const writtenRequestId =
          session.metadata?.written_request_id ??
          (typeof session.client_reference_id === "string"
            ? session.client_reference_id
            : null);
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        console.log("[WEBHOOK] checkout.session.completed", {
          writtenRequestId,
          stripeSessionId: session.id,
          paymentIntentId,
        });

        if (!writtenRequestId) {
          console.error("[WEBHOOK] missing written_request_id; skipping", {
            stripeSessionId: session.id,
            paymentIntentId,
          });
          break;
        }

        const { data: updatedRequest, error: updateError } = await supabase
          .from("written_requests")
          .update({
            status: "paid",
            payment_intent_id: paymentIntentId,
          })
          .eq("id", writtenRequestId)
          .eq("status", "awaiting_payment")
          .select("id, user_id, guest_email, question_1, question_2, question_3, calculator_snapshot, calculator_results")
          .maybeSingle();

        if (updateError) {
          console.error("[WEBHOOK] DB UPDATE ERROR", {
            writtenRequestId,
            paymentIntentId,
            error: updateError.message,
          });
          break;
        }

        if (!updatedRequest) {
          console.log("[WEBHOOK] no rows updated — skipping email", {
            writtenRequestId,
            paymentIntentId,
          });
          break;
        }

        console.log("[WEBHOOK] DB UPDATE SUCCESS", {
          writtenRequestId,
          paymentIntentId,
          updated: true,
        });

        await sendAdminEmail(updatedRequest);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
    return NextResponse.json({ received: true });
  }
}
