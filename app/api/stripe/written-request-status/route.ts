import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/app/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
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
