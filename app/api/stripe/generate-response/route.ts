import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type GenerateResponseBody = {
  request_id?: string;
  test_mode?: boolean;
};

type WrittenRequestRecord = {
  id: string;
  status: string | null;
  paid: boolean;
  ai_sent_at: string | null;
  ai_response: string | null;
  user_id: string | null;
  guest_email: string | null;
  question_1: string | null;
  question_2: string | null;
  question_3: string | null;
  calculator_snapshot: Record<string, unknown> | null;
  calculator_results: Record<string, unknown> | null;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim();

function safeQuestion(value: string | null | undefined) {
  const trimmedValue = (value ?? "").trim();
  return trimmedValue.length > 0 ? trimmedValue : "—";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownToHtml(markdown: string) {
  return escapeHtml(markdown)
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\r?\n/g, "<br/>");
}

function buildPrompt(record: WrittenRequestRecord) {
  const payload = {
    question_1: record.question_1,
    question_2: record.question_2,
    question_3: record.question_3,
    calculator_data: {
      snapshot: record.calculator_snapshot,
      results: record.calculator_results,
    },
  };

  return [
    "You are a UK e-commerce financial analysis assistant.",
    "Produce a clear written scenario analysis in plain English.",
    "Do not claim to provide regulated financial or tax advice.",
    "Use concise sections and practical next steps.",
    "",
    "User input JSON:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

async function generateAiResponse(record: WrittenRequestRecord) {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (!openAiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const prompt = buildPrompt(record);

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You provide educational UK e-commerce financial scenario breakdowns. Keep outputs practical, structured, and concise.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorBody.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = json.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI response content is empty");
  }

  return content;
}

async function resolveRecipientEmail(record: WrittenRequestRecord) {
  if (record.guest_email?.trim()) {
    return record.guest_email.trim();
  }

  if (!record.user_id) {
    return null;
  }

  const { data: userData } = await supabase.auth.admin.getUserById(record.user_id);
  const userEmail = userData.user?.email?.trim();

  return userEmail || null;
}

async function sendCustomerEmail(recipientEmail: string, requestId: string, aiResponse: string) {
  if (!FROM_EMAIL) {
    throw new Error("Missing RESEND_FROM_EMAIL");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const escapedRequestId = escapeHtml(requestId);
  const formattedAiResponseHtml = markdownToHtml(aiResponse);
  const renderedAt = new Date().toISOString();

  const sendResult = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    replyTo: FROM_EMAIL,
    subject: "Your Written Financial Scenario Analysis",
    html: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f7fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
                  <div style="font-size:20px;line-height:28px;font-weight:700;color:#111827;">Your Written Financial Scenario Analysis</div>
                  <div style="margin-top:10px;display:inline-block;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;">DELIVERED</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:12px;color:#6b7280;padding-bottom:6px;">Request ID</div>
                  <div style="font-size:14px;color:#111827;font-weight:600;padding-bottom:16px;word-break:break-all;">${escapedRequestId}</div>
                  <div style="font-size:14px;color:#111827;font-weight:700;padding-bottom:10px;">AI Response</div>
                  <div style="font-size:14px;line-height:22px;color:#111827;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">${formattedAiResponseHtml}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#fafafa;font-size:12px;line-height:18px;color:#6b7280;">
                  This tool does not constitute financial or tax advice.<br/>
                  Generated at: ${renderedAt}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
    text: [
      "Your Written Financial Scenario Analysis",
      "",
      `request_id: ${requestId}`,
      "",
      aiResponse,
      "",
      "This tool does not constitute financial or tax advice.",
      `Generated at: ${renderedAt}`,
    ].join("\n"),
  });

  if (sendResult.error) {
    throw new Error(sendResult.error.message || "Resend failed to deliver email");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateResponseBody;
    const requestId = body.request_id?.trim();
    const isLocalTestBypass = body.test_mode === true && process.env.NODE_ENV !== "production";

    if (!requestId) {
      return NextResponse.json({ error: "request_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("written_requests")
      .select(
        "id, status, paid, ai_sent_at, ai_response, user_id, guest_email, question_1, question_2, question_3, calculator_snapshot, calculator_results"
      )
      .eq("id", requestId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "request not found" }, { status: 404 });
    }

    const record = data as WrittenRequestRecord;
    const isFreeRequest = record.status === "free";

    if (!record.paid && !isFreeRequest && !isLocalTestBypass) {
      return NextResponse.json({ ok: true, ignored: "not_paid" });
    }

    if (record.ai_sent_at) {
      return NextResponse.json({ ok: true, ignored: "already_sent" });
    }

    const aiResponse = await generateAiResponse(record);

    let updateQuery = supabase
      .from("written_requests")
      .update({
        ai_response: aiResponse,
        ai_sent_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .is("ai_sent_at", null);

    if (!isLocalTestBypass) {
      if (isFreeRequest) {
        updateQuery = updateQuery.eq("status", "free").eq("paid", false);
      } else {
        updateQuery = updateQuery.eq("paid", true);
      }
    }

    const { data: updatedRecord, error: updateError } = await updateQuery
      .select("id, status, paid, ai_sent_at, ai_response, user_id, guest_email, question_1, question_2, question_3, calculator_snapshot, calculator_results")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRecord) {
      return NextResponse.json({ ok: true, ignored: "already_claimed" });
    }

    const recipientEmail = await resolveRecipientEmail(updatedRecord as WrittenRequestRecord);

    if (!recipientEmail) {
      return NextResponse.json({ ok: true, ignored: "no_recipient_email" });
    }

    try {
      await sendCustomerEmail(recipientEmail, requestId, aiResponse);
    } catch (emailError) {
      await supabase
        .from("written_requests")
        .update({ ai_sent_at: null })
        .eq("id", requestId)
        .eq("ai_response", aiResponse);

      throw emailError;
    }

    return NextResponse.json({ ok: true, request_id: requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
