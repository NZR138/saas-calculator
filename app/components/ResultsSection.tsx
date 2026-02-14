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
  roas: number | null;
}

export function ResultsSection({
  revenue,
  totalCosts,
  vatAmount,
  profit,
  margin,
  roas,
}: ResultsSectionProps) {
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
        revenue,
        total_costs: totalCosts,
        vat: vatAmount,
        net_profit: profit,
        margin,
        roas,
      };

      const { error } = await supabase.from("snapshots").insert([payload]);

      if (error) {
        setSaveStatus("error");
        setSaveMessage("Unable to save snapshot.");
        return;
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
          {revenue === 0 && (
            <p className="text-sm text-gray-400">Enter values to see results</p>
          )}
        </div>

        <div>
          <ResultItem 
            label="Revenue" 
            value={`£${revenue.toFixed(2)}`} 
            tooltip="Total income from sales (units × price)"
          />
          <ResultItem 
            label="Total Costs" 
            value={`£${totalCosts.toFixed(2)}`} 
            tooltip="Sum of product costs, shipping, fees, and ad spend"
          />
          <ResultItem 
            label="VAT" 
            value={`£${vatAmount.toFixed(2)}`} 
            tooltip="UK VAT at 20% if enabled"
          />
          <ResultItem
            label="Net Profit"
            value={`£${profit.toFixed(2)}`}
            highlight
            negative={profit < 0}
            tooltip="Revenue minus all costs and VAT"
          />
          <ResultItem 
            label="Margin %" 
            value={`${margin.toFixed(1)}%`} 
            tooltip="Profit as percentage of revenue (healthy: 20-40%)"
          />
          <ResultItem
            label="ROAS"
            value={roas !== null ? `${roas.toFixed(2)}x` : "N/A"}
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveSnapshot}
                  disabled={isSaving}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-black hover:bg-gray-800 cursor-pointer"
                  }`}
                >
                  {isSaving ? "Saving..." : "Save Snapshot"}
                </button>
              </div>
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

        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-700">
            How to interpret your results
          </p>
          <div className="mt-2 space-y-2">
            <div>
              <p className="font-medium text-gray-700">Margin guidance</p>
              <p>
                Healthy UK e-commerce margin typically ranges between 20%–40%
                depending on niche and returns.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">ROAS guidance</p>
              <p>
                ROAS above 2.5–3.0 is generally considered sustainable for paid
                traffic.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Hidden costs reminder</p>
              <ul className="mt-1 list-disc pl-4 space-y-1">
                <li>Marketplace/platform fees</li>
                <li>Returns & refunds</li>
                <li>Packaging & inserts</li>
                <li>Customer support time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showSnapshot && (
        <EmailSnapshotModal
          snapshot={{ revenue, profit, margin, roas }}
          onClose={() => setShowSnapshot(false)}
        />
      )}
    </>
  );
}
