"use client";

import type { CalculatorValues } from "../hooks/useCalculator";
import { NumberField } from "./NumberField";
import ToggleVat from "./ToggleVat";

interface CostsSectionProps {
  values: CalculatorValues;
  setValue: (key: keyof CalculatorValues, value: number | boolean) => void;
}

export function CostsSection({
  values,
  setValue,
}: CostsSectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        Costs
      </p>
      <NumberField
        label="Product Cost"
        tooltip="Cost of goods sold per month"
        value={values.productCost}
        onChange={(v: number) => setValue("productCost", v)}
        prefix="£"
      />
      <NumberField
        label="Shipping Cost"
        tooltip="Monthly shipping and fulfillment cost"
        value={values.shippingCost}
        onChange={(v: number) => setValue("shippingCost", v)}
        prefix="£"
      />
      <NumberField
        label="Payment Processing %"
        tooltip="Payment processor fees (e.g., Stripe, PayPal)"
        value={values.paymentProcessingPercent}
        onChange={(v: number) => setValue("paymentProcessingPercent", v)}
      />
      <ToggleVat
        value={values.vatIncluded}
        onChange={(v) => setValue("vatIncluded", v)}
        tooltip="Toggle to include UK VAT (20%) in calculations"
      />
    </div>
  );
}
