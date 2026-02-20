"use client";

import type { CalculatorValues } from "../hooks/useCalculator";
import { NumberField } from "./NumberField";

interface ProductSectionProps {
  values: CalculatorValues;
  setValue: (key: keyof CalculatorValues, value: number | boolean) => void;
}

export function ProductSection({ values, setValue }: ProductSectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        Revenue
      </p>
      <NumberField
        label="Product Price"
        tooltip="Average price per unit"
        value={values.productPrice}
        onChange={(v: number) => setValue("productPrice", v)}
        prefix="£"
      />
      <NumberField
        label="Units Sold"
        tooltip="Total monthly units sold"
        value={values.unitsSold}
        onChange={(v: number) => setValue("unitsSold", v)}
      />
    </div>
  );
}
