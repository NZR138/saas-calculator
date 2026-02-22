import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { getStripeServerClient } from "@/app/lib/stripeServer";
import { getSupabaseAdminClient } from "@/app/lib/serverSupabase";

export const runtime = "nodejs";

const ADMIN_GMAIL_RECIPIENT = "ask.profit.calcul@gmail.com";
const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";

type PaymentWebhookPayload = {
  eventType: "checkout.session.completed" | "payment_intent.succeeded";
  writtenRequestId?: string;
  stripeSessionId?: string;
  paymentIntentId?: string;
  customerEmail?: string;
  stripeObjectId: string;
};

function getPaymentWebhookPayload(event: Stripe.Event): PaymentWebhookPayload | null {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    return {
      eventType: event.type,
      writtenRequestId: session.metadata?.written_request_id,
      stripeSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
      stripeObjectId: session.id,
    };
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    return {
      eventType: event.type,
      writtenRequestId: paymentIntent.metadata?.written_request_id,
      paymentIntentId: paymentIntent.id,
      customerEmail:
        paymentIntent.receipt_email ??
        paymentIntent.metadata?.guest_email ??
        undefined,
      stripeObjectId: paymentIntent.id,
    };
  }

  return null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const stripeSignature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripeSignature || !webhookSecret) {
    return new NextResponse("Webhook Error", { status: 400 });
  }

  const stripe = getStripeServerClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, stripeSignature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  const webhookPayload = getPaymentWebhookPayload(event);

  if (!webhookPayload) {
    return NextResponse.json({ received: true });
  }

  console.log("Stripe webhook received", {
    eventType: webhookPayload.eventType,
    stripeObjectId: webhookPayload.stripeObjectId,
    stripeSessionId: webhookPayload.stripeSessionId ?? null,
    paymentIntentId: webhookPayload.paymentIntentId ?? null,
    writtenRequestId: webhookPayload.writtenRequestId ?? null,
  });

  try {
    const writtenRequestId = webhookPayload.writtenRequestId;
    const stripeEmail = webhookPayload.customerEmail?.trim();

    if (!writtenRequestId) {
      console.error("Missing written_request_id in Stripe event metadata", {
        eventType: webhookPayload.eventType,
        stripeObjectId: webhookPayload.stripeObjectId,
        paymentIntentId: webhookPayload.paymentIntentId ?? null,
      });
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseAdminClient();
    const paidAtIso = new Date().toISOString();
    const paidUpdatePayload: {
      paid: boolean;
      status: string;
      paid_at: string;
      stripe_session_id?: string;
      payment_intent_id?: string;
      stripe_payment_intent_id?: string;
      guest_email?: string;
    } = {
      paid: true,
      status: "paid",
      paid_at: paidAtIso,
    };

    if (webhookPayload.stripeSessionId) {
      paidUpdatePayload.stripe_session_id = webhookPayload.stripeSessionId;
    }

    if (webhookPayload.paymentIntentId) {
      paidUpdatePayload.payment_intent_id = webhookPayload.paymentIntentId;
      paidUpdatePayload.stripe_payment_intent_id = webhookPayload.paymentIntentId;
    }

    if (stripeEmail) {
      paidUpdatePayload.guest_email = stripeEmail;
    }

    const { data: paidTransitionRow, error: updateError } = await supabase
      .from("written_requests")
      .update(paidUpdatePayload)
      .eq("id", writtenRequestId)
      .eq("paid", false)
      .select(
        "id, user_id, guest_email, question_1, question_2, question_3, status, calculator_snapshot, calculator_results, stripe_session_id, payment_intent_id, stripe_payment_intent_id"
      )
      .maybeSingle();

    if (updateError) {
      console.error("Failed to update written request payment status", updateError);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }

    const paymentMarkedNow = Boolean(paidTransitionRow);

    console.log("Payment status sync result", {
      writtenRequestId,
      paymentMarkedNow,
      eventType: webhookPayload.eventType,
    });

    if (!stripeEmail) {
      console.error("Missing customer email in Stripe webhook payload", {
        eventType: webhookPayload.eventType,
        stripeObjectId: webhookPayload.stripeObjectId,
        paymentIntentId: webhookPayload.paymentIntentId ?? null,
      });
    }

    const { data: writtenRequest, error: writtenRequestError } = await supabase
      .from("written_requests")
      .select(
        "id, user_id, guest_email, question_1, question_2, question_3, status, calculator_snapshot, calculator_results, stripe_session_id, payment_intent_id, stripe_payment_intent_id"
      )
      .eq("id", writtenRequestId)
      .maybeSingle();

    if (writtenRequestError || !writtenRequest) {
      console.error("Failed to load written request for email notification", writtenRequestError);
      return NextResponse.json({ received: true });
    }

    if (!paymentMarkedNow) {
      console.log("Skipping duplicate email send: written request already paid", {
        writtenRequestId,
        eventType: webhookPayload.eventType,
      });
      return NextResponse.json({ received: true });
    }

    try {
      console.log("PAYMENT CONFIRMED", {
        writtenRequestId,
        customerEmail: stripeEmail ?? writtenRequest.guest_email ?? null,
        stripeSessionId: writtenRequest.stripe_session_id ?? webhookPayload.stripeSessionId ?? null,
        paymentIntentId:
          writtenRequest.payment_intent_id ??
          writtenRequest.stripe_payment_intent_id ??
          webhookPayload.paymentIntentId ??
          null,
      });

      const resend = new Resend(process.env.RESEND_API_KEY);

      if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing. Email send may fail.", {
          writtenRequestId,
          eventType: webhookPayload.eventType,
        });
      }

      const adminSendResult = await resend.emails.send({
        from: DEFAULT_EMAIL_FROM,
        to: ADMIN_GMAIL_RECIPIENT,
        subject: "New Paid Written Breakdown",
        text: [
          `Request ID: ${writtenRequest.id}`,
          `customerEmail: ${stripeEmail ?? writtenRequest.guest_email ?? "N/A"}`,
          `Webhook Event: ${webhookPayload.eventType}`,
          `Stripe Session ID: ${writtenRequest.stripe_session_id ?? webhookPayload.stripeSessionId ?? "N/A"}`,
          `Payment Intent ID: ${writtenRequest.payment_intent_id ?? writtenRequest.stripe_payment_intent_id ?? webhookPayload.paymentIntentId ?? "N/A"}`,
          "",
          "Questions:",
          `1) ${writtenRequest.question_1 ?? "N/A"}`,
          `2) ${writtenRequest.question_2 ?? "N/A"}`,
          `3) ${writtenRequest.question_3 ?? "N/A"}`,
          "",
          "Calculator Snapshot:",
          `${JSON.stringify(writtenRequest.calculator_snapshot ?? {}, null, 2)}`,
          "",
          "Calculator Results:",
          `${JSON.stringify(writtenRequest.calculator_results ?? {}, null, 2)}`,
        ].join("\n"),
      });

      if (adminSendResult.error) {
        console.error("EMAIL FAILED", {
          writtenRequestId,
          error: adminSendResult.error,
        });
      } else {
        console.log("EMAIL SENT to ADMIN", {
          writtenRequestId,
          emailId: adminSendResult.data?.id ?? null,
        });
      }
    } catch (emailError) {
      console.error("Failed to send paid written breakdown email", emailError);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed processing Stripe webhook", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
