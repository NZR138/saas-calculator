"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">(
    "info"
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setMessage("");

    if (!email || !password) {
      setMessageType("info");
      setMessage("Enter email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessageType("error");
        setMessage(error.message);
        return;
      }

      setMessageType("success");
      setMessage("Logged in successfully");
      setEmail("");
      setPassword("");
      setIsSignup(false);
      setTimeout(() => onClose(), 500);
    } catch {
      setMessageType("error");
      setMessage("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setMessage("");

    if (!email || !password) {
      setMessageType("info");
      setMessage("Enter email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessageType("error");
        setMessage(error.message);
        return;
      }

      setMessageType("success");
      setMessage("Check your email to confirm your account.");
      setEmail("");
      setPassword("");
    } catch {
      setMessageType("error");
      setMessage("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup) {
      await handleSignup();
    } else {
      await handleLogin();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isSignup ? "Create account" : "Log in"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                disabled={isLoading}
              />
            </div>

            {message && (
              <p
                className={`text-sm ${
                  messageType === "error"
                    ? "text-red-600"
                    : messageType === "success"
                      ? "text-green-600"
                      : "text-gray-600"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-semibold py-2 px-3 rounded-md transition text-sm ${
                isLoading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-800 cursor-pointer"
              }`}
            >
              {isLoading ? "Loading..." : isSignup ? "Sign up" : "Log in"}
            </button>
          </form>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setMessage("");
                }}
                disabled={isLoading}
                className="font-semibold text-black hover:underline disabled:opacity-50"
              >
                {isSignup ? "Log in" : "Sign up"}
              </button>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="mt-4 w-full text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
