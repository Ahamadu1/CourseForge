"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError(authError?.message ?? "Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: courses } = await supabase
      .from("courses")
      .select("id")
      .eq("creator_id", data.user.id)
      .limit(1);

    router.push(courses && courses.length > 0 ? "/dashboard" : "/onboarding");
  }

  return (
    <div
      className="bg-white rounded-2xl p-8 shadow-sm"
      style={{ border: "0.5px solid #E5E7EB" }}
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-6">Sign in to continue learning</p>

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
            autoComplete="current-password"
            placeholder="••••••••"
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#7F77DD] font-medium hover:text-[#3C3489] transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
