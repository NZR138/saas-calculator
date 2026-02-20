"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export default function WrittenBreakdownPage() {
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState(["", "", ""]);
  const [userEmail, setUserEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const syncUser = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();

        if (isMounted) {
          const email = data.user?.email ?? "";
          setUserEmail(email);
          setIsLoggedIn(Boolean(data.user));
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (!isMounted) return;
            const email = session?.user?.email ?? "";
            setUserEmail(email);
            setIsLoggedIn(Boolean(session?.user));
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch {
        if (isMounted) {
          setUserEmail("");
          setIsLoggedIn(false);
        }
      }
    };

    let unsubscribe: (() => void) | undefined;

    syncUser().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const requestId = searchParams.get("request_id") || "";
    const sessionId = searchParams.get("session_id") || "";

    if (!requestId || !sessionId) {
      setIsPaid(false);
      return;
    }

    const syncPaidStatus = async () => {
      try {
        const response = await fetch(
          `/api/stripe/written-request-status?request_id=${encodeURIComponent(requestId)}&session_id=${encodeURIComponent(sessionId)}`
        );

        if (!response.ok) {
          if (isMounted) {
            setIsPaid(false);
          }
          return;
        }

        const result = (await response.json()) as { paid?: boolean };
        if (isMounted) {
          setIsPaid(Boolean(result.paid));
        }
      } catch {
        if (isMounted) {
          setIsPaid(false);
        }
      }
    };

    syncPaidStatus();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const isCancelled = searchParams.get("cancelled") === "1";

  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value.slice(0, 200);
    setQuestions(updated);
  };

  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCheckout = async () => {
    if (!agreedToTerms || isProcessing) return;

    const trimmedQuestions = questions.map((q) => q.trim());
    const hasInvalidQuestions = trimmedQuestions.some(
      (q) => q.length === 0 || q.length > 200
    );

    if (hasInvalidQuestions) {
      setErrorMessage("Please fill all 3 questions (max 200 characters each).");
      return;
    }

    const effectiveEmail = isLoggedIn ? userEmail : guestEmail.trim();
    if (!isEmailValid(effectiveEmail)) {
      setErrorMessage("Please enter a valid email before payment.");
      return;
    }

    setErrorMessage("");
    setIsProcessing(true);

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          guestEmail: isLoggedIn ? undefined : effectiveEmail,
          questions: trimmedQuestions,
        }),
      });

      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        setErrorMessage(result.error || "Unable to start checkout.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setErrorMessage("Unable to start checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        <section className="mb-8">
          <p className="text-gray-700 text-base leading-relaxed">
            This is a written profit & tax breakdown based on the figures you entered in the calculator.
            It is informational and educational only, and not a substitute for professional advice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What you will get</h2>
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

        {!isLoggedIn && (
          <section className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Email
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Required for delivery if you are checking out as a guest.
            </p>
          </section>
        )}

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
        <section className="mb-8">
          <p className="text-lg font-semibold text-gray-900">
            £39 — one-off payment. No subscription.
          </p>
        </section>

        <section className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Important note</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            This is a general, educational breakdown based on the information provided.
            It is not financial or tax advice.
            For personalised advice, please speak to a qualified UK accountant or tax advisor.
          </p>
        </section>

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

        <section className="flex gap-3">
          <button
            onClick={handleCheckout}
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

        {isPaid && (
          <p className="mt-4 text-sm text-green-700">
            Payment was submitted. We&apos;ll confirm and process your written breakdown shortly.
          </p>
        )}
        {isCancelled && !isPaid && (
          <p className="mt-4 text-sm text-gray-600">Payment was cancelled.</p>
        )}
        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}
      </div>
    </div>
  );
}
