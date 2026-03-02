import type { Metadata } from "next";
import CalculatorCard from "./components/CalculatorCard";

import { buildCalculatorMetadata } from "./lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "UK Profit Calculator for Ecommerce — real profit after VAT & ads",
  description:
    "Calculate real UK ecommerce profit after 20% VAT, ad spend and fixed costs. Built for Shopify, Amazon and UK small businesses. No spreadsheets, no guesswork.",
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