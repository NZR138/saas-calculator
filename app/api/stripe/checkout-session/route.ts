import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAppBaseUrl } from "@/app/lib/stripeServer";
import {
  getSupabaseAdminClient,
  getUserFromAccessToken,
} from "@/app/lib/serverSupabase";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

type CheckoutRequestBody = {
  guestEmail?: string;
  questions?: string[];
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBearerToken(headerValue: string | null) {
  if (!headerValue) return undefined;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }
  return token;
}

function sanitizeQuestion(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin;

    const body = (await request.json()) as CheckoutRequestBody;
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (questions.length !== 3) {
      return NextResponse.json(
        { error: "Please provide all 3 questions." },
        { status: 400 }
      );
    }

    const question1 = sanitizeQuestion(questions[0]);
    const question2 = sanitizeQuestion(questions[1]);
    const question3 = sanitizeQuestion(questions[2]);

    const allQuestions = [question1, question2, question3];
    const hasInvalidQuestion = allQuestions.some(
      (question) => question.length === 0 || question.length > 200
    );

    if (hasInvalidQuestion) {
      return NextResponse.json(
        { error: "Each question must be between 1 and 200 characters." },
        { status: 400 }
      );
    }

    const accessToken = parseBearerToken(request.headers.get("authorization"));
    const authenticatedUser = await getUserFromAccessToken(accessToken);

    const guestEmail = (body.guestEmail ?? "").trim();
    const email = authenticatedUser?.email || guestEmail;

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: writtenRequest, error: writtenRequestError } = await supabase
      .from("written_requests")
      .insert({
        user_id: authenticatedUser?.id ?? null,
        
        guest_email: authenticatedUser?.id ? null : guestEmail,
        question_1: question1,
        question_2: question2,
        question_3: question3,
        status: "awaiting_payment",
        paid: false,
      })
      .select("id")
      .single();

    if (writtenRequestError || !writtenRequest) {
      console.error("written_requests insert failed", writtenRequestError);
      return NextResponse.json(
        { error: writtenRequestError?.message || "Unable to create written request." },
        { status: 500 }
      );
    }

    const baseUrl = getAppBaseUrl(requestOrigin);

    const metadata: Stripe.MetadataParam = {
      written_request_id: String(writtenRequest.id),
      user_id: authenticatedUser?.id ?? "null",
    };

    if (!authenticatedUser?.id && guestEmail) {
      metadata.guest_email = guestEmail;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: 3900,
            product_data: {
              name: "Written Breakdown",
            },
          },
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
      },
      success_url: `${baseUrl}/written-breakdown?request_id=${writtenRequest.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/written-breakdown?cancelled=1&request_id=${writtenRequest.id}`,
    });

    const { error: writtenRequestUpdateError } = await supabase
      .from("written_requests")
      .update({
        stripe_session_id: session.id,
      })
      .eq("id", writtenRequest.id);

    if (writtenRequestUpdateError) {
      console.error("Failed to persist stripe session id", writtenRequestUpdateError);
      return NextResponse.json(
        { error: "Unable to persist payment session." },
        { status: 500 }
      );
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Unable to initialize payment session." },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed", error);

    const message =
      error instanceof Error ? error.message : "Unable to start checkout.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
