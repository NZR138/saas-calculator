import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAppBaseUrl } from "@/app/lib/stripeServer";
import { assertCriticalEnvInDevelopment } from "@/app/lib/envValidation";
import { checkRateLimit } from "@/app/lib/rateLimit";
import {
  getSupabaseAdminClient,
  getUserFromAccessToken,
} from "@/app/lib/serverSupabase";

export const runtime = "nodejs";

assertCriticalEnvInDevelopment();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

type CheckoutRequestBody = {
  mode?: "draft" | "checkout";
  requestId?: string;
  guestEmail?: string;
  questions?: string[];
  calculatorSnapshot?: Record<string, unknown>;
  calculatorResults?: Record<string, unknown>;
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
    const rateLimitResult = checkRateLimit(request, {
      keyPrefix: "checkout-session",
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
          },
        }
      );
    }

    const requestOrigin = new URL(request.url).origin;

    const body = (await request.json()) as CheckoutRequestBody;
    const mode = body.mode === "draft" ? "draft" : "checkout";
    const requestId = body.requestId?.trim();
    const questions = Array.isArray(body.questions) ? body.questions : [];
    const calculatorSnapshot =
      body.calculatorSnapshot && typeof body.calculatorSnapshot === "object"
        ? body.calculatorSnapshot
        : null;
    const calculatorResults =
      body.calculatorResults && typeof body.calculatorResults === "object"
        ? body.calculatorResults
        : null;

    const question1 = sanitizeQuestion(questions[0]);
    const question2 = sanitizeQuestion(questions[1]);
    const question3 = sanitizeQuestion(questions[2]);

    const supabase = getSupabaseAdminClient();

    if (mode === "draft") {
      const draftPayload = {
        user_id: null as string | null,
        guest_email: null as string | null,
        question_1: question1,
        question_2: question2,
        question_3: question3,
        status: "draft" as const,
        paid: false,
        calculator_snapshot: calculatorSnapshot,
        calculator_results: calculatorResults,
      };

      const accessToken = parseBearerToken(request.headers.get("authorization"));
      const authenticatedUser = await getUserFromAccessToken(accessToken);

      draftPayload.user_id = authenticatedUser?.id ?? null;

      if (authenticatedUser?.id) {
        const { data: userData } = await supabase.auth.admin.getUserById(authenticatedUser.id);
        draftPayload.guest_email = userData.user?.email ?? null;
      }

      if (!authenticatedUser?.id) {
        const guestEmail = (body.guestEmail ?? "").trim();
        draftPayload.guest_email = guestEmail || null;
      }

      if (requestId) {
        const { data: updatedDraft, error: draftUpdateError } = await supabase
          .from("written_requests")
          .update(draftPayload)
          .eq("id", requestId)
          .select("id")
          .maybeSingle();

        if (draftUpdateError || !updatedDraft) {
          console.error("written_requests draft update failed", draftUpdateError);
          return NextResponse.json(
            { error: draftUpdateError?.message || "Unable to update draft written request." },
            { status: 500 }
          );
        }

        return NextResponse.json({ requestId: updatedDraft.id, status: "draft" });
      }

      const { data: createdDraft, error: draftCreateError } = await supabase
        .from("written_requests")
        .insert(draftPayload)
        .select("id")
        .single();

      if (draftCreateError || !createdDraft) {
        console.error("written_requests draft insert failed", draftCreateError);
        return NextResponse.json(
          { error: draftCreateError?.message || "Unable to create draft written request." },
          { status: 500 }
        );
      }

      return NextResponse.json({ requestId: createdDraft.id, status: "draft" });
    }

    if (questions.length !== 3) {
      return NextResponse.json(
        { error: "Please provide all 3 questions." },
        { status: 400 }
      );
    }

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

    let persistedGuestEmail = guestEmail || null;
    if (authenticatedUser?.id) {
      const { data: userData } = await supabase.auth.admin.getUserById(authenticatedUser.id);
      persistedGuestEmail = userData.user?.email ?? authenticatedUser.email ?? null;
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      );
    }

    const checkoutPayload = {
      user_id: authenticatedUser?.id ?? null,
      guest_email: persistedGuestEmail,
      question_1: question1,
      question_2: question2,
      question_3: question3,
      status: "awaiting_payment" as const,
      paid: false,
      calculator_snapshot: calculatorSnapshot,
      calculator_results: calculatorResults,
    };

    let writtenRequestId = requestId;

    if (writtenRequestId) {
      const { data: updatedRequest, error: writtenRequestUpdateError } = await supabase
        .from("written_requests")
        .update(checkoutPayload)
        .eq("id", writtenRequestId)
        .select("id")
        .maybeSingle();

      if (writtenRequestUpdateError || !updatedRequest) {
        console.error("written_requests update failed", writtenRequestUpdateError);
        return NextResponse.json(
          { error: writtenRequestUpdateError?.message || "Unable to update written request." },
          { status: 500 }
        );
      }

      writtenRequestId = updatedRequest.id;
    } else {
      const { data: writtenRequest, error: writtenRequestError } = await supabase
        .from("written_requests")
        .insert(checkoutPayload)
        .select("id")
        .single();

      if (writtenRequestError || !writtenRequest) {
        console.error("written_requests insert failed", writtenRequestError);
        return NextResponse.json(
          { error: writtenRequestError?.message || "Unable to create written request." },
          { status: 500 }
        );
      }

      writtenRequestId = writtenRequest.id;
    }

    const baseUrl = getAppBaseUrl(requestOrigin);

    const metadata: Stripe.MetadataParam = {
      written_request_id: String(writtenRequestId),
      user_id: authenticatedUser?.id ?? "null",
      q1: question1,
      q2: question2,
      q3: question3,
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
      success_url: `${baseUrl}/written-breakdown?request_id=${writtenRequestId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/written-breakdown?cancelled=1&request_id=${writtenRequestId}`,
    });

    const { error: writtenRequestUpdateError } = await supabase
      .from("written_requests")
      .update({
        stripe_session_id: session.id,
      })
      .eq("id", writtenRequestId);

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
