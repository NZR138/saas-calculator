import type { Metadata } from "next";
import CalculatorCard from "../components/CalculatorCard";

export const metadata: Metadata = {
  title: "UK VAT Profit Calculator – Calculate Real Business Margin",
  description:
    "Calculate your real UK business profit after VAT, Stripe fees, ads and shipping.",
  alternates: {
    canonical: "/calculator",
  },
};

export default function CalculatorPage() {
  return (
    <main className="bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <CalculatorCard />
      </div>
    </main>
  );
}