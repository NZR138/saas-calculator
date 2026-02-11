"use client";

type ToggleVatProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
};

export default function ToggleVat({
  value,
  onChange,
  label = "VAT (20%) included",
}: ToggleVatProps) {
  return (
    <div className="mt-2">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="flex items-center gap-3 cursor-pointer"
      >
        {/* track */}
        <span
          className={[
            "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors",
            value ? "bg-black border-black" : "bg-gray-200 border-gray-300",
          ].join(" ")}
        >
          {/* knob */}
          <span
            className={[
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              value ? "translate-x-5" : "translate-x-1",
            ].join(" ")}
          />
        </span>

        <span className="text-sm text-gray-700">{label}</span>
      </button>
    </div>
  );
}