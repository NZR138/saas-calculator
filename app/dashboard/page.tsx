"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

type SnapshotRow = {
  id: string;
  created_at: string;
  product_cost?: number | null;
  shipping_cost?: number | null;
  payment_processing_percent?: number | null;
  revenue: number | null;
  net_profit: number | null;
  margin: number | null;
};

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const toNumber = (value: number | null | undefined) => Number(value) || 0;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!isMounted) {
          return;
        }

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);

        const { data } = await supabase
          .from("snapshots")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(7);

        if (isMounted) {
          setSnapshots((data ?? []) as SnapshotRow[]);
        }
      } catch {
        if (isMounted) {
          setSnapshots([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const hasSnapshots = useMemo(() => snapshots.length > 0, [snapshots]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">Loading snapshots...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">Your saved snapshots</p>
        <p className="mt-1 text-xs text-gray-500">Dashboard shows your last 7 saved snapshots.</p>

        {!hasSnapshots ? (
          <div className="mt-6 rounded-md border border-dashed border-gray-300 bg-gray-50 p-6">
            <p className="text-sm text-gray-700">
              You don&apos;t have any saved snapshots yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Product Cost (£)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Shipping (£)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Payment (%)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Revenue (£)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Profit (£)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td className="px-4 py-3 text-gray-700">
                      {dateFormatter.format(new Date(snapshot.created_at))}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {currencyFormatter.format(toNumber(snapshot.product_cost))}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {currencyFormatter.format(toNumber(snapshot.shipping_cost))}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {toNumber(snapshot.payment_processing_percent).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {currencyFormatter.format(toNumber(snapshot.revenue))}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {currencyFormatter.format(toNumber(snapshot.net_profit))}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {toNumber(snapshot.margin).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}