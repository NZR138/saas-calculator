"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import EmailSnapshotModal from "./EmailSnapshotModal";
import { ResultItem } from "./ResultItem";

interface ResultsSectionProps {
  revenue: number;
  totalCosts: number;
  vatAmount: number;
  profit: number;
  margin: number;
  roas: number;
}

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function ResultsSection({
  revenue,
  totalCosts,
  vatAmount,
  profit,
  margin,
  roas,
}: ResultsSectionProps) {
  const safeRevenue = toSafeNumber(revenue);
  const safeTotalCosts = toSafeNumber(totalCosts);
  const safeVatAmount = toSafeNumber(vatAmount);
  const safeProfit = toSafeNumber(profit);
  const safeMargin = toSafeNumber(margin);
  const safeRoas = toSafeNumber(roas);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    try {
      const existing = localStorage.getItem("feedback_voted");
      if (existing) {
        setVoted(true);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Check if user is logged in when component mounts or auth changes
  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = getSupabaseClient();

      const syncUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (isMounted) {
          setIsLoggedIn(Boolean(data.user));
        }
      };

      syncUser();

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (isMounted) {
            setIsLoggedIn(Boolean(session?.user));
          }
        }
      );

      return () => {
        isMounted = false;
        authListener?.subscription.unsubscribe();
      };
    } catch {
      // Supabase not configured, no auth
      if (isMounted) {
        setIsLoggedIn(false);
      }
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const handleVote = (dir: "up" | "down") => {
    if (voted) return;
    try {
      localStorage.setItem("feedback_voted", dir === "up" ? "up" : "down");
      localStorage.setItem("feedback_voted_at", new Date().toISOString());
      setVoted(true);
    } catch {
      // ignore localStorage errors
    }

    if (dir === "up") {
      window.plausible?.("feedback_yes");
    } else {
      window.plausible?.("feedback_no");
    }
  };

  const handleSaveSnapshot = async () => {
    if (isSaving) return;
    setSaveMessage("");
    setSaveStatus("");
    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setSaveStatus("error");
        setSaveMessage("You must be logged in to save.");
        setIsSaving(false);
        return;
      }

      const payload = {
        user_id: user.id,
        revenue: safeRevenue,
        total_costs: safeTotalCosts,
        vat: safeVatAmount,
        net_profit: safeProfit,
        margin: safeMargin,
        roas: safeRoas,
      };

      const numericPayloadValues = [
        payload.revenue,
        payload.total_costs,
        payload.vat,
        payload.net_profit,
        payload.margin,
        payload.roas,
      ];

      if (numericPayloadValues.some((value) => !Number.isFinite(value))) {
        console.error("Snapshot payload contains invalid numeric values", payload);
        setSaveStatus("error");
        setSaveMessage("Unable to save snapshot.");
        return;
      }

      const { error } = await supabase.from("snapshots").insert([payload]);

      if (error) {
        setSaveStatus("error");
        setSaveMessage("Unable to save snapshot.");
        return;
      }

      const { data: oldSnapshots } = await supabase
        .from("snapshots")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(7, 1000);

      const oldIds = (oldSnapshots ?? [])
        .map((snapshot) => snapshot.id)
        .filter((id): id is string => typeof id === "string");

      if (oldIds.length > 0) {
        await supabase.from("snapshots").delete().in("id", oldIds);
      }

      setSaveStatus("success");
      setSaveMessage("Snapshot saved");
    } catch {
      setSaveStatus("error");
      setSaveMessage("Unable to save snapshot");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Your Results
          </h2>
          {safeRevenue === 0 && (
            <p className="text-sm text-gray-400">Enter values to see results</p>
          )}
        </div>

        <div>
          <ResultItem 
            label="Revenue" 
            value={`£${safeRevenue.toFixed(2)}`} 
            tooltip="Total income from sales (units × price)"
          />
          <ResultItem 
            label="Total Costs" 
            value={`£${safeTotalCosts.toFixed(2)}`} 
            tooltip="Sum of product costs, shipping, fees, and ad spend"
          />
          <ResultItem 
            label="VAT" 
            value={`£${safeVatAmount.toFixed(2)}`} 
            tooltip="UK VAT at 20% if enabled"
          />
          <ResultItem
            label="Net Profit"
            value={`£${safeProfit.toFixed(2)}`}
            highlight
            negative={safeProfit < 0}
            tooltip="Revenue minus all costs and VAT"
          />
          <ResultItem 
            label="Margin %" 
            value={`${safeMargin.toFixed(2)}%`} 
            tooltip="Profit as percentage of revenue (healthy: 20-40%)"
          />
          <ResultItem
            label="ROAS"
            value={`${safeRoas.toFixed(2)}x`}
            tooltip="Return on Ad Spend - revenue per £1 spent on ads (target: >2.5)"
          />
        </div>

        <div className="border-t border-gray-100 pt-4 text-sm">
          <p className="text-gray-600">Was this calculator helpful?</p>
          <div className="mt-2 flex gap-3 items-center">
            <button
              aria-label="Helpful"
              disabled={voted}
              onClick={() => handleVote("up")}
              className={`text-lg transition ${
                voted
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-gray-900 cursor-pointer"
              }`}
            >
              <span className="leading-none">👍</span>
            </button>
            <button
              aria-label="Not helpful"
              disabled={voted}
              onClick={() => handleVote("down")}
              className={`text-lg transition ${
                voted
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-gray-900 cursor-pointer"
              }`}
            >
              <span className="leading-none">👎</span>
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          {isLoggedIn ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Last 7 calculations are stored</p>
              {saveMessage && (
                <p
                  className={`text-xs ${
                    saveStatus === "success" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {saveMessage}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Log in to save your results.</p>
          )}
        </div>

      </div>

      {showSnapshot && (
        <EmailSnapshotModal
          snapshot={{ revenue: safeRevenue, profit: safeProfit, margin: safeMargin, roas: safeRoas }}
          onClose={() => setShowSnapshot(false)}
        />
      )}
    </>
  );
}
