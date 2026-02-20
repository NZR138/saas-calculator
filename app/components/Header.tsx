"use client";

import { useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import LoginModal from "./LoginModal";
import Link from "next/link";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              UK Profit Calculator
            </h1>
            <nav className="flex items-center gap-2" aria-label="Calculator navigation">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-gray-50 cursor-pointer"
              >
                E-commerce
              </button>
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
