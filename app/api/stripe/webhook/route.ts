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
    const { data: paidTransitionRow, error: updateError } = await supabase
      .from("written_requests")
      .update({
        paid: true,
        status: "paid",
      })
      .eq("id", writtenRequestId)
      .eq("paid", false)
      .select("id, user_id, guest_email, question_1, question_2, question_3, status")
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

    if (stripeEmail) {
      const { error: guestEmailUpdateError } = await supabase
        .from("written_requests")
        .update({
          guest_email: stripeEmail,
        })
        .eq("id", writtenRequestId)
        .is("guest_email", null);

      if (guestEmailUpdateError) {
        console.error("Failed to update guest_email from Stripe session", guestEmailUpdateError);
      }
    } else {
      console.error("Missing customer email in Stripe webhook payload", {
        eventType: webhookPayload.eventType,
        stripeObjectId: webhookPayload.stripeObjectId,
        paymentIntentId: webhookPayload.paymentIntentId ?? null,
      });
    }

    const { data: writtenRequest, error: writtenRequestError } = await supabase
      .from("written_requests")
      .select("id, user_id, guest_email, question_1, question_2, question_3, status")
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
      const resend = new Resend(process.env.RESEND_API_KEY);

      if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing. Email send may fail.", {
          writtenRequestId,
          eventType: webhookPayload.eventType,
        });
      }

      let targetEmail = writtenRequest.guest_email?.trim() || stripeEmail || "";

      if (!targetEmail && writtenRequest.user_id) {
        const { data: userData, error: userLookupError } = await supabase.auth.admin.getUserById(
          writtenRequest.user_id
        );

        if (userLookupError) {
          console.error("Failed to resolve authenticated user email", {
            writtenRequestId,
            userId: writtenRequest.user_id,
            error: userLookupError,
          });
        } else {
          targetEmail = userData.user?.email?.trim() || "";
        }
      }

      if (!targetEmail) {
        console.error("No customer email resolved for payment confirmation", {
          writtenRequestId,
          eventType: webhookPayload.eventType,
        });
      } else {
        console.log("Sending email with:", {
          from: DEFAULT_EMAIL_FROM,
          to: targetEmail,
        });

        const customerSendResult = await resend.emails.send({
          from: DEFAULT_EMAIL_FROM,
          to: targetEmail,
          subject: "Payment confirmed — Written Breakdown",
          text: [
            "Your payment was successful.",
            `Request ID: ${writtenRequest.id}`,
            `Status: ${writtenRequest.status ?? "paid"}`,
            "Next step: we will prepare your written breakdown and email it to you within 24–48 hours.",
          ].join("\n"),
        });

        if (customerSendResult.error) {
          console.error("Customer payment email failed", {
            writtenRequestId,
            targetEmail,
            error: customerSendResult.error,
          });
        } else {
          console.log("Customer payment email sent", {
            writtenRequestId,
            targetEmail,
            emailId: customerSendResult.data?.id ?? null,
          });
        }
      }

      const adminSendResult = await resend.emails.send({
        from: DEFAULT_EMAIL_FROM,
        to: ADMIN_GMAIL_RECIPIENT,
        subject: "New Paid Written Breakdown",
        text: [
          `Request ID: ${writtenRequest.id}`,
          `User Email: ${targetEmail || "N/A"}`,
          `Webhook Event: ${webhookPayload.eventType}`,
          `Payment Intent ID: ${webhookPayload.paymentIntentId ?? "N/A"}`,
          "",
          "Questions:",
          `1) ${writtenRequest.question_1 ?? "N/A"}`,
          `2) ${writtenRequest.question_2 ?? "N/A"}`,
          `3) ${writtenRequest.question_3 ?? "N/A"}`,
        ].join("\n"),
      });

      if (adminSendResult.error) {
        console.error("Admin paid email failed", {
          writtenRequestId,
          error: adminSendResult.error,
        });
      } else {
        console.log("Admin paid email sent", {
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
