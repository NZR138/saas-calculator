"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalculatorValues } from "./useCalculator";

export type CalculatorMode =
  | "ecommerce"
  | "vat"
  | "breakeven"
  | "selfemployed";

type VatInputs = {
  netAmount: number;
  vatRate: number;
  vatOperation: "add" | "remove";
};

type BreakEvenInputs = {
  productPrice: number;
  productCost: number;
  adSpend: number;
  paymentProcessingPercent: number;
  shippingCost: number;
};

type SelfEmployedInputs = {
  annualRevenue: number;
  annualExpenses: number;
  taxYear: number;
  includeNic: boolean;
};

type EcommerceResults = {
  revenue: number;
  totalCosts: number;
  vatAmount: number;
  profit: number;
  margin: number;
  roas: number;
};

type VatResults = {
  vatAmount: number;
  grossAmount: number;
  netAmount: number;
};

type BreakEvenResults = {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  requiredRoas: number;
  netMargin: number;
};

type SelfEmployedResults = {
  taxableProfit: number;
  estimatedIncomeTax: number;
  nationalInsurance: number;
  estimatedTakeHome: number;
};

type InputsByMode = {
  ecommerce: CalculatorValues;
  vat: VatInputs;
  breakeven: BreakEvenInputs;
  selfemployed: SelfEmployedInputs;
};

type ResultsByMode = {
  ecommerce: EcommerceResults;
  vat: VatResults;
  breakeven: BreakEvenResults;
  selfemployed: SelfEmployedResults;
};

type EcommerceBridge = {
  values: CalculatorValues;
  setValue: (key: keyof CalculatorValues, value: number | boolean) => void;
  reset: () => void;
  results: EcommerceResults;
};

const DEFAULT_VAT_INPUTS: VatInputs = {
  netAmount: 0,
  vatRate: 20,
  vatOperation: "add",
};

const DEFAULT_BREAKEVEN_INPUTS: BreakEvenInputs = {
  productPrice: 0,
  productCost: 0,
  adSpend: 0,
  paymentProcessingPercent: 0,
  shippingCost: 0,
};

