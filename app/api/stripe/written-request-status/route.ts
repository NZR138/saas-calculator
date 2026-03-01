import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/app/lib/serverSupabase";
import { checkRateLimit } from "@/app/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const rateLimitResult = checkRateLimit(request, {
      keyPrefix: "written-request-status",
      limit: 60,
      windowMs: 60_000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { paid: false, status: "awaiting_payment" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
          },
        }
      );
    }

    const url = new URL(request.url);
    const requestId = url.searchParams.get("request_id")?.trim();
    const sessionId = url.searchParams.get("session_id")?.trim();

    if (!requestId || !sessionId) {
      return NextResponse.json({ paid: false, status: "awaiting_payment" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("written_requests")
      .select("paid, status")
      .eq("id", requestId)
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch written request status", error);
      return NextResponse.json(
        { paid: false, status: "awaiting_payment" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ paid: false, status: "awaiting_payment" });
    }

    return NextResponse.json({ paid: Boolean(data.paid), status: data.status ?? "awaiting_payment" });
  } catch (error) {
    console.error("Written request status lookup failed", error);
    return NextResponse.json({ paid: false, status: "awaiting_payment" }, { status: 500 });
  }
}
