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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const writtenRequestId = session.metadata?.written_request_id;

      if (!writtenRequestId) {
        console.error("❌ Missing written_request_id in metadata");
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      console.log("✅ Updating written request:", writtenRequestId);

      const { error } = await supabase
        .from("written_requests")
        .update({
          status: "paid",
          paid: true,
          paid_at: new Date().toISOString(),
          stripe_session_id: session.id,
          payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        })
        .eq("id", writtenRequestId);

      if (error) {
        console.error("❌ Supabase update error:", error);
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

      if (requestLoadError) {
        console.error("❌ Failed to load request for admin email:", requestLoadError);
      }

      if (request?.paid === true && request.admin_email_sent_at == null) {
        try {
          if (!process.env.RESEND_API_KEY) {
            console.error("❌ RESEND_API_KEY is missing");
          } else if (!ADMIN_EMAIL_RECIPIENT) {
            console.error("❌ ADMIN_EMAIL is missing");
          } else {
            const resend = new Resend(process.env.RESEND_API_KEY);

            const identityLine = request.guest_email
              ? `guest_email: ${request.guest_email}`
              : `user_id: ${request.user_id ?? "N/A"}`;

            const adminSendResult = await resend.emails.send({
              from: DEFAULT_EMAIL_FROM,
              to: ADMIN_EMAIL_RECIPIENT,
              subject: "New Paid Written Breakdown",
              text: [
                `request_id: ${request.id}`,
                identityLine,
                `question_1: ${request.question_1 ?? ""}`,
                `question_2: ${request.question_2 ?? ""}`,
                `question_3: ${request.question_3 ?? ""}`,
                `created_at: ${request.created_at ?? ""}`,
                "Paid: YES",
              ].join("\n"),
            });

            if (adminSendResult.error) {
              console.error("❌ Admin email send error:", adminSendResult.error);
            } else {
              const { error: adminEmailSentAtError } = await supabase
                .from("written_requests")
                .update({ admin_email_sent_at: new Date().toISOString() })
                .eq("id", request.id)
                .is("admin_email_sent_at", null);

              if (adminEmailSentAtError) {
                console.error("❌ admin_email_sent_at update error:", adminEmailSentAtError);
              }
            }
          }
        } catch (emailError) {
          console.error("❌ Admin email flow failed:", emailError);
        }
      }

      console.log("🎉 Payment successfully recorded");
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
