"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">Loading dashboard...</p>
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
        <p className="mt-2 text-sm text-gray-600">
          Your account overview is available here.
        </p>
      </div>
    </main>
  );
}
