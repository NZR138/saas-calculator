"use client";

import { useState, useRef, useEffect } from "react";

type TooltipProps = {
  content: string;
};

export default function Tooltip({ content }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Detect touch device on mount
  useEffect(() => {
    const hasTouchScreen =
      () =>
        (navigator.maxTouchPoints !== undefined &&
          navigator.maxTouchPoints > 0) ||
        (navigator as any).msMaxTouchPoints > 0;

    setIsTouchDevice(hasTouchScreen());
  }, []);

  // Close tooltip when clicking outside (mobile)
  useEffect(() => {
    if (!isTouchDevice || !open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, isTouchDevice]);

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => !isTouchDevice && setOpen(true)}
      onMouseLeave={() => !isTouchDevice && setOpen(false)}
      onClick={() => isTouchDevice && setOpen(!open)}
    >
      <span className="text-gray-400 cursor-help">ⓘ</span>

      {open && (
        <span className="absolute z-50 bottom-full mb-2 w-64 rounded-lg bg-gray-900 text-white text-xs p-3 shadow-lg">
          {content}
        </span>
      )}
    </span>
  );
}