import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { getStripeServerClient } from "@/app/lib/stripeServer";
import { getSupabaseAdminClient } from "@/app/lib/serverSupabase";

export const runtime = "nodejs";

const ADMIN_GMAIL_RECIPIENT = "ask.profit.calcul@gmail.com";

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

  console.log("Event type:", event.type);

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const written_request_id = session.metadata?.written_request_id;
    const customerEmail = session.customer_details?.email;

    console.log("Session ID:", session.id);
    console.log("Written request ID:", written_request_id);

    if (!written_request_id) {
      console.error("Missing written_request_id in checkout session metadata", session.id);
      return NextResponse.json({ received: true });
    }

    const supabase = getSupabaseAdminClient();
    const { error: updateError } = await supabase
      .from("written_requests")
      .update({
        paid: true,
        status: "paid",
      })
      .eq("id", written_request_id);

    if (updateError) {
      console.error("Failed to update written request payment status", updateError);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }

    if (customerEmail) {
      const { error: guestEmailUpdateError } = await supabase
        .from("written_requests")
        .update({
          guest_email: customerEmail,
        })
        .eq("id", written_request_id)
        .is("guest_email", null);

      if (guestEmailUpdateError) {
        console.error("Failed to update guest_email from Stripe session", guestEmailUpdateError);
      }
    } else {
      console.error("Missing customer_details.email in checkout session", session.id);
    }

    try {
      const { data: writtenRequest, error: writtenRequestError } = await supabase
        .from("written_requests")
        .select("id, guest_email, question_1, question_2, question_3")
        .eq("id", written_request_id)
        .single();

      if (writtenRequestError || !writtenRequest) {
        console.error("Failed to load written request for email notification", writtenRequestError);
      } else {
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
          console.error("RESEND_API_KEY is missing. Skipping paid email notification.");
        } else {
          const resend = new Resend(resendApiKey);

          await resend.emails.send({
            from: "onboarding@resend.dev",
            to: ADMIN_GMAIL_RECIPIENT,
            subject: "New Paid Written Breakdown",
            text: [
              `Request ID: ${writtenRequest.id}`,
              `User Email: ${writtenRequest.guest_email ?? "N/A"}`,
              "",
              "Questions:",
              `1) ${writtenRequest.question_1 ?? "N/A"}`,
              `2) ${writtenRequest.question_2 ?? "N/A"}`,
              `3) ${writtenRequest.question_3 ?? "N/A"}`,
            ].join("\n"),
          });
        }
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
