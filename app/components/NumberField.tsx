"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

type NumberFieldProps = {
  label: ReactNode; // ← ВАЖЛИВО: дозволяє span + tooltip
  value: number;
  onChange: (value: number) => void;
  prefix?: string; // "£"
  placeholder?: string;
};

// залишаємо тільки цифри + прибираємо лідуючі нулі
function normalizeDigits(raw: string) {
  const digitsOnly = raw.replace(/[^\d]/g, "");
  const trimmed = digitsOnly.replace(/^0+(?=\d)/, "");
  return trimmed;
}

export default function NumberField({
  label,
  value,
  onChange,
  prefix,
  placeholder,
}: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const isEditingRef = useRef(false);

  // синхронізуємо value → text, якщо не редагуємо руками
  useEffect(() => {
    if (!isEditingRef.current) {
      setText(String(value));
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {prefix}
          </span>
        )}

        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 ${
            prefix ? "pl-8" : ""
          }`}
          value={text}
          onFocus={() => {
            isEditingRef.current = true;
          }}
          onBlur={() => {
            isEditingRef.current = false;

            // фінальна нормалізація
            const normalized = normalizeDigits(text);
            const nextNumber = normalized === "" ? 0 : Number(normalized);

            setText(String(nextNumber));
            onChange(nextNumber);
          }}
          onKeyDown={(e) => {
            // блокуємо сміття
            if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const normalized = normalizeDigits(e.target.value);

            setText(normalized === "" ? "" : normalized);

            // одразу оновлюємо число (щоб справа рахувалось)
            const nextNumber = normalized === "" ? 0 : Number(normalized);
            onChange(nextNumber);
          }}
        />
      </div>
    </div>
  );
}