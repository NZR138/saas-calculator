"use client";

import { useRouter } from "next/navigation";
import { useCalculator } from "../hooks/useCalculator";
import { ProductSection } from "./ProductSection";
import { CostsSection } from "./CostsSection";
import { MarketingSection } from "./MarketingSection";
import { ResultsSection } from "./ResultsSection";

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

  const router = useRouter();

  const isValid = values.productPrice > 0 && values.unitsSold > 0;

  const handleCalculate = () => {
    if (!isValid) {
      return;
    }

    router.push("/written-breakdown");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* ================= LEFT COLUMN ================= */}
      <div className="space-y-4 max-w-[680px]">
        <p className="text-sm text-gray-500">
          Calculate your real profit after VAT, ads, shipping and product costs.
        </p>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Input details
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition"
            >
              Reset
            </button>
          </div>

          <ProductSection values={values} setValue={setValue} />

          <CostsSection
            values={values}
            setValue={setValue}
          />

          <MarketingSection values={values} setValue={setValue} />
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          disabled={!isValid}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition ${
            isValid
              ? "bg-black hover:bg-gray-800 hover:shadow-md active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 cursor-pointer"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Calculate Profit
        </button>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Common hidden costs</p>
          <ul className="mt-2 list-disc pl-4 space-y-1 text-gray-700">
            <li>Marketplace and platform fees</li>
            <li>Packaging and insert materials</li>
            <li>Returns, refunds, and chargebacks</li>
            <li>Storage and fulfillment handling</li>
            <li>Customer support time</li>
          </ul>
        </div>
      </div>

      {/* ================= RIGHT COLUMN ================= */}
      <div className="self-start sticky top-4 max-w-[520px] w-full md:justify-self-end">
        <ResultsSection
          revenue={revenue}
          totalCosts={totalCosts}
          vatAmount={vatAmount}
          profit={profit}
          margin={margin}
          roas={roas}
        />

        <details className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <summary className="cursor-pointer font-medium text-gray-900">
            How this calculator works
          </summary>
          <ul className="mt-3 list-disc pl-4 space-y-1">
            <li>Revenue = Price × Units.</li>
            <li>Costs include product, shipping, ads, payment fee, and VAT.</li>
            <li>Results are estimates only.</li>
            <li>This is not financial advice.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}