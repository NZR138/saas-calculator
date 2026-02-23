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
  console.log("Webhook hit");

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

  console.log("Stripe event type:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (!session.metadata?.written_request_id) {
      console.error("Missing written_request_id metadata");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }
  }

  const webhookPayload = getPaymentWebhookPayload(event);

  if (!webhookPayload) {
    return NextResponse.json({ received: true });
  }

  try {
    const writtenRequestId = webhookPayload.writtenRequestId;
    const stripeSessionId = webhookPayload.stripeSessionId;
    const stripeEmail = webhookPayload.customerEmail?.trim();

    const lookupColumn =
      webhookPayload.eventType === "checkout.session.completed"
        ? "stripe_session_id"
        : "stripe_payment_intent_id";
    const lookupValue =
      webhookPayload.eventType === "checkout.session.completed"
        ? stripeSessionId
        : webhookPayload.paymentIntentId;

    if (!lookupValue) {
      console.error("Missing webhook lookup value for written request update", {
        eventType: webhookPayload.eventType,
        stripeObjectId: webhookPayload.stripeObjectId,
        stripeSessionId: stripeSessionId ?? null,
        writtenRequestId: writtenRequestId ?? null,
        paymentIntentId: webhookPayload.paymentIntentId ?? null,
      });
      return NextResponse.json({ received: true });
    }

    console.log("Updating written request:", writtenRequestId);

    const supabase = getSupabaseAdminClient();
    const paidAtIso = new Date().toISOString();
    const paidUpdatePayload: {
      paid: boolean;
      status: string;
      paid_at: string;
      stripe_session_id?: string;
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
      paidUpdatePayload.stripe_payment_intent_id = webhookPayload.paymentIntentId;
    }

    if (stripeEmail) {
      paidUpdatePayload.guest_email = stripeEmail;
    }

    const { data: paidTransitionRow, error: updateError } = await supabase
      .from("written_requests")
      .update(paidUpdatePayload)
      .eq(lookupColumn, lookupValue)
      .or("paid.eq.false,paid.is.null")
      .select(
        "id, user_id, guest_email, question_1, question_2, question_3, status, calculator_snapshot, calculator_results, stripe_session_id, stripe_payment_intent_id"
      )
      .maybeSingle();

    if (updateError) {
      console.error("Failed to update written request payment status", updateError);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }

    const paymentMarkedNow = Boolean(paidTransitionRow);

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
        "id, user_id, guest_email, question_1, question_2, question_3, status, calculator_snapshot, calculator_results, stripe_session_id, stripe_payment_intent_id"
      )
      .eq(lookupColumn, lookupValue)
      .maybeSingle();

    if (writtenRequestError || !writtenRequest) {
      console.error("Failed to load written request for email notification", writtenRequestError);
      return NextResponse.json({ received: true });
    }

    if (!paymentMarkedNow) {
      return NextResponse.json({ received: true });
    }

    try {
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
          `Payment Intent ID: ${writtenRequest.stripe_payment_intent_id ?? webhookPayload.paymentIntentId ?? "N/A"}`,
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
