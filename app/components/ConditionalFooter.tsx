"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

const FOOTER_PATHS = new Set([
  "/",
  "/ecommerce",
  "/vat",
  "/break-even-roas",
  "/self-employed",
  "/calculator",
  "/dashboard",
  "/terms",
  "/privacy",
  "/disclaimer",
]);

export default function ConditionalFooter() {
  const pathname = usePathname();

  if (!FOOTER_PATHS.has(pathname)) {
    return null;
  }

  return <Footer />;
}
