import type { Metadata } from "next";
import CalculatorCard from "../components/CalculatorCard";
import { buildCalculatorMetadata, buildCalculatorSoftwareJsonLd } from "../lib/seo";

export const metadata: Metadata = buildCalculatorMetadata({
  title: "Self-Employed Take-Home Calculator UK 2026 – Estimate Tax & NIC",
  description:
    "Estimate your UK self-employed take-home income including Income Tax and National Insurance.",
  canonicalPath: "/self-employed",
  appName: "Self-Employed Take-Home Calculator UK",
});

export default function SelfEmployedPage() {
  const jsonLd = buildCalculatorSoftwareJsonLd({
    title: "Self-Employed Take-Home Calculator UK 2026 – Estimate Tax & NIC",
    description:
      "Estimate your UK self-employed take-home income including Income Tax and National Insurance.",
    canonicalPath: "/self-employed",
    appName: "Self-Employed Take-Home Calculator UK",
  });

  return (
    <div className="max-w-6xl mx-auto px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CalculatorCard initialMode="selfemployed" />
    </div>
  );
}
