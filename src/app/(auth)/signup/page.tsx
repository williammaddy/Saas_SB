"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowRight, Lock, Mail, User, Building } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("RETAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          businessName,
          businessType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4">
      <div className="mx-auto w-full max-w-md text-center">
        <Link href="/" className="inline-flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center font-bold text-white text-sm">
            laxz*
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900 tracking-tight">Create your workspace</h1>
        </Link>
        <p className="mt-1 text-sm text-slate-500">Set up billing, customers, and inventory in minutes</p>
      </div>

      <div className="mt-8 mx-auto w-full max-w-md">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <Input
                label="Your name"
                required
                placeholder="Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
              />

              <Input
                label="Business name"
                required
                placeholder="Kumar Enterprises"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                leftIcon={<Building className="w-4 h-4" />}
              />

              <Select
                label="Business type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                options={[
                  { value: "RETAIL", label: "Retail shop" },
                  { value: "SALON", label: "Salon / beauty" },
                  { value: "SERVICE", label: "Service business" },
                  { value: "WHOLESALE", label: "Wholesale" },
                  { value: "FREELANCER", label: "Freelancer" },
                  { value: "CONSULTANT", label: "Consultant" },
                  { value: "REPAIR", label: "Repair / workshop" },
                  { value: "OTHER", label: "Other" },
                ]}
              />

              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <Input
                label="Password"
                type="password"
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button type="submit" size="lg" className="w-full" loading={loading} icon={<ArrowRight className="w-4 h-4" />}>
                Get started
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500 border-t border-slate-100 pt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-700 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
