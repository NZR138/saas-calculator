"use client";

import { useState, useMemo, useEffect, useRef } from "react";

export type CalculatorValues = {
  users: number;
  price: number;
  fixedCosts: number;
  adSpend: number;
  vatIncluded: boolean;
};

const DEFAULT_VALUES: CalculatorValues = {
  users: 0,
  price: 0,
  fixedCosts: 0,
  adSpend: 0,
  vatIncluded: true,
};

const STORAGE_KEY = "uk-profit-calculator:values";

export function useCalculator() {
  const [values, setValues] = useState<CalculatorValues>(DEFAULT_VALUES);
  const [isLoaded, setIsLoaded] = useState(false);
  const skipSaveRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setValues(parsed);
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
    setValues((prev) => ({ ...prev, [key]: value }));
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
    const revenue = values.users * values.price;

    const vatAmount = values.vatIncluded ? revenue * 0.2 : 0;

    const totalCosts =
      values.fixedCosts + values.adSpend + vatAmount;

    const profit = revenue - totalCosts;

    const margin =
      revenue > 0 ? (profit / revenue) * 100 : 0;

    const roas =
      values.adSpend > 0 ? revenue / values.adSpend : null;

    return {
      revenue,
      totalCosts,
      vatAmount,
      profit,
      margin,
      roas,
    };
  }, [values]);

  return {
    values,
    setValue,
    reset,

    revenue: calculated.revenue,
    totalCosts: calculated.totalCosts,
    vatAmount: calculated.vatAmount,
    profit: calculated.profit,
    margin: calculated.margin,
    roas: calculated.roas,
  };
}