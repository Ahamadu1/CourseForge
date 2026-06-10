"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div
        className="bg-white rounded-2xl p-8 shadow-sm text-center"
        style={{ border: "0.5px solid #E5E7EB" }}
      >
        <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          We sent a confirmation link to{" "}
          <span className="font-medium text-gray-800">{email}</span>.
          Click it to activate your account.
        </p>
        <p className="text-xs text-gray-400 mt-5">
          Didn&apos;t get it?{" "}
          <button
            onClick={() => setSent(false)}
            className="text-[#7F77DD] hover:text-[#3C3489] transition-colors"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl p-8 shadow-sm"
      style={{ border: "0.5px solid #E5E7EB" }}
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">Build your personalized AI course</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/25 focus:border-[#7F77DD] transition-colors"
            style={{ border: "0.5px solid #E5E7EB" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/25 focus:border-[#7F77DD] transition-colors"
            style={{ border: "0.5px solid #E5E7EB" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Repeat password"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/25 focus:border-[#7F77DD] transition-colors"
            style={{ border: "0.5px solid #E5E7EB" }}
          />
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-lg bg-[#D85A30]/8 text-sm text-[#D85A30]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#7F77DD] hover:bg-[#3C3489] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#7F77DD] font-medium hover:text-[#3C3489] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
