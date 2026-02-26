"use client";

import { useState, useMemo, useEffect, useRef } from "react";

export type CalculatorValues = {
  productPrice: number;
  unitsSold: number;
  productCost: number;
  shippingCost: number;
  paymentProcessingPercent: number;
  adSpend: number;
  refundRate: number;
  targetMonthlyProfit: number;
  vatIncluded: boolean;
};

const DEFAULT_VALUES: CalculatorValues = {
  productPrice: 0,
  unitsSold: 0,
  productCost: 0,
  shippingCost: 0,
  paymentProcessingPercent: 0,
  adSpend: 0,
  refundRate: 0,
  targetMonthlyProfit: 0,
  vatIncluded: true,
};

const STORAGE_KEY = "uk-profit-calculator:values";
const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useCalculator() {
  const [values, setValues] = useState<CalculatorValues>(DEFAULT_VALUES);
  const [isLoaded, setIsLoaded] = useState(false);
  const skipSaveRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<CalculatorValues> & {
          users?: unknown;
          price?: unknown;
          fixedCosts?: unknown;
          shipping?: unknown;
          paymentPercent?: unknown;
        };

        setValues({
          productPrice: toSafeNumber(parsed.productPrice ?? parsed.price),
          unitsSold: toSafeNumber(parsed.unitsSold ?? parsed.users),
          productCost: toSafeNumber(parsed.productCost ?? parsed.fixedCosts),
          shippingCost: toSafeNumber(parsed.shippingCost ?? parsed.shipping),
          paymentProcessingPercent: toSafeNumber(
            parsed.paymentProcessingPercent ?? parsed.paymentPercent
          ),
          adSpend: toSafeNumber(parsed.adSpend),
          refundRate: toSafeNumber(parsed.refundRate),
          targetMonthlyProfit: toSafeNumber(parsed.targetMonthlyProfit),
          vatIncluded:
            typeof parsed.vatIncluded === "boolean"
              ? parsed.vatIncluded
              : DEFAULT_VALUES.vatIncluded,
        });
      }
    } catch {
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever values change
  useEffect(() => {
    if (isLoaded) {
      // If a reset just happened we skip one save to avoid re-creating the key
      if (skipSaveRef.current) {
        skipSaveRef.current = false;
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      } catch {
      }
    }
  }, [values, isLoaded]);

  const setValue = (
    key: keyof CalculatorValues,
    value: number | boolean
  ) => {
    if (key === "vatIncluded") {
      setValues((prev) => ({ ...prev, vatIncluded: Boolean(value) }));
      return;
    }

    setValues((prev) => ({
      ...prev,
      [key]: toSafeNumber(value),
    }));
  };

  const reset = () => {
    // Mark that we should skip the next autosave (which would re-write defaults)
    skipSaveRef.current = true;
    setValues(DEFAULT_VALUES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  };

  const calculated = useMemo(() => {
    const productPrice = toSafeNumber(values.productPrice);
    const unitsSold = toSafeNumber(values.unitsSold);
    const productCost = toSafeNumber(values.productCost);
    const shippingCost = toSafeNumber(values.shippingCost);
    const paymentProcessingPercent = toSafeNumber(values.paymentProcessingPercent);
    const adSpend = toSafeNumber(values.adSpend);
    const refundRate = Math.max(0, toSafeNumber(values.refundRate));
    const targetMonthlyProfit = Math.max(0, toSafeNumber(values.targetMonthlyProfit));

    const revenue = productPrice * unitsSold;

    const netRevenue = revenue * (1 - refundRate / 100);

    const productCostsTotal = productCost * unitsSold;
    const shippingCostsTotal = shippingCost * unitsSold;

    const contributionMarginPerUnit =
      productPrice -
      productCost -
      shippingCost -
      (productPrice * (paymentProcessingPercent / 100));

    const hasNegativeContributionMargin = contributionMarginPerUnit <= 0;

    const vatAmount = values.vatIncluded ? netRevenue * 0.2 : 0;

    const paymentFee = netRevenue * (paymentProcessingPercent / 100);

    const totalCosts =
      productCostsTotal +
      shippingCostsTotal +
      adSpend +
      paymentFee +
      vatAmount;

    const netProfit = netRevenue - totalCosts;

    const margin =
      netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    const roas =
      adSpend > 0 ? netRevenue / adSpend : 0;

    const breakEvenUnits =
      contributionMarginPerUnit > 0 ? adSpend / contributionMarginPerUnit : 0;

    const breakEvenRevenue = breakEvenUnits * productPrice;

    const contributionMarginRatio =
      productPrice > 0 ? contributionMarginPerUnit / productPrice : 0;

    const requiredRevenueForTargetProfit =
      targetMonthlyProfit > 0 && contributionMarginRatio > 0
        ? (adSpend + targetMonthlyProfit) / contributionMarginRatio
        : 0;

    const requiredUnitsForTargetProfit =
      requiredRevenueForTargetProfit > 0 && productPrice > 0
        ? requiredRevenueForTargetProfit / productPrice
        : 0;

    return {
      revenue,
      netRevenue,
      totalCosts,
      vatAmount,
      netProfit,
      margin,
      roas,
      contributionMarginPerUnit,
      breakEvenUnits,
      breakEvenRevenue,
      requiredRevenueForTargetProfit,
      requiredUnitsForTargetProfit,
      hasNegativeContributionMargin,
      targetMonthlyProfit,
    };
  }, [values]);

  return {
    values,
    setValue,
    reset,

    revenue: calculated.revenue,
    netRevenue: calculated.netRevenue,
    totalCosts: calculated.totalCosts,
    vatAmount: calculated.vatAmount,
    profit: calculated.netProfit,
    margin: calculated.margin,
    roas: calculated.roas,
    contributionMarginPerUnit: calculated.contributionMarginPerUnit,
    breakEvenUnits: calculated.breakEvenUnits,
    breakEvenRevenue: calculated.breakEvenRevenue,
    requiredRevenueForTargetProfit: calculated.requiredRevenueForTargetProfit,
    requiredUnitsForTargetProfit: calculated.requiredUnitsForTargetProfit,
    hasNegativeContributionMargin: calculated.hasNegativeContributionMargin,
    targetMonthlyProfit: calculated.targetMonthlyProfit,
  };
}