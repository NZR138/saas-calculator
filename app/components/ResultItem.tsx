"use client";

import Tooltip from "./Tooltip";

export function ResultItem({
  label,
  value,
  highlight,
  negative,
  tooltip,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
  tooltip?: string;
}) {
  const isEmptyState = value === "£0.00" || value === "0.0%" || value === "N/A";
  const baseValueClass = isEmptyState ? "text-gray-400" : "text-gray-900";
  const highlightClass = negative
    ? "bg-red-50 text-red-600"
    : "bg-green-50 text-green-700";
  const valueClass = highlight
    ? `${highlightClass} font-bold rounded-lg px-3 py-2 transition-colors`
    : baseValueClass;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 transition-colors hover:bg-gray-50">
      <span className="flex items-center gap-1 text-sm text-gray-600">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
