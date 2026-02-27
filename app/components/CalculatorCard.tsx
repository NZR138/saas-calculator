"use client";

import { useRouter } from "next/navigation";
import { useCalculator } from "../hooks/useCalculator";
import { useCalculatorModes, type CalculatorMode } from "../hooks/useCalculatorModes";
import { ProductSection } from "./ProductSection";
import { CostsSection } from "./CostsSection";
import { MarketingSection } from "./MarketingSection";
import { ResultsSection } from "./ResultsSection";
import { NumberField } from "./NumberField";
import { ResultItem } from "./ResultItem";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);
const formatNumber = (value: number) => value.toFixed(2);

export default function CalculatorCard({
  initialMode,
}: {
  initialMode?: CalculatorMode;
}) {
  const {
    values,
    revenue,
    netRevenue,
    totalCosts,
    vatAmount,
    profit,
    margin,
    roas,
    contributionMarginPerUnit,
    breakEvenUnits,
    breakEvenRevenue,
    requiredRevenueForTargetProfit,
    requiredUnitsForTargetProfit,
    hasNegativeContributionMargin,
    targetMonthlyProfit,
    setValue,
    reset,
  } = useCalculator();

  const {
    mode,
    inputsByMode,
    resultsByMode,
    updateVatInput,
    updateBreakEvenInput,
    updateSelfEmployedInput,
    resetCurrentMode,
  } = useCalculatorModes({
    values,
    setValue,
    reset,
    initialMode,
    results: {
      revenue,
      totalCosts,
      vatAmount,
      profit,
      margin,
      roas,
    },
  });

  const router = useRouter();

  const isValid = values.productPrice > 0 && values.unitsSold > 0;
  const isEcommerceMode = mode === "ecommerce";

  const handleCalculate = () => {
    if (!isValid) {
      return;
    }

    router.push("/written-breakdown");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6 items-start">
      {/* ================= LEFT COLUMN ================= */}
      <div className="space-y-4 max-w-[520px] w-full">
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
              onClick={() => resetCurrentMode()}
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition"
            >
              Reset
            </button>
          </div>

          {isEcommerceMode ? (
            <>
              <ProductSection values={values} setValue={setValue} />

              <CostsSection
                values={values}
                setValue={setValue}
              />

              <MarketingSection values={values} setValue={setValue} />
            </>
          ) : (
            <ModeInputs
              currentMode={mode}
              inputsByMode={inputsByMode}
              updateVatInput={updateVatInput}
              updateBreakEvenInput={updateBreakEvenInput}
              updateSelfEmployedInput={updateSelfEmployedInput}
            />
          )}
        </div>

        <button
          type="button"
          onClick={isEcommerceMode ? handleCalculate : undefined}
          disabled={isEcommerceMode ? !isValid : true}
          title={isEcommerceMode ? undefined : "Not available yet"}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition ${
            isEcommerceMode && isValid
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
      <div className="self-start sticky top-4 max-w-[520px] w-full">
        {isEcommerceMode ? (
          <ResultsSection
            revenue={revenue}
            netRevenue={netRevenue}
            totalCosts={totalCosts}
            vatAmount={vatAmount}
            profit={profit}
            margin={margin}
            roas={roas}
            contributionMarginPerUnit={contributionMarginPerUnit}
            breakEvenUnits={breakEvenUnits}
            breakEvenRevenue={breakEvenRevenue}
            requiredRevenueForTargetProfit={requiredRevenueForTargetProfit}
            requiredUnitsForTargetProfit={requiredUnitsForTargetProfit}
            hasNegativeContributionMargin={hasNegativeContributionMargin}
            targetMonthlyProfit={targetMonthlyProfit}
          />
        ) : (
          <ModeResults currentMode={mode} resultsByMode={resultsByMode} />
        )}

        <details className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <summary className="cursor-pointer font-medium text-gray-900">
            How this calculator works
          </summary>
          {isEcommerceMode ? (
            <>
              <p className="mt-3 font-medium text-gray-900">E-commerce calculation logic:</p>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                <li>Revenue = Product Price × Units Sold</li>
                <li>Net Revenue = Revenue × (1 - Refund Rate %)</li>
                <li>Payment Processing Fee = Net Revenue × Processing %</li>
                <li>Product Costs = Product Cost per Unit × Units</li>
                <li>Shipping Costs = Shipping per Unit × Units</li>
                <li>Total Costs = Product Costs + Shipping Costs + Processing Fee + Fixed Costs</li>
                <li>Net Profit = Net Revenue − Total Costs</li>
                <li>Margin % = Net Profit / Net Revenue</li>
                <li>
                  Contribution Margin per Unit = Selling Price − Product Cost − Shipping −
                  (Selling Price × Processing %)
                </li>
                <li>Break-even Units = Fixed Costs / Contribution Margin per Unit</li>
                <li>Break-even Revenue = Break-even Units × Selling Price</li>
                <li>If Target Monthly Profit is entered:</li>
                <li>Required Units = (Fixed Costs + Target Profit) / Contribution Margin per Unit</li>
                <li>Required Revenue = Required Units × Selling Price</li>
              </ul>
              <p className="mt-3 text-xs text-gray-600">Processing is calculated from Net Revenue.</p>
              <p className="text-xs text-gray-600">Refunds reduce revenue BEFORE fees.</p>
              <p className="text-xs text-gray-600">Advanced metrics and saved snapshots are available after login.</p>
              <p className="text-xs text-gray-600">
                VAT (if enabled) is excluded from profit path unless explicitly toggled.
              </p>
            </>
          ) : (
            <ul className="mt-3 list-disc pl-4 space-y-1">
              <li>Results are estimates only.</li>
              <li>This is not financial advice.</li>
            </ul>
          )}
        </details>
      </div>
    </div>
  );
}

function ModeInputs({
  currentMode,
  inputsByMode,
  updateVatInput,
  updateBreakEvenInput,
  updateSelfEmployedInput,
}: {
  currentMode: Exclude<CalculatorMode, "ecommerce">;
  inputsByMode: ReturnType<typeof useCalculatorModes>["inputsByMode"];
  updateVatInput: ReturnType<typeof useCalculatorModes>["updateVatInput"];
  updateBreakEvenInput: ReturnType<typeof useCalculatorModes>["updateBreakEvenInput"];
  updateSelfEmployedInput: ReturnType<typeof useCalculatorModes>["updateSelfEmployedInput"];
}) {
  if (currentMode === "vat") {
    const vatInputs = inputsByMode.vat;
    return (
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
          VAT Inputs
        </p>
        <NumberField
          label="Net amount"
          value={vatInputs.netAmount}
          onChange={(value) => updateVatInput("netAmount", value)}
          prefix="£"
        />
        <NumberField
          label="VAT rate"
          value={vatInputs.vatRate}
          onChange={(value) => updateVatInput("vatRate", value)}
        />
        <div className="space-y-2">
          <p className="text-sm text-gray-700">VAT operation</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateVatInput("vatOperation", "add")}
              className={`rounded-md border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                vatInputs.vatOperation === "add"
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Add VAT
            </button>
            <button
              type="button"
              onClick={() => updateVatInput("vatOperation", "remove")}
              className={`rounded-md border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                vatInputs.vatOperation === "remove"
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Remove VAT
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentMode === "breakeven") {
    const breakEvenInputs = inputsByMode.breakeven;
    return (
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
          Break-Even Inputs
        </p>
        <NumberField
          label="Product price"
          value={breakEvenInputs.productPrice}
          onChange={(value) => updateBreakEvenInput("productPrice", value)}
          prefix="£"
        />
        <NumberField
          label="Product cost"
          value={breakEvenInputs.productCost}
          onChange={(value) => updateBreakEvenInput("productCost", value)}
          prefix="£"
        />
        <NumberField
          label="Ad spend"
          value={breakEvenInputs.adSpend}
          onChange={(value) => updateBreakEvenInput("adSpend", value)}
          prefix="£"
        />
        <NumberField
          label="Payment processing %"
          value={breakEvenInputs.paymentProcessingPercent}
          onChange={(value) => updateBreakEvenInput("paymentProcessingPercent", value)}
        />
        <NumberField
          label="Shipping cost"
          value={breakEvenInputs.shippingCost}
          onChange={(value) => updateBreakEvenInput("shippingCost", value)}
          prefix="£"
        />
      </div>
    );
  }

  const selfEmployedInputs = inputsByMode.selfemployed;
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        Self-Employed Inputs
      </p>
      <NumberField
        label="Annual revenue"
        value={selfEmployedInputs.annualRevenue}
        onChange={(value) => updateSelfEmployedInput("annualRevenue", value)}
        prefix="£"
      />
      <NumberField
        label="Annual expenses"
        value={selfEmployedInputs.annualExpenses}
        onChange={(value) => updateSelfEmployedInput("annualExpenses", value)}
        prefix="£"
      />
      <NumberField
        label="Tax year"
        value={selfEmployedInputs.taxYear}
        onChange={(value) => updateSelfEmployedInput("taxYear", value)}
      />
      <button
        type="button"
        role="switch"
        aria-checked={selfEmployedInputs.includeNic}
        onClick={() => updateSelfEmployedInput("includeNic", !selfEmployedInputs.includeNic)}
        className="flex items-center gap-3 cursor-pointer"
      >
        <span
          className={[
            "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors",
            selfEmployedInputs.includeNic
              ? "bg-black border-black"
              : "bg-gray-200 border-gray-300",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              selfEmployedInputs.includeNic ? "translate-x-5" : "translate-x-1",
            ].join(" ")}
          />
        </span>
        <span className="text-sm text-gray-700">Include NIC</span>
      </button>
    </div>
  );
}

function ModeResults({
  currentMode,
  resultsByMode,
}: {
  currentMode: Exclude<CalculatorMode, "ecommerce">;
  resultsByMode: ReturnType<typeof useCalculatorModes>["resultsByMode"];
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Your Results
        </h2>
      </div>

      <div>
        {currentMode === "vat" && (
          <>
            <ResultItem label="VAT amount" value={formatCurrency(resultsByMode.vat.vatAmount)} />
            <ResultItem label="Gross amount" value={formatCurrency(resultsByMode.vat.grossAmount)} />
            <ResultItem label="Net amount" value={formatCurrency(resultsByMode.vat.netAmount)} />
          </>
        )}

        {currentMode === "breakeven" && (
          <>
            <ResultItem
              label="Break-even units"
              value={formatNumber(resultsByMode.breakeven.breakEvenUnits)}
            />
            <ResultItem
              label="Break-even revenue"
              value={formatCurrency(resultsByMode.breakeven.breakEvenRevenue)}
            />
            <ResultItem
              label="Required ROAS"
              value={`${formatNumber(resultsByMode.breakeven.requiredRoas)}x`}
            />
            <ResultItem
              label="Net margin"
              value={`${formatNumber(resultsByMode.breakeven.netMargin)}%`}
            />
          </>
        )}

        {currentMode === "selfemployed" && (
          <>
            <ResultItem
              label="Taxable profit"
              value={formatCurrency(resultsByMode.selfemployed.taxableProfit)}
            />
            <ResultItem
              label="Estimated income tax"
              value={formatCurrency(resultsByMode.selfemployed.estimatedIncomeTax)}
            />
            <ResultItem
              label="National Insurance"
              value={formatCurrency(resultsByMode.selfemployed.nationalInsurance)}
            />
            <ResultItem
              label="Estimated take-home"
              value={formatCurrency(resultsByMode.selfemployed.estimatedTakeHome)}
              highlight
            />
          </>
        )}
      </div>

    </div>
  );
}