import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | UK Profit Calculator",
  description: "Your UK Profit Calculator account dashboard.",
  alternates: {
    canonical: "/dashboard",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
