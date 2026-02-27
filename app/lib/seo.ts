import type { Metadata } from "next";

type CalculatorSeoConfig = {
  title: string;
  description: string;
  canonicalPath: "/" | "/ecommerce" | "/vat" | "/break-even-roas" | "/self-employed";
  appName: string;
};

export function buildCalculatorMetadata(config: CalculatorSeoConfig): Metadata {
  return {
    title: config.title,
    description: config.description,
    alternates: {
      canonical: config.canonicalPath,
    },
  };
}

export function buildCalculatorSoftwareJsonLd(config: CalculatorSeoConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: config.appName,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
    },
  };
}
