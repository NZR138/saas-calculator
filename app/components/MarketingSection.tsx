"use client";

import type { CalculatorValues } from "../hooks/useCalculator";
import { NumberField } from "./NumberField";

interface MarketingSectionProps {
  values: CalculatorValues;
  setValue: (key: keyof CalculatorValues, value: number | boolean) => void;
}

export function MarketingSection({ values, setValue }: MarketingSectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        Marketing
      </p>
      <NumberField
        label="Ad Spend"
        tooltip="Monthly paid advertising budget"
        value={values.adSpend}
        onChange={(v: number) => setValue("adSpend", v)}
        prefix="£"
      />
    </div>
  );
}
