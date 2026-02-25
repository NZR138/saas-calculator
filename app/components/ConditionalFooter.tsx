"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

const FOOTER_PATHS = new Set(["/", "/calculator", "/dashboard"]);

export default function ConditionalFooter() {
  const pathname = usePathname();

  if (!FOOTER_PATHS.has(pathname)) {
    return null;
  }

  return <Footer />;
}
