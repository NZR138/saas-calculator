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
  // layout mode: false = FULL (default), true = COMPACT
  const [compact, setCompact] = useState(false);
  const canShowSnapshot = revenue > 0;

  // Feedback protection: one vote per browser session
  const [voted, setVoted] = useState(false);
  const [votedValue, setVotedValue] = useState<string | null>(null);

  useEffect(() => {
    try {
      const existing = localStorage.getItem("feedback_voted");
      if (existing) {
        setVoted(true);
        setVotedValue(existing);
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }, []);

  const handleVote = (dir: "up" | "down") => {
    if (voted) return;
    try {
      localStorage.setItem("feedback_voted", dir === "up" ? "up" : "down");
      localStorage.setItem("feedback_voted_at", new Date().toISOString());
      setVoted(true);
      setVotedValue(dir === "up" ? "up" : "down");
    } catch (e) {
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
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg ${!compact ? "max-w-4xl px-8 py-8" : "max-w-md px-3 py-3"}`}>
      {/* ================= LEFT COLUMN ================= */}
      <div>
        {/* TOP CONTROLS */}
        <div className="flex items-center justify-between mb-2">
          <h1 className={`font-semibold text-gray-900 ${!compact ? "text-3xl" : "text-base"}`}>
            UK Profit Calculator
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className={`cursor-pointer rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition ${
                !compact ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"
              }`}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setCompact((s) => !s)}
              aria-expanded={!compact}
              className={`cursor-pointer rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition ${
                !compact ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"
              }`}
            >
              {compact ? "Full view" : "Compact view"}
            </button>
          </div>
        </div>

        <p className={`text-gray-500 ${!compact ? "text-base mb-6" : "text-xs mb-2"}`}>
          Real monthly profit after VAT & costs.
        </p>

        {/* inputs remain visible in both modes; compact only changes container width */}
        <div className={!compact ? "space-y-3" : "space-y-1"}>
          <NumberInput
            label="Paying users"
            tooltip="Number of active paying customers"
            value={values.users}
            onChange={(v: number) => setValue("users", v)}
            compact={compact}
          />
          <NumberInput
            label="Price per user (£)"
            tooltip="Average monthly price per user"
            value={values.price}
            onChange={(v: number) => setValue("price", v)}
            compact={compact}
          />
          <NumberInput
            label="Monthly fixed costs (£)"
            tooltip="Rent, salaries, accountant, software, etc."
            value={values.fixedCosts}
            onChange={(v: number) => setValue("fixedCosts", v)}
            compact={compact}
          />
          <NumberInput
            label="Ad spend (£)"
            tooltip="Monthly marketing and advertising spend"
            value={values.adSpend}
            onChange={(v: number) => setValue("adSpend", v)}
            compact={compact}
          />
        </div>

        <div className={!compact ? "mt-6" : "mt-1"}>
          <ToggleVat
            value={values.vatIncluded}
            onChange={(v) => setValue("vatIncluded", v)}
          />
        </div>

        <p className={`${!compact ? "mt-6 text-sm" : "mt-1 text-xs"} text-gray-400`}>
          This calculator shows the basics. Real UK profits often depend on
          taxes, structure and hidden fixed costs.
        </p>

        <button
          disabled={!canShowSnapshot}
          onClick={() => canShowSnapshot && setShowSnapshot(true)}
          className={`w-full rounded-md text-white transition ${!compact ? "mt-6 px-4 py-2 text-base" : "mt-1 px-2 py-1 text-xs"} ${
            canShowSnapshot
              ? "bg-black hover:bg-gray-900 cursor-pointer"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          See what stands out in these numbers
        </button>

        {/* INSIGHTS — LEFT (FULL view only) */}
        {!compact && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-medium text-gray-900">
            ⚠️ What these numbers usually hide
          </p>

          <ul className="mt-1 list-disc pl-4 space-y-0 text-gray-700">
            <li>Corporation Tax (19%)</li>
            <li>Employer’s National Insurance (13.8%)</li>
            <li>Accountant fees (£150–300 / month)</li>
            <li>Payment processing fees (1.4–2.9%)</li>
            <li>Software & tools (£50–200 / month)</li>
          </ul>

          <p className="mt-1">
            👉 In many UK businesses, real take-home profit is{" "}
            <strong>25–45% lower</strong> than expected.
          </p>

          <p className="mt-1 italic text-gray-500">
            This is not advice. This is context.
          </p>
        </div>
        )}
      </div>

      {/* ================= RIGHT COLUMN ================= */}
      <div className={`self-start sticky top-4 ${!compact ? "space-y-4" : "space-y-1"}`}>
        {revenue === 0 && (
          <p className={`${!compact ? "text-sm" : "text-xs"} text-gray-400 ${!compact ? "mb-3" : "mb-1"}`}>Enter values above to see results</p>
        )}
        <Result
          label="Revenue"
          tooltip="Users × price"
          value={`£${revenue.toFixed(2)}`}
          compact={compact}
        />
        <Result
          label="Total costs"
          tooltip="Fixed costs + ads + VAT (if included)"
          value={`£${totalCosts.toFixed(2)}`}
          compact={compact}
        />
        <Result
          label="VAT amount"
          tooltip="20% VAT if VAT is included"
          value={`£${vatAmount.toFixed(2)}`}
          compact={compact}
        />
        <Result
          label="Profit"
          tooltip="Revenue minus total costs"
          value={`£${profit.toFixed(2)}`}
          highlight
          compact={compact}
        />
        <Result
          label="Margin"
          tooltip="Profit ÷ revenue"
          value={`${margin.toFixed(1)}%`}
          compact={compact}
        />
        <Result
          label="ROAS"
          tooltip="Revenue ÷ ad spend"
          value={roas !== null ? `${roas.toFixed(2)}x` : "N/A"}
          compact={compact}
        />

        {/* FEEDBACK — RIGHT */}
        <div className={`${!compact ? "mt-6 pt-4" : "mt-2 pt-1"} border-t border-gray-200 ${!compact ? "text-sm" : "text-xs"}`}>
          <p className="text-gray-600">Was this calculator helpful?</p>
          <div className={`${!compact ? "mt-2" : "mt-1"} flex gap-3 items-center`}>
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
  compact,
}: {
  label: string;
  tooltip?: string;
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
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
      <div className={`flex items-center gap-1 ${compact ? "text-xs" : "text-sm"} text-gray-700`}>
        <span>{label}</span>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={`mt-0.5 w-full rounded-md border border-gray-300 ${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-base"} placeholder:text-gray-300`}
      />
    </div>
  );
}

function Result({
  label,
  tooltip,
  value,
  highlight,
  compact,
}: {
  label: string;
  tooltip?: string;
  value: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  // Determine if this is an empty/zero state
  const isEmptyState = value === "£0.00" || value === "0.0%" || value === "N/A";
  const textColor = isEmptyState ? "text-gray-400" : (highlight ? "text-green-600" : "text-gray-900");

  return (
    <div className={`rounded-md border border-gray-200 ${compact ? "p-2" : "p-4"}`}>
      <div className={`flex items-center gap-1 ${compact ? "text-xs" : "text-sm"} text-gray-600`}>
        <span>{label}</span>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <div className={`mt-0.5 font-semibold ${textColor} ${compact ? "text-sm" : "text-lg"}`}>
        {value}
      </div>
    </div>
  );
}