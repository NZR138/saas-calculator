import type { Metadata } from "next";
import CalculatorCard from "./components/CalculatorCard";

import { buildCalculatorMetadata } from "./lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "UK Profit Calculator — Real Profit After VAT, Ads & Costs",
  description:
    "Free UK e-commerce profit calculator. Estimate real profit after VAT, advertising costs, shipping, and fees. Built for UK businesses and self-employed sellers.",
  canonicalPath: "/",
  appName: "UK Profit Calculator",
});

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <CalculatorCard initialMode="ecommerce" />
    </div>
  );
}