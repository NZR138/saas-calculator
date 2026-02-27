import type { Metadata } from "next";
import CalculatorCard from "../components/CalculatorCard";
import { buildCalculatorMetadata, buildCalculatorSoftwareJsonLd } from "../lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "UK E-commerce Profit Calculator – Calculate Real Profit After VAT",
  description:
    "Free UK e-commerce profit calculator. Calculate your real net profit after VAT, ads, shipping and payment fees.",
  canonicalPath: "/ecommerce",
  appName: "UK E-commerce Profit Calculator",
});

export default function EcommercePage() {
  const jsonLd = buildCalculatorSoftwareJsonLd({
    title: "UK E-commerce Profit Calculator – Calculate Real Profit After VAT",
    description:
      "Free UK e-commerce profit calculator. Calculate your real net profit after VAT, ads, shipping and payment fees.",
    canonicalPath: "/ecommerce",
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
