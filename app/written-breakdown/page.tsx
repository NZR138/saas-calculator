"use client";

import { useState, useEffect } from "react";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_dRm4gr0Ua8qz6F5ekKaR200";

export default function WrittenBreakdownPage() {
  const [questions, setQuestions] = useState(["", "", ""]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value.slice(0, 200);
    setQuestions(updated);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-6 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            Written Profit & Tax Breakdown
          </h1>
          <p className="mt-2 text-gray-600">
            A general, educational review of your numbers — not tax advice.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        {/* Intro */}
        <section className="mb-8">
          <p className="text-gray-700 text-base leading-relaxed">
            This is a written profit & tax breakdown based on the figures you entered in the calculator.
            It is informational and educational only, and not a substitute for professional advice.
          </p>
        </section>

        {/* What you'll get */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What you'll get</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-lg text-black mt-0">•</span>
              <span>A written review of your profit position</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg text-black mt-0">•</span>
              <span>UK-specific tax notes (VAT, Corporation Tax, NI where relevant)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg text-black mt-0">•</span>
              <span>Potential risks or overlooked costs</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg text-black mt-0">•</span>
              <span>Practical, general next steps based on your numbers</span>
            </li>
          </ul>
        </section>

        {/* Your Questions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your questions</h2>
          <p className="text-gray-600 text-sm mb-4">
            You can ask up to 3 questions. Each question can be up to 200 characters.
            Short, specific questions work best.
          </p>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx}>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Question {idx + 1}
                </label>
                <textarea
                  value={q}
                  onChange={(e) => handleQuestionChange(idx, e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder={`Ask your question here... (${q.length} / 200)`}
                />
                <p className="text-xs text-gray-500 mt-1">{q.length} / 200</p>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-lg text-black mt-0">•</span>
              <span>Written response by email</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg text-black mt-0">•</span>
              <span>Typically within 24–48 hours</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg text-black mt-0">•</span>
              <span>No calls included</span>
            </li>
          </ul>
        </section>

        

        {/* Price */}
        <section className="mb-8">
          <p className="text-lg font-semibold text-gray-900">
            £39 — one-off payment. No subscription.
          </p>
        </section>

        {/* Legal Disclaimer */}
        <section className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Important note</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            This is a general, educational breakdown based on the information provided.
            It is not financial or tax advice.
            For personalised advice, please speak to a qualified UK accountant or tax advisor.
          </p>
        </section>

        {/* Terms Checkbox */}
        <section className="mb-8">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              I understand this is an educational breakdown and not financial or tax advice.
            </span>
          </label>
        </section>

        {/* CTA Buttons */}
        <section className="flex gap-3">
          <button
            onClick={async () => {
              // Create a draft request in Supabase, store request_id, then redirect to Stripe
              if (!agreedToTerms || isProcessing) return;
              setIsProcessing(true);

              // Build payload from questions — email may be captured elsewhere (Stripe),
              // attempt to read from sessionStorage if available. Keep empty string if not.
              const email = (typeof window !== "undefined" && sessionStorage.getItem("written_request_email")) || "";

              const payload = {
                email,
                question_1: questions[0] || null,
                question_2: questions[1] || null,
                question_3: questions[2] || null,
                status: "draft",
                created_at: new Date().toISOString(),
              };

              try {
                // TODO: Replace with real Supabase client. Placeholder below.
                const supabase = createSupabaseClient();

                // TODO: Insert into `written_requests` table. This is a placeholder call.
                const insertRes = await supabase.from("written_requests").insert(payload);

                // Try to read returned id; if not available, fallback to timestamp-based id
                const requestId = insertRes?.data?.[0]?.id || `req_${Date.now()}`;

                // Persist in sessionStorage for later (post-payment update)
                try {
                  sessionStorage.setItem("written_request_id", String(requestId));
                } catch (e) {
                  // ignore sessionStorage errors
                }

                // Append request_id to Stripe payment link and open in new tab
                const url = `${STRIPE_PAYMENT_LINK}${STRIPE_PAYMENT_LINK.includes("?") ? "&" : "?"}request_id=${encodeURIComponent(String(requestId))}`;
                window.open(url, "_blank", "noopener,noreferrer");
              } catch (e) {
                // swallow errors for now — TODO: add user-visible error handling if required
                console.error("Failed to create draft request", e);
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={!agreedToTerms}
            className={`flex-1 rounded-md px-4 py-3 font-medium text-white transition ${
              agreedToTerms
                ? "bg-black hover:bg-gray-900 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {isProcessing ? "Processing…" : "Get my written breakdown (£39)"}
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex-1 rounded-md px-4 py-3 font-medium text-gray-900 hover:bg-gray-50 transition"
          >
            Maybe later
          </button>
        </section>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Placeholder Supabase client and post-payment updater (logic-only)     */
/* ====================================================================== */

// Placeholder factory — replace with real Supabase client initialization.
// TODO: Replace this with an actual `createSupabaseClient()` implementation.
function createSupabaseClient() {
  return {
    from: (table: string) => ({
      // NOTE: These methods are placeholders returning a shape similar to
      // Supabase client responses. Replace with real calls in production.
      insert: async (payload: any) => {
        // TODO: call supabase.from(table).insert(payload).select()
        // Simulate a response structure: { data: [{ id: 'generated-id', ... }] }
        return new Promise<{ data: any[] }>((resolve) => {
          const fakeId = `req_${Date.now()}`;
          resolve({ data: [{ id: fakeId, ...payload }] });
        });
      },
      update: async (payload: any) => {
        // TODO: call supabase.from(table).update(payload).match({ id: requestId })
        return new Promise<{ data: any[] }>((resolve) => {
          resolve({ data: [payload] });
        });
      },
    }),
  };
}

// On return from Stripe (client-side), attempt to mark the request as paid.
// This reads `request_id` from the URL query or sessionStorage, then performs
// a placeholder update against the `written_requests` table.
// TODO: Replace placeholder update with real Supabase update call.
if (typeof window !== "undefined") {
  try {
    const params = new URLSearchParams(window.location.search);
    const returnedRequestId = params.get("request_id") || sessionStorage.getItem("written_request_id");

    if (returnedRequestId) {
      // Simple guard: only attempt update once per session
      const alreadyUpdated = sessionStorage.getItem("written_request_paid") === "true";
      if (!alreadyUpdated) {
        (async () => {
          try {
            const supabase = createSupabaseClient();

            // Prepare update payload
            const updatePayload = {
              status: "paid",
              paid_at: new Date().toISOString(),
              // Placeholder value for Stripe session id — replace when available
              stripe_session_id: "placeholder_stripe_session",
            };

            // TODO: Replace with actual Supabase `update(...).match({ id: returnedRequestId })` call
            await supabase.from("written_requests").update(updatePayload);

            // Mark as updated in session to avoid duplicate calls
            try {
              sessionStorage.setItem("written_request_paid", "true");
            } catch (e) {
              // ignore
            }
          } catch (e) {
            // swallow errors — in production, consider retry/backoff or server-side webhook
            console.error("Failed to mark written request as paid", e);
          }
        })();
      }
    }
  } catch (e) {
    // ignore URL parsing/sessionStorage errors
  }
}
