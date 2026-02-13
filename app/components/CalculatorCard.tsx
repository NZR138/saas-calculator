"use client";

import { useState, useEffect, useRef } from "react";
import ToggleVat from "./ToggleVat";
import EmailSnapshotModal from "./EmailSnapshotModal";
import Tooltip from "./Tooltip";
import { useCalculator } from "../hooks/useCalculator";

export default function CalculatorCard() {
  const {
    values,
    revenue,
    totalCosts,
    vatAmount,
    profit,
    margin,
    roas,
    setValue,
    reset,
  } = useCalculator();

  const [showSnapshot, setShowSnapshot] = useState(false);
  const canShowSnapshot = revenue > 0;

  const [shippingCost, setShippingCost] = useState(0);
  const [processingFee, setProcessingFee] = useState(0);

  // Feedback protection: one vote per browser session
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

  const handleVote = (dir: "up" | "down") => {
    if (voted) return;
    try {
      localStorage.setItem("feedback_voted", dir === "up" ? "up" : "down");
      localStorage.setItem("feedback_voted_at", new Date().toISOString());
      setVoted(true);
    } catch {
      // ignore localStorage errors
    }

    // fire analytics after state/storage to avoid double submissions
    if (dir === "up") {
      window.plausible?.("feedback_yes");
    } else {
      window.plausible?.("feedback_no");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* ================= LEFT COLUMN ================= */}
      <div className="space-y-4 max-w-[680px]">
        <p className="text-sm text-gray-500">
          Calculate your real profit after VAT, ads, shipping and product costs.
        </p>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Input details
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition"
            >
              Reset
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Revenue
            </p>
            <NumberInput
              label="Product Price"
              tooltip="Average price per unit"
              value={values.price}
              onChange={(v: number) => setValue("price", v)}
              prefix="£"
            />
            <NumberInput
              label="Units Sold"
              tooltip="Total monthly units sold"
              value={values.users}
              onChange={(v: number) => setValue("users", v)}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Costs
            </p>
            <NumberInput
              label="Product Cost"
              tooltip="Total product cost for the month"
              value={values.fixedCosts}
              onChange={(v: number) => setValue("fixedCosts", v)}
              prefix="£"
            />
            <NumberInput
              label="Shipping Cost"
              tooltip="Monthly shipping and fulfillment cost"
              value={shippingCost}
              onChange={(v: number) => setShippingCost(v)}
              prefix="£"
            />
            <NumberInput
              label="Payment Processing %"
              tooltip="Average processing rate"
              value={processingFee}
              onChange={(v: number) => setProcessingFee(v)}
            />
            <ToggleVat
              value={values.vatIncluded}
              onChange={(v) => setValue("vatIncluded", v)}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Marketing
            </p>
            <NumberInput
              label="Ad Spend"
              tooltip="Monthly paid marketing spend"
              value={values.adSpend}
              onChange={(v: number) => setValue("adSpend", v)}
              prefix="£"
            />
          </div>

          <button
            disabled={!canShowSnapshot}
            onClick={() => canShowSnapshot && setShowSnapshot(true)}
            className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition ${
              canShowSnapshot
                ? "bg-black hover:bg-gray-800 hover:shadow-md active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Calculate Profit
          </button>

          <p className="text-xs text-gray-400">
            Results are estimates. Real profit can vary with fees, returns, and
            operational overhead.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Common hidden costs</p>
          <ul className="mt-2 list-disc pl-4 space-y-1 text-gray-700">
            <li>Marketplace and platform fees</li>
            <li>Packaging and insert materials</li>
            <li>Returns, refunds, and chargebacks</li>
            <li>Storage and fulfillment handling</li>
            <li>Customer support time</li>
          </ul>
        </div>
      </div>

      {/* ================= RIGHT COLUMN ================= */}
      <div className="self-start sticky top-4 max-w-[520px] w-full md:justify-self-end">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Results</h2>
            {revenue === 0 && (
              <p className="text-sm text-gray-400">Enter values to see results</p>
            )}
          </div>

          <div>
            <Result label="Revenue" value={`£${revenue.toFixed(2)}`} />
            <Result label="Total Costs" value={`£${totalCosts.toFixed(2)}`} />
            <Result label="VAT" value={`£${vatAmount.toFixed(2)}`} />
            <Result
              label="Net Profit"
              value={`£${profit.toFixed(2)}`}
              highlight
              negative={profit < 0}
            />
            <Result label="Margin %" value={`${margin.toFixed(1)}%`} />
            <Result
              label="ROAS"
              value={roas !== null ? `${roas.toFixed(2)}x` : "N/A"}
            />
          </div>

          <div className="border-t border-gray-100 pt-4 text-sm">
            <p className="text-gray-600">Was this calculator helpful?</p>
            <div className="mt-2 flex gap-3 items-center">
              <button
                aria-label="Helpful"
                disabled={voted}
                onClick={() => handleVote("up")}
                className={`text-lg transition ${voted ? "opacity-50 cursor-not-allowed" : "hover:text-gray-900 cursor-pointer"}`}
              >
                <span className="leading-none">👍</span>
              </button>
              <button
                aria-label="Not helpful"
                disabled={voted}
                onClick={() => handleVote("down")}
                className={`text-lg transition ${voted ? "opacity-50 cursor-not-allowed" : "hover:text-gray-900 cursor-pointer"}`}
              >
                <span className="leading-none">👎</span>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-700">How to interpret your results</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="font-medium text-gray-700">Margin guidance</p>
                <p>
                  Healthy UK e-commerce margin typically ranges between 20%–40% depending on niche and returns.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">ROAS guidance</p>
                <p>
                  ROAS above 2.5–3.0 is generally considered sustainable for paid traffic.
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
      </div>

      {showSnapshot && (
        <EmailSnapshotModal
          snapshot={{ revenue, profit, margin, roas }}
          onClose={() => setShowSnapshot(false)}
        />
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function NumberInput({
  label,
  tooltip,
  value,
  onChange,
  prefix,
}: {
  label: string;
  tooltip?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  const [text, setText] = useState(String(value));
  const [hasEdited, setHasEdited] = useState(false);
  const isEditingRef = useRef<boolean>(false);

  // Sync value -> text when not editing
  useEffect(() => {
    if (!isEditingRef.current) {
      setText(String(value));
    }
  }, [value]);

  // Normalize: keep only digits, remove leading zeros
  const normalizeDigits = (raw: string): string => {
    const digitsOnly = raw.replace(/[^\d]/g, "");
    // Remove leading zeros only if there are more digits after them
    const trimmed = digitsOnly.replace(/^0+(?=\d)/, "");
    return trimmed;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeDigits(e.target.value);
    setText(normalized === "" ? "" : normalized);
    setHasEdited(true);

    // Update parent with numeric value
    const nextNumber = normalized === "" ? 0 : Number(normalized);
    onChange(nextNumber);
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    // Normalize on blur and ensure valid number
    const normalized = normalizeDigits(text);
    const nextNumber = normalized === "" ? 0 : Number(normalized);
    setText(String(nextNumber));
    onChange(nextNumber);
  };

  const handleFocus = () => {
    isEditingRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block invalid characters
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Show empty state placeholder until user edits
  const displayValue = !hasEdited && value === 0 ? "" : text;

  return (
    <div>
      <div className="flex items-center gap-1 text-sm text-gray-700">
        <span>{label}</span>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={`mt-0.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-300 ${
            prefix ? "pl-8" : ""
          }`}
        />
      </div>
    </div>
  );
}

function Result({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  const isEmptyState = value === "£0.00" || value === "0.0%" || value === "N/A";
  const baseValueClass = isEmptyState ? "text-gray-400" : "text-gray-900";
  const highlightClass = negative
    ? "bg-red-50 text-red-600"
    : "bg-green-50 text-green-700";
  const valueClass = highlight
    ? `${highlightClass} font-bold rounded-lg px-3 py-2 transition-colors`
    : baseValueClass;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 transition-colors hover:bg-gray-50">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}