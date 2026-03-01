import type { Metadata } from "next";
import CalculatorCard from "./components/CalculatorCard";

import { buildCalculatorMetadata } from "./lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "UK Profit Calculator – Real Business Profit After VAT & Costs",
  description:
    "Free UK Profit Calculator for eCommerce & small businesses. Calculate real profit after VAT, ads, fees and costs.",
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