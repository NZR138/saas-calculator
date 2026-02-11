"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Snapshot = {
  revenue: number;
  profit: number;
  margin: number;
  roas: number | null;
};

type Props = {
  snapshot: Snapshot;
  onClose: () => void;
};

const formatMoney = (n: number) => `£${n.toFixed(2)}`;

export default function EmailSnapshotModal({ snapshot, onClose }: Props) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const savedRef = useRef<boolean>(false);

  useEffect(() => {
    // Check login status from localStorage (wrapped in useEffect for SSR)
    const authUser = localStorage.getItem("auth_user");
    setIsLoggedIn(Boolean(authUser));
  }, []);

  useEffect(() => {
    // Save snapshot for logged-in users once per modal session
    try {
      const user = localStorage.getItem("auth_user");
      if (user && !savedRef.current) {
        const key = `user_data_${user}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.push({ ...snapshot, date: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
        savedRef.current = true;
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [snapshot]);

  const handleGetBreakdown = () => {
    if (!isLoggedIn) {
      return;
    }

    window.plausible?.("written_breakdown_start");
    onClose();
    router.push("/written-breakdown");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold pr-6">
          Here's a clearer way to look at these numbers
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          We’ll break down what these figures mean in practice and highlight what’s worth paying attention to for a UK business.
        </p>

        <div className="mt-3 space-y-1 text-sm">
          <Row label="Revenue" value={formatMoney(snapshot.revenue)} />
          <Row label="Profit" value={formatMoney(snapshot.profit)} />
          <Row
            label="Margin"
            value={`${snapshot.margin.toFixed(1)}%`}
          />
          <Row
            label="ROAS"
            value={
              snapshot.roas !== null
                ? `${snapshot.roas.toFixed(2)}x`
                : "—"
            }
          />
        </div>

        {/* divider */}
        <div className="my-3 border-t border-gray-100" />

        {/* INSTANT INSIGHTS (derived from snapshot) */}
        <div className="mt-1 text-sm text-gray-700">
          <p className="font-semibold text-sm mb-2">Quick observations:</p>
          <div className="space-y-2">
            <div>
              <span className="mr-2">✓</span>
              <span>
                Your margin ({snapshot.margin.toFixed(1)}%) — most UK businesses
                operate around 60–75%
              </span>
            </div>

            <div>
              <span className="mr-2">✓</span>
              <span>
                ROAS of {snapshot.roas !== null ? `${snapshot.roas.toFixed(2)}x` : "—"} looks healthy
              </span>
            </div>

            <div className="mt-2">
              <span className="mr-2">⚠</span>
              <span className="font-medium">But mind the hidden costs:</span>
              <ul className="mt-1 ml-6 list-disc text-sm text-gray-600">
                <li>
                  Corporation Tax: ~{formatMoney(Math.max(0, snapshot.profit * 0.19))} / month
                </li>
                <li>
                  Employer's NI: ~{formatMoney(Math.max(0, snapshot.revenue * 0.138))} / month
                </li>
                <li>
                  Payment fees: ~{formatMoney(Math.max(0, snapshot.revenue * 0.02))} / month
                </li>
              </ul>
            </div>

            <div className="mt-2">
              <span>→ Real take-home is likely </span>
              <span className="font-semibold">
                {formatMoney(Math.max(0, snapshot.profit * 0.55))}–{formatMoney(Math.max(0, snapshot.profit * 0.75))} / month
              </span>
            </div>
          </div>
        </div>

        <div className="my-3 border-t border-gray-100" />

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900">
            What do you want next?
          </h3>
          <div className="mt-2 space-y-2">
            {/* Breakdown Option */}
            <p className="mt-2 text-sm text-gray-600">
              Get a written, educational breakdown of your profit & tax position.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleGetBreakdown}
            disabled={!isLoggedIn}
            className="w-full rounded-md bg-black px-4 py-2 text-white hover:bg-gray-900 transition cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Get written profit & tax breakdown
          </button>
          {!isLoggedIn && (
            <p className="mt-2 text-sm text-gray-600">
              Please log in to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}