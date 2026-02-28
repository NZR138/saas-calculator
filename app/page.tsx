import type { Metadata } from "next";
import CalculatorCard from "./components/CalculatorCard";

import { buildCalculatorMetadata } from "./lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "UK Profit Calculator — real profit after VAT, ads and costs",
  description:
    "UK Profit Calculator helps you calculate real monthly profit after VAT, advertising spend and fixed costs. No spreadsheets, no guesswork.",
  canonicalPath: "/",
  appName: "UK E-commerce Profit Calculator",
});

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <CalculatorCard initialMode="ecommerce" />
    </div>
  );
}