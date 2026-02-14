"use client";

import { useEffect, useRef, useState } from "react";
import Tooltip from "./Tooltip";

export function NumberField({
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

  useEffect(() => {
    if (!isEditingRef.current) {
      setText(String(value));
    }
  }, [value]);

  const normalizeDigits = (raw: string): string => {
    const digitsOnly = raw.replace(/[^\d]/g, "");
    const trimmed = digitsOnly.replace(/^0+(?=\d)/, "");
    return trimmed;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeDigits(e.target.value);
    setText(normalized === "" ? "" : normalized);
    setHasEdited(true);

    const nextNumber = normalized === "" ? 0 : Number(normalized);
    onChange(nextNumber);
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    const normalized = normalizeDigits(text);
    const nextNumber = normalized === "" ? 0 : Number(normalized);
    setText(String(nextNumber));
    onChange(nextNumber);
  };

  const handleFocus = () => {
    isEditingRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };

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
