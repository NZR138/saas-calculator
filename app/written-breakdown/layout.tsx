import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Written Breakdown | UK Profit Calculator",
  description:
    "Request a written educational profit and tax breakdown based on your calculator figures.",
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
