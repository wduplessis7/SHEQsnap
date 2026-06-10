"use client";

import { Suspense } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const demoAccounts = [
    { label: "Admin", email: "admin@rockridge.co.za" },
    { label: "Safety Officer", email: "priya.naidoo@rockridge.co.za" },
    { label: "Manager", email: "thabo.nkosi@rockridge.co.za" },
    { label: "Reporter", email: "nomvula.sithole@rockridge.co.za" },
    { label: "Contractor", email: "johan.botes@steelworx.co.za" },
  ];

  async function signInAs(demoEmail: string) {
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email: demoEmail, password: process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "", redirect: false });
    if (result?.error) {
      setError("Demo login failed");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-1"
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {isDemoMode && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Demo accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => signInAs(a.email)}
                disabled={loading}
                className="text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-[#FFFC41] hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="block text-xs font-semibold text-gray-800">{a.label}</span>
                <span className="block text-[11px] text-gray-400 truncate">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image
              src="/sheqsnap-icon.png"
              alt="SHEQSnap"
              width={120}
              height={120}
              className="rounded-2xl shadow-lg"
              priority
            />
          </div>
          <Image
            src="/sheqsnap-logo-dark.png"
            alt="SHEQSnap"
            width={320}
            height={107}
            className="h-16 w-auto object-contain mx-auto"
            priority
          />
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl shadow-2xl p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#FFFC41]" /></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
