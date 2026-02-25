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

const resendFromEmailEnv = process.env.RESEND_FROM_EMAIL?.trim();
const adminEmailEnv = process.env.ADMIN_EMAIL?.trim();

if (!resendFromEmailEnv) {
  throw new Error("RESEND_FROM_EMAIL is not defined");
}

if (!adminEmailEnv) {
  throw new Error("ADMIN_EMAIL is not defined");
}

const FROM_EMAIL: string = resendFromEmailEnv;
const ADMIN_EMAIL_RECIPIENT: string = adminEmailEnv;

async function sendAdminEmail(request: {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  question_1: string | null;
  question_2: string | null;
  question_3: string | null;
  calculator_results?: Record<string, unknown> | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[stripe-webhook] missing RESEND_API_KEY");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let identityEmail = request.guest_email;

  if (!identityEmail && request.user_id) {
    const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
    identityEmail = userData.user?.email ?? null;
  }

  const calculatorResults = (request.calculator_results ?? {}) as Record<string, unknown>;
  const adminSendResult = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL_RECIPIENT,
    replyTo: ADMIN_EMAIL_RECIPIENT,
    subject: "New Paid Written Breakdown",
    text: [
      `request_id: ${request.id}`,
      `email: ${identityEmail ?? "N/A"}`,
      `question_1: ${request.question_1 ?? ""}`,
      `question_2: ${request.question_2 ?? ""}`,
      `question_3: ${request.question_3 ?? ""}`,
      `revenue: ${String(calculatorResults.revenue ?? "N/A")}`,
      `totalCosts: ${String(calculatorResults.totalCosts ?? "N/A")}`,
      `profit: ${String(calculatorResults.profit ?? "N/A")}`,
      `margin: ${String(calculatorResults.margin ?? "N/A")}`,
      "Paid: YES",
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
          .select("id, user_id, guest_email, question_1, question_2, question_3, calculator_results")
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
