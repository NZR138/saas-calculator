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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

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
      if (isMounted) {
        setIsLoggedIn(false);
      }
      return () => {
        isMounted = false;
      };
    }
  }, []);

  const openAuthModal = (mode: "signin" | "signup" = "signin") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Results</h2>
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
                <div
                  key={label}
                  className="w-full flex items-center justify-between py-2 border-b border-gray-100"
                >
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-gray-400">—</span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Log in to unlock advanced metrics
              </button>
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
