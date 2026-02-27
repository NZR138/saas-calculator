import type { Metadata } from "next";
import CalculatorCard from "./components/CalculatorCard";

import { buildCalculatorMetadata, buildCalculatorSoftwareJsonLd } from "./lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "UK Profit Calculator — real profit after VAT, ads and costs",
  description:
    "UK Profit Calculator helps you calculate real monthly profit after VAT, advertising spend and fixed costs. No spreadsheets, no guesswork.",
  canonicalPath: "/",
  appName: "UK E-commerce Profit Calculator",
});

export default function HomePage() {
  const jsonLd = buildCalculatorSoftwareJsonLd({
    title: "UK Profit Calculator — real profit after VAT, ads and costs",
    description:
      "UK Profit Calculator helps you calculate real monthly profit after VAT, advertising spend and fixed costs. No spreadsheets, no guesswork.",
    canonicalPath: "/",
    appName: "UK E-commerce Profit Calculator",
  });

  return (
    <div className="max-w-6xl mx-auto px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CalculatorCard initialMode="ecommerce" />
    </div>
  );
}