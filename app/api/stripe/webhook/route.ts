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

    const responseBody: { received: boolean } = { received: true };

    switch (event.type) {
      case "checkout.session.completed": {
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
            console.error("[WEBHOOK] CHECKOUT LINK UPDATE ERROR", {
              writtenRequestId,
              paymentIntentId,
              error: checkoutLinkError.message,
            });
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
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

        console.log("[WEBHOOK] payment_intent.succeeded START", {
          paymentIntentId,
          writtenRequestId,
          hasAdminEmail: Boolean(ADMIN_EMAIL_RECIPIENT),
        });

        if (!writtenRequestId) {
          console.error("[stripe-webhook] missing written_request linkage", {
            paymentIntentId,
          });
          break;
        }

        console.log("[WEBHOOK] UPDATE START", {
          writtenRequestId,
          paymentIntentId,
          updateBy: "id",
        });

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

        console.log("[WEBHOOK] UPDATE RESULT", {
          writtenRequestId,
          paymentIntentId,
          updateBy: "id",
          updated: Boolean(paidRow),
          error: paidUpdateError?.message ?? null,
        });

        console.log("[stripe-webhook] payment update", {
          writtenRequestId,
          paymentIntentId,
          updated: Boolean(paidRow),
          error: paidUpdateError?.message ?? null,
        });

        if (paidUpdateError) {
          console.error("[WEBHOOK] PAYMENT UPDATE ERROR", {
            writtenRequestId,
            paymentIntentId,
            error: paidUpdateError.message,
          });
          break;
        }

        if (!paidRow) {
          console.error("[WEBHOOK] CRITICAL: PAYMENT UPDATE AFFECTED 0 ROWS", {
            writtenRequestId,
            paymentIntentId,
          });
          break;
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
          break;
        }

        if (request.paid === true && request.admin_email_sent_at == null) {
          try {
            if (!process.env.RESEND_API_KEY) {
              console.error("[stripe-webhook] missing RESEND_API_KEY");
            } else if (!ADMIN_EMAIL_RECIPIENT) {
              console.error("[stripe-webhook] missing ADMIN_EMAIL");
            } else {
              console.log("[WEBHOOK] EMAIL BLOCK ENTER");
              const resend = new Resend(process.env.RESEND_API_KEY);
              let identityEmail = request.guest_email as string | null;

              if (!identityEmail && request.user_id) {
                const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
                identityEmail = userData.user?.email ?? null;
              }

              const calculatorResults = (request.calculator_results ?? {}) as Record<string, unknown>;
              let adminSendResult:
                | Awaited<ReturnType<typeof resend.emails.send>>
                | null = null;

              try {
                adminSendResult = await resend.emails.send({
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
                console.log("[WEBHOOK] EMAIL SENT SUCCESS");
              } catch (error) {
                console.error("[WEBHOOK] EMAIL SEND ERROR", error);
              }

              console.log("[stripe-webhook] resend result", {
                writtenRequestId,
                paymentIntentId,
                ok: adminSendResult ? !adminSendResult.error : false,
                error: adminSendResult?.error?.message ?? null,
              });

              if (adminSendResult && !adminSendResult.error) {
                console.log("[WEBHOOK] ADMIN_EMAIL_SENT_AT UPDATE START", {
                  writtenRequestId,
                  paymentIntentId,
                });

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

                console.log("[WEBHOOK] DB UPDATE AFTER EMAIL DONE");
              }
            }
          } catch (emailError) {
            console.error("[stripe-webhook] admin email flow failed", emailError);
          }
        } else {
          console.log("[WEBHOOK] EMAIL BLOCK SKIPPED", {
            writtenRequestId,
            paymentIntentId,
            paid: request.paid,
            adminEmailSentAt: request.admin_email_sent_at,
          });
        }
        break;
      }

      default:
        console.log("[stripe-webhook] unhandled event", event.type);
    }

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