const DEFAULT_SELFEMPLOYED_INPUTS: SelfEmployedInputs = {
  annualRevenue: 0,
  annualExpenses: 0,
  taxYear: new Date().getFullYear(),
  includeNic: true,
};

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useCalculatorModes(ecommerce: EcommerceBridge) {
  const [currentMode, setCurrentMode] = useState<CalculatorMode>("ecommerce");
  const [inputsByMode, setInputsByMode] = useState<InputsByMode>({
    ecommerce: ecommerce.values,
    vat: DEFAULT_VAT_INPUTS,
    breakeven: DEFAULT_BREAKEVEN_INPUTS,
    selfemployed: DEFAULT_SELFEMPLOYED_INPUTS,
  });

  useEffect(() => {
    setInputsByMode((prev) => ({
      ...prev,
      ecommerce: ecommerce.values,
    }));
  }, [ecommerce.values]);

  const resultsByMode = useMemo<ResultsByMode>(() => {
    const vatAmountInput = toSafeNumber(inputsByMode.vat.netAmount);
    const vatRate = Math.max(0, toSafeNumber(inputsByMode.vat.vatRate));
    const vatRateDecimal = vatRate / 100;

    const vatResults: VatResults =
      inputsByMode.vat.vatOperation === "add"
        ? {
            netAmount: vatAmountInput,
            vatAmount: vatAmountInput * vatRateDecimal,
            grossAmount: vatAmountInput * (1 + vatRateDecimal),
          }
        : (() => {
            const grossAmount = vatAmountInput;
            const divisor = 1 + vatRateDecimal;
            const netAmount = divisor > 0 ? grossAmount / divisor : grossAmount;
            return {
              netAmount,
              vatAmount: grossAmount - netAmount,
              grossAmount,
            };
          })();

    const price = toSafeNumber(inputsByMode.breakeven.productPrice);
    const cost = toSafeNumber(inputsByMode.breakeven.productCost);
    const adSpend = toSafeNumber(inputsByMode.breakeven.adSpend);
    const paymentPercent = toSafeNumber(inputsByMode.breakeven.paymentProcessingPercent);
    const shipping = toSafeNumber(inputsByMode.breakeven.shippingCost);

    const paymentFeePerUnit = price * (paymentPercent / 100);
    const contributionPerUnit = price - cost - shipping - paymentFeePerUnit;
    const breakEvenUnits = contributionPerUnit > 0 ? adSpend / contributionPerUnit : 0;
    const breakEvenRevenue = breakEvenUnits * price;
    const requiredRoas = adSpend > 0 ? breakEvenRevenue / adSpend : 0;
    const netMargin =
      price > 0
        ? ((price - cost - shipping - paymentFeePerUnit - adSpend) / price) * 100
        : 0;

    const breakEvenResults: BreakEvenResults = {
      breakEvenUnits,
      breakEvenRevenue,
      requiredRoas,
      netMargin,
    };

    const annualRevenue = toSafeNumber(inputsByMode.selfemployed.annualRevenue);
    const annualExpenses = toSafeNumber(inputsByMode.selfemployed.annualExpenses);
    const taxableProfit = Math.max(0, annualRevenue - annualExpenses);

    const personalAllowance = 12_570;
    const basicRateUpper = 50_270;
    const higherRateUpper = 125_140;

    let remainingTaxable = Math.max(0, taxableProfit - personalAllowance);

    const basicBand = Math.min(remainingTaxable, basicRateUpper - personalAllowance);
    remainingTaxable -= basicBand;

    const higherBand = Math.min(remainingTaxable, higherRateUpper - basicRateUpper);
    remainingTaxable -= higherBand;

    const additionalBand = Math.max(0, remainingTaxable);

    const estimatedIncomeTax = basicBand * 0.2 + higherBand * 0.4 + additionalBand * 0.45;

    let nationalInsurance = 0;
    if (inputsByMode.selfemployed.includeNic) {
      const niLower = 12_570;
      const niUpper = 50_270;
      const niTaxable = Math.max(0, taxableProfit - niLower);
      const mainBand = Math.min(niTaxable, niUpper - niLower);
      const additionalNiBand = Math.max(0, niTaxable - mainBand);
      nationalInsurance = mainBand * 0.08 + additionalNiBand * 0.02;
    }

    const estimatedTakeHome = Math.max(0, taxableProfit - estimatedIncomeTax - nationalInsurance);

    const selfEmployedResults: SelfEmployedResults = {
      taxableProfit,
      estimatedIncomeTax,
      nationalInsurance,
      estimatedTakeHome,
    };

    return {
      ecommerce: ecommerce.results,
      vat: vatResults,
      breakeven: breakEvenResults,
      selfemployed: selfEmployedResults,
    };
  }, [ecommerce.results, inputsByMode]);

  const updateVatInput = (key: keyof VatInputs, value: number | "add" | "remove") => {
    setInputsByMode((prev) => ({
      ...prev,
      vat: {
        ...prev.vat,
        [key]: key === "vatOperation" ? value : toSafeNumber(value),
      },
    }));
  };

  const updateBreakEvenInput = (key: keyof BreakEvenInputs, value: number) => {
    setInputsByMode((prev) => ({
      ...prev,
      breakeven: {
        ...prev.breakeven,
        [key]: toSafeNumber(value),
      },
    }));
  };

  const updateSelfEmployedInput = (
    key: keyof SelfEmployedInputs,
    value: number | boolean
  ) => {
    setInputsByMode((prev) => ({
      ...prev,
      selfemployed: {
        ...prev.selfemployed,
        [key]: key === "includeNic" ? Boolean(value) : toSafeNumber(value),
      },
    }));
  };

  const resetCurrentMode = () => {
    if (currentMode === "ecommerce") {
      ecommerce.reset();
      return;
    }

    setInputsByMode((prev) => {
      if (currentMode === "vat") {
        return { ...prev, vat: DEFAULT_VAT_INPUTS };
      }

      if (currentMode === "breakeven") {
        return { ...prev, breakeven: DEFAULT_BREAKEVEN_INPUTS };
      }

      return { ...prev, selfemployed: DEFAULT_SELFEMPLOYED_INPUTS };
    });
  };

  return {
    currentMode,
    setCurrentMode,
    inputsByMode,
    resultsByMode,
    updateVatInput,
    updateBreakEvenInput,
    updateSelfEmployedInput,
    resetCurrentMode,
  };
}
