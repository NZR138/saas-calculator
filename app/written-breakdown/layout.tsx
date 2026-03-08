import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free UK Business Tax Analysis — AI Written Breakdown",
  description:
    "Get a free AI-powered profit and tax analysis for your UK business. Based on HMRC data. Instant delivery.",
  alternates: {
    canonical: "/written-breakdown",
  },
};

export default function WrittenBreakdownLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
