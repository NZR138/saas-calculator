"use client";

import Link from "next/link";
export default function Header() {
  const handleLogin = () => {
    // Store demo user in localStorage
    localStorage.setItem("auth_user", "demo_user");
    // reload so app can pick up auth state
    window.location.reload();
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-3xl font-bold text-gray-900 hover:text-gray-700">
            UK Profit Calculator
          </Link>
        </div>

        {/* Simple Log in button (always visible) */}
        <div>
          <button
            onClick={handleLogin}
            className="text-sm font-medium text-gray-900 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 transition cursor-pointer"
          >
            Log in
          </button>
        </div>
      </div>
    </header>
  );
}
