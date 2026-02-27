"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { ResultItem } from "./ResultItem";
import LoginModal from "./LoginModal";

interface ResultsSectionProps {
  revenue: number;
  netRevenue: number;
  totalCosts: number;
  vatAmount: number;
  profit: number;
  margin: number;
  roas: number;
  contributionMarginPerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  requiredRevenueForTargetProfit: number;
  requiredUnitsForTargetProfit: number;
  hasNegativeContributionMargin: boolean;
  targetMonthlyProfit: number;
}

type HistoryRow = {
  id: string;
  created_at: string;
  revenue: number | null;
  total_costs: number | null;
  net_profit: number | null;
  margin: number | null;
};

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function ResultsSection({
  revenue,
  netRevenue,
  totalCosts,
  vatAmount,
  profit,
  margin,
  roas,
  contributionMarginPerUnit,
  breakEvenUnits,
  breakEvenRevenue,
  requiredRevenueForTargetProfit,
  requiredUnitsForTargetProfit,
  hasNegativeContributionMargin,
  targetMonthlyProfit,
}: ResultsSectionProps) {
  const safeRevenue = toSafeNumber(revenue);
  const safeNetRevenue = toSafeNumber(netRevenue);
  const safeTotalCosts = toSafeNumber(totalCosts);
  const safeVatAmount = toSafeNumber(vatAmount);
  const safeProfit = toSafeNumber(profit);
  const safeMargin = toSafeNumber(margin);
  const safeRoas = toSafeNumber(roas);
  const safeContributionMarginPerUnit = toSafeNumber(contributionMarginPerUnit);
  const safeBreakEvenUnits = toSafeNumber(breakEvenUnits);
  const safeBreakEvenRevenue = toSafeNumber(breakEvenRevenue);
  const safeRequiredRevenueForTargetProfit = toSafeNumber(requiredRevenueForTargetProfit);
  const safeRequiredUnitsForTargetProfit = toSafeNumber(requiredUnitsForTargetProfit);
  const safeTargetMonthlyProfit = toSafeNumber(targetMonthlyProfit);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [voted, setVoted] = useState(false);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

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

  useEffect(() => {
    const loadHistory = async () => {
      if (!isLoggedIn) {
        setHistoryRows([]);
        return;
      }

      setIsHistoryLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("snapshots")
          .select("id, created_at, revenue, total_costs, net_profit, margin")
          .order("created_at", { ascending: false })
          .limit(7);

        setHistoryRows((data ?? []) as HistoryRow[]);
      } catch {
        setHistoryRows([]);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadHistory();
  }, [isLoggedIn]);

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

  const openAuthModal = (mode: "signin" | "signup" = "signin") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
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
          {isLoggedIn ? (
            <>
              <ResultItem
                label="Net Revenue"
                value={`£${safeNetRevenue.toFixed(2)}`}
                tooltip="Revenue after refund-rate adjustment"
              />
              <ResultItem
                label="Contribution Margin / Unit"
                value={`£${safeContributionMarginPerUnit.toFixed(2)}`}
                tooltip="Selling price minus product, shipping and processing cost per unit"
              />
              <ResultItem
                label="Break-even Units"
                value={safeBreakEvenUnits.toFixed(2)}
                tooltip="Fixed costs divided by contribution margin per unit"
              />
              <ResultItem
                label="Break-even Revenue"
                value={`£${safeBreakEvenRevenue.toFixed(2)}`}
                tooltip="Break-even units multiplied by selling price"
              />
              {safeTargetMonthlyProfit > 0 && (
                <>
                  <ResultItem
                    label="Required Revenue (Target Profit)"
                    value={`£${safeRequiredRevenueForTargetProfit.toFixed(2)}`}
                    tooltip="Revenue needed to cover fixed costs and your target monthly profit"
                  />
                  <ResultItem
                    label="Required Units (Target Profit)"
                    value={safeRequiredUnitsForTargetProfit.toFixed(2)}
                    tooltip="Units required to reach your target monthly profit"
                  />
                </>
              )}
              {hasNegativeContributionMargin && (
                <p className="mt-2 text-xs font-medium text-red-600">Negative contribution margin</p>
              )}
            </>
          ) : (
            <div className="space-y-2 pt-1">
              {[
                "Net Revenue",
                "Contribution Margin / Unit",
                "Break-even Units",
                "Break-even Revenue",
                "Required Revenue (Target Profit)",
                "Required Units (Target Profit)",
              ].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => openAuthModal("signin")}
                  className="w-full flex items-center justify-between py-2 border-b border-gray-100 text-left hover:bg-gray-50"
                  title="Log in to unlock"
                >
                  <span className="text-sm text-gray-500">{label} · Log in to unlock</span>
                  <span className="text-gray-400">—</span>
                </button>
              ))}
            </div>
          )}
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
              <p className="text-xs font-medium text-gray-700">Calculation history</p>
              {isHistoryLoading ? (
                <p className="text-xs text-gray-500">Loading history...</p>
              ) : historyRows.length === 0 ? (
                <p className="text-xs text-gray-500">No saved calculations yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700">Revenue</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700">Profit</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-700">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-2 py-2 text-gray-700">
                            {dateFormatter.format(new Date(row.created_at))}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-900">
                            {currencyFormatter.format(toSafeNumber(row.revenue))}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-900">
                            {currencyFormatter.format(toSafeNumber(row.net_profit))}
                          </td>
                          <td className="px-2 py-2 text-right text-gray-900">
                            {toSafeNumber(row.margin).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-700">Sign in to save and view your calculation history</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal("signin")}
                  className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("signup")}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <LoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialIsSignup={authMode === "signup"}
      />
    </>
  );
}
