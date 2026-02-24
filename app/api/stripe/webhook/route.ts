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

const ADMIN_EMAIL_RECIPIENT = process.env.ADMIN_EMAIL as string;
const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";

function readPaymentIntentIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  return session.payment_intent?.id ?? null;
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
    console.log("[stripe-webhook] received", {
      eventType: event.type,
      hasAdminEmail: Boolean(ADMIN_EMAIL_RECIPIENT),
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const writtenRequestId =
        session.metadata?.written_request_id ??
        (typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : null);
      const paymentIntentId = readPaymentIntentIdFromCheckoutSession(session);

      console.log("[stripe-webhook] checkout.session.completed", {
        writtenRequestId,
        stripeSessionId: session.id,
        paymentIntentId,
      });

      if (writtenRequestId) {
        const updatePayload: {
          status: "awaiting_payment";
          stripe_session_id: string;
          payment_intent_id?: string;
        } = {
          status: "awaiting_payment",
          stripe_session_id: session.id,
        };

        if (paymentIntentId) {
          updatePayload.payment_intent_id = paymentIntentId;
        }

        const { data: checkoutLinkedRow, error: checkoutLinkError } = await supabase
          .from("written_requests")
          .update(updatePayload)
          .eq("id", writtenRequestId)
          .select("id")
          .maybeSingle();

        console.log("[stripe-webhook] checkout link update", {
          writtenRequestId,
          paymentIntentId,
          updated: Boolean(checkoutLinkedRow),
          error: checkoutLinkError?.message ?? null,
        });

        if (checkoutLinkError) {
          return NextResponse.json(
            { error: "Database update failed" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;
      let writtenRequestId = paymentIntent.metadata?.written_request_id ?? null;

      if (!writtenRequestId) {
        const { data: linkedRequest } = await supabase
          .from("written_requests")
          .select("id")
          .eq("payment_intent_id", paymentIntentId)
          .maybeSingle();
        writtenRequestId = linkedRequest?.id ?? null;
      }

      console.log("[stripe-webhook] payment_intent.succeeded", {
        writtenRequestId,
        paymentIntentId,
      });

      if (!writtenRequestId) {
        console.error("[stripe-webhook] missing written_request linkage", {
          paymentIntentId,
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const paidAt = new Date().toISOString();
      const { data: paidRow, error: paidUpdateError } = await supabase
        .from("written_requests")
        .update({
          status: "paid",
          paid: true,
          paid_at: paidAt,
          payment_intent_id: paymentIntentId,
        })
        .eq("id", writtenRequestId)
        .select("id")
        .maybeSingle();

      console.log("[stripe-webhook] payment update", {
        writtenRequestId,
        paymentIntentId,
        updated: Boolean(paidRow),
        error: paidUpdateError?.message ?? null,
      });

      if (paidUpdateError) {
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }

      const { data: request, error: requestLoadError } = await supabase
        .from("written_requests")
        .select("*")
        .eq("id", writtenRequestId)
        .single();

      if (requestLoadError || !request) {
        console.error("[stripe-webhook] request load failed", {
          writtenRequestId,
          paymentIntentId,
          error: requestLoadError?.message ?? null,
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (request.paid === true && request.admin_email_sent_at == null) {
        try {
          if (!process.env.RESEND_API_KEY) {
            console.error("[stripe-webhook] missing RESEND_API_KEY");
          } else if (!ADMIN_EMAIL_RECIPIENT) {
            console.error("[stripe-webhook] missing ADMIN_EMAIL");
          } else {
            const resend = new Resend(process.env.RESEND_API_KEY);
            let identityEmail = request.guest_email as string | null;

            if (!identityEmail && request.user_id) {
              const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
              identityEmail = userData.user?.email ?? null;
            }

            const calculatorResults = (request.calculator_results ?? {}) as Record<string, unknown>;
            const adminSendResult = await resend.emails.send({
              from: DEFAULT_EMAIL_FROM,
              to: ADMIN_EMAIL_RECIPIENT,
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

            console.log("[stripe-webhook] resend result", {
              writtenRequestId,
              paymentIntentId,
              ok: !adminSendResult.error,
              error: adminSendResult.error?.message ?? null,
            });

            if (!adminSendResult.error) {
              const { error: adminEmailSentAtError } = await supabase
                .from("written_requests")
                .update({ admin_email_sent_at: new Date().toISOString() })
                .eq("id", request.id)
                .is("admin_email_sent_at", null);

              if (adminEmailSentAtError) {
                console.error("[stripe-webhook] admin_email_sent_at update failed", {
                  writtenRequestId,
                  paymentIntentId,
                  error: adminEmailSentAtError.message,
                });
              }
            }
          }
        } catch (emailError) {
          console.error("[stripe-webhook] admin email flow failed", emailError);
        }
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
