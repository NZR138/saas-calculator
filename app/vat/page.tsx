import type { Metadata } from "next";
import CalculatorCard from "../components/CalculatorCard";
import { buildCalculatorMetadata, buildCalculatorSoftwareJsonLd } from "../lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "UK VAT Calculator – Add or Remove 20% VAT Instantly",
  description:
    "Free UK VAT calculator. Add or remove 20% VAT from your price and calculate net amounts instantly.",
  canonicalPath: "/vat",
  appName: "UK VAT Calculator",
});

export default function VatPage() {
  const jsonLd = buildCalculatorSoftwareJsonLd({
    title: "UK VAT Calculator – Add or Remove 20% VAT Instantly",
    description:
      "Free UK VAT calculator. Add or remove 20% VAT from your price and calculate net amounts instantly.",
    canonicalPath: "/vat",
    appName: "UK VAT Calculator",
  });

  return (
    <div className="max-w-6xl mx-auto px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CalculatorCard initialMode="vat" />
    </div>
  );
}
