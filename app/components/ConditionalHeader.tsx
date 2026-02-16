"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

const HEADER_PATHS = new Set([
  "/",
  "/calculator",
  "/dashboard",
  "/terms",
  "/privacy",
  "/disclaimer",
]);

export default function ConditionalHeader() {
  const pathname = usePathname();

  if (!HEADER_PATHS.has(pathname)) {
    return null;
  }

  return <Header />;
}
