import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | UK Profit Calculator",
  description:
    "Important disclaimer for UK Profit Calculator: estimates only, not financial, tax, or legal advice.",
  alternates: {
    canonical: "/disclaimer",
  },
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 text-gray-800">
        <h1 className="text-3xl font-semibold text-gray-900">⚠ DISCLAIMER</h1>
        <p className="text-sm">(Short but Strong Version)</p>

        <p>The calculators and tools provided on this website generate estimates based on user inputs and standard UK assumptions.</p>
        <p>They are for informational purposes only.</p>
        <p>We are not regulated financial advisers, accountants, or tax professionals.</p>
        <p>Users remain solely responsible for all business, tax and financial decisions.</p>
        <p>Always seek advice from a qualified UK professional before acting on any calculation or response provided on this website.</p>
      </div>
    </main>
  );
}
