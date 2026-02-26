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
        label="Fixed Costs (£)"
        tooltip="Monthly fixed costs used for break-even and target-profit analysis"
        value={values.adSpend}
        onChange={(v: number) => setValue("adSpend", v)}
        prefix="£"
      />
      <NumberField
        label="Target Monthly Profit (£)"
        tooltip="Optional target profit to calculate required revenue and units"
        value={values.targetMonthlyProfit}
        onChange={(v: number) => setValue("targetMonthlyProfit", v)}
        prefix="£"
      />
    </div>
  );
}
