"use client";

import { useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import LoginModal from "./LoginModal";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCalculatorModes, type CalculatorMode } from "../hooks/useCalculatorModes";

const MODE_LABELS: Array<{ mode: CalculatorMode; label: string }> = [
  { mode: "ecommerce", label: "E-commerce" },
  { mode: "vat", label: "UK VAT Calculator" },
  { mode: "breakeven", label: "Break-Even & ROAS Calculator" },
  { mode: "selfemployed", label: "Self-Employed Take-Home (UK)" },
];

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { mode, setMode } = useCalculatorModes();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = getSupabaseClient();

      const syncUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (isMounted) {
          setUser(data.user ?? null);
        }
      };

      syncUser();

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (isMounted) {
            setUser(session?.user ?? null);
          }
        }
      );

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    } catch {
      // Supabase not configured, skip auth sync
      return () => {
        isMounted = false;
      };
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showDropdown]);

  useEffect(() => {
    if (pathname === "/ecommerce") {
      setMode("ecommerce");
      return;
    }

    if (pathname === "/vat") {
      setMode("vat");
      return;
    }

    if (pathname === "/break-even-roas") {
      setMode("breakeven");
      return;
    }

    if (pathname === "/self-employed") {
      setMode("selfemployed");
      return;
    }
  }, [pathname, setMode]);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Error, but state will update
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">UK Profit Calculator</h1>
            <nav className="mt-2 flex flex-wrap items-center gap-2" aria-label="Calculator navigation">
              {MODE_LABELS.map((modeOption) => {
                const isActive = mode === modeOption.mode;
                return (
                  <button
                    key={modeOption.mode}
                    type="button"
                    onClick={() => setMode(modeOption.mode)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {modeOption.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <span>{user.email}</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <Link
                      href="/dashboard"
                      onClick={() => setShowDropdown(false)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowDropdown(false);
                      }}
                      disabled={isLoading}
                      className={`w-full text-left px-4 py-2 text-sm transition ${
                        isLoading
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "hover:bg-gray-50 text-gray-900 cursor-pointer"
                      }`}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="text-sm font-semibold px-3 py-1.5 rounded-md bg-black text-white hover:bg-gray-800 transition cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </header>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
