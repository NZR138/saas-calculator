import type { Metadata } from "next";
import CalculatorCard from "../components/CalculatorCard";
import { buildCalculatorMetadata, buildCalculatorSoftwareJsonLd } from "../lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "Break-Even & ROAS Calculator UK – Know Your Required ROAS",
  description:
    "Calculate break-even ROAS and required ad performance for your UK e-commerce business.",
  canonicalPath: "/break-even-roas",
  appName: "Break-Even & ROAS Calculator UK",
});

export default function BreakEvenRoasPage() {
  const jsonLd = buildCalculatorSoftwareJsonLd({
    title: "Break-Even & ROAS Calculator UK – Know Your Required ROAS",
    description:
      "Calculate break-even ROAS and required ad performance for your UK e-commerce business.",
    canonicalPath: "/break-even-roas",
    appName: "Break-Even & ROAS Calculator UK",
  });

  return (
    <div className="max-w-6xl mx-auto px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CalculatorCard initialMode="breakeven" />
    </div>
  );
}
